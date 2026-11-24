"""PCB detector with a shared lens/ring/pcb inspection response contract."""
import argparse
import json
import hashlib
import time
from pathlib import Path
from datetime import datetime, timezone

from PIL import Image, ImageDraw, ImageFont
import numpy as np
import torch
from torchvision.ops import batched_nms
from ultralytics import YOLO
from pcb4_transfer import configure_runtime

configure_runtime()

ROOT = Path(__file__).resolve().parent


class PCBInspector:
    def __init__(self, weights=None, confidence=0.30, tiled=False):
        self.weights = Path(weights or ROOT / "models/best.pt")
        self.confidence = confidence
        self.tiled = tiled
        self.model = YOLO(str(self.weights))
        self.model_version = self.weights.stem + '-' + hashlib.sha256(self.weights.read_bytes()).hexdigest()[:12]

    def inspect(self, image_path, product_id=None, output_dir=None):
        started = time.perf_counter()
        image_path = Path(image_path)
        with Image.open(image_path) as image:
            width, height = image.size
        with Image.open(image_path) as source:
            original = source.convert("RGB")
        regions = [(0, 0, width, height)]
        tile_size = 800
        if self.tiled and max(width, height) > tile_size:
            def starts(length):
                points = list(range(0, max(1, length - tile_size + 1), 600))
                return sorted(set(points + [max(0, length - tile_size)]))
            regions.extend((x, y, min(x + tile_size, width), min(y + tile_size, height))
                           for y in starts(height) for x in starts(width))
        candidates = []
        names = self.model.names
        for x1, y1, x2, y2 in regions:
            result = self.model.predict(source=original.crop((x1, y1, x2, y2)),
                                        conf=self.confidence, imgsz=800, verbose=False)[0]
            for box in result.boxes:
                coords = box.xyxy[0].cpu().numpy() + np.array([x1, y1, x1, y1])
                candidates.append((coords, float(box.conf.item()), int(box.cls.item())))
        kept = []
        if candidates:
            indices = batched_nms(
                torch.tensor(np.stack([item[0] for item in candidates]), dtype=torch.float32),
                torch.tensor([item[1] for item in candidates], dtype=torch.float32),
                torch.tensor([item[2] for item in candidates]), 0.45)
            kept = [candidates[int(index)] for index in indices]
        defects = []
        for coordinates, score, class_id in kept:
            coordinates = coordinates.tolist()
            defects.append({
                "label": names[class_id],
                "confidence": round(score, 6),
                "bbox_xyxy": coordinates,
                "bbox_normalized": [
                    coordinates[0] / width, coordinates[1] / height,
                    coordinates[2] / width, coordinates[3] / height,
                ],
            })
        response = {
            "schema_version": "1.0",
            "component": "pcb",
            "product_id": product_id,
            "image_id": image_path.name,
            "image_size": {"width": width, "height": height},
            "status": "review" if defects else "no_defect_detected",
            "defects": defects,
            "model": self.weights.name,
            "confidence_threshold": self.confidence,
            "inference_mode": "full_and_tiles" if self.tiled else "full",
            "inspected_at": datetime.now(timezone.utc).isoformat(),
        }
        if output_dir:
            directory = Path(output_dir)
            directory.mkdir(parents=True, exist_ok=True)
            drawing = ImageDraw.Draw(original)
            for defect in defects:
                drawing.rectangle(defect["bbox_xyxy"], outline="red", width=3)
                drawing.text(tuple(defect["bbox_xyxy"][:2]),
                             f'{defect["label"]} {defect["confidence"]:.2f}',
                             fill="red")
            original.save(directory / (image_path.stem + "_annotated.jpg"))
        return response


_team_inspector = None


def predict_pcb(image, model_path=None, threshold=None, output_dir=None):
    """Team API. Paths or PIL RGB images are accepted; no synthetic predictions."""
    global _team_inspector
    config_path = ROOT/'outputs/integration/pcb_model_config.json'
    if not config_path.exists():
        raise FileNotFoundError('Validated model config is missing; run selection/export first')
    config = json.loads(config_path.read_text(encoding='utf-8'))
    weights = Path(model_path) if model_path is not None else ROOT / config['model_path']
    if not weights.exists(): raise FileNotFoundError(weights)
    threshold = float(config['threshold'] if threshold is None else threshold)
    if not .001 <= threshold <= 1.000001: raise ValueError('Invalid threshold')
    if _team_inspector is None or _team_inspector.weights != weights:
        _team_inspector = PCBInspector(weights=weights)
    inspector = _team_inspector
    if model_path is None and inspector.model_version != config['model_version']:
        raise ValueError('Model hash differs from validated config')
    started = time.perf_counter()
    if isinstance(image,np.ndarray) and (image.dtype!=np.uint8 or image.ndim!=3 or image.shape[2]!=3):
        raise ValueError('OpenCV input must be uint8 HWC BGR with 3 channels; pass raw image before Lens/Ring preprocessing')
    source = image.convert('RGB') if isinstance(image, Image.Image) else image if isinstance(image, np.ndarray) else str(image)
    result = inspector.model.predict(source=source,conf=.001,imgsz=800,iou=.45,max_det=300,verbose=False)[0]
    score = max((float(b.conf.item()) for b in result.boxes),default=0.0)
    detections=[]
    for box in result.boxes:
        confidence=float(box.conf.item())
        if confidence>=threshold:
            cls=int(box.cls.item())
            detections.append({'class_id':cls,'label':inspector.model.names[cls], 'confidence':confidence,'bbox_xyxy':box.xyxy[0].cpu().tolist()})
    if output_dir:
        directory=Path(output_dir);directory.mkdir(parents=True,exist_ok=True)
        # Draw only detections used for the image decision.
        original=Image.fromarray(result.orig_img[:,:,::-1]);draw=ImageDraw.Draw(original)
        font_size=max(16,round(max(original.size)/60))
        font=ImageFont.load_default(size=font_size)
        for d in detections:
            draw.rectangle(d['bbox_xyxy'],outline='red',width=3)
            x,y=d['bbox_xyxy'][:2]
            position=(x,max(0,y-font_size-6))
            text=f"{d['label']} {d['confidence']:.3f}"
            draw.rectangle(draw.textbbox(position,text,font=font),fill='red')
            draw.text(position,text,font=font,fill='white')
        original.save(directory/'pcb_annotated.jpg')
    status='NG' if score>=threshold else 'OK'
    return {'part_type':'PCB','status':status,'defect_score':score,'threshold':threshold,
            'model_version':inspector.model_version,'mask_path':None,
            'inference_ms':(time.perf_counter()-started)*1000,'detections':detections,
            'score_is_probability':False,'inspected_at':datetime.now(timezone.utc).isoformat(),
            'image_id':Path(image).name if isinstance(image,(str,Path)) else None}


def inspect_batch(paths, weights=None, output_dir=None, product_id=None):
    inspector = PCBInspector(weights)
    results = [inspector.inspect(path, product_id, output_dir) for path in paths]
    flagged = sum(result["status"] == "review" for result in results)
    return {
        "results": results,
        "summary": {
            "inspected_images": len(results),
            "flagged_images": flagged,
            "flagged_image_rate": flagged / len(results) if results else None,
        },
    }


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("images", nargs="+")
    parser.add_argument("--weights", default=str(ROOT / "models/best.pt"))
    parser.add_argument("--output", default=str(ROOT / "outputs"))
    parser.add_argument("--product-id")
    args = parser.parse_args()
    payload = inspect_batch(args.images, args.weights, args.output, args.product_id)
    Path(args.output).mkdir(parents=True, exist_ok=True)
    Path(args.output, "inspection.json").write_text(
        json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    print(json.dumps(payload["summary"], indent=2))
