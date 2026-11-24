"""Export portable Unity replay examples from the project's saved evaluations."""
import csv
import json
from pathlib import Path

from PIL import Image


PROJECT = Path(__file__).resolve().parents[1]
ROOT = PROJECT.parents[1]
ASSETS = PROJECT / "Assets/FoldedVision/Resources/FoldedVision"
PCB = ROOT / "notebooks/pcb/final"
PCB_INTEGRATION = PCB / "outputs/integration"
RING_TEST = ROOT / "outputs/quality_upgrade/vision_ring_transfer_predictions.csv"


def rows(path):
    with path.open(encoding="utf-8-sig", newline="") as handle:
        return list(csv.DictReader(handle))


def image_asset(src, stem):
    with Image.open(src) as original:
        width, height = original.size
        rendered = original.convert("RGB")
        rendered.thumbnail((1024, 1024), Image.Resampling.LANCZOS)
        (ASSETS / "Images").mkdir(parents=True, exist_ok=True)
        rendered.save(ASSETS / "Images" / f"{stem}.jpg", quality=91, optimize=True)
    return f"FoldedVision/Images/{stem}", width, height


def ring_examples():
    records = rows(RING_TEST)
    for stem in ("000065", "000083", "000073"):
        row = next(r for r in records if r["split"] == "test" and Path(r["path"]).stem == stem)
        tag = row["prediction"]
        source = ROOT / row["path"]
        if not source.is_file():
            image_path = None
        else:
            image_path, _, _ = image_asset(source, f"ring_{source.stem}")
        yield dict(image_id=row["image_id"], part_type="Ring", defect_type=tag,
                   defect_score=float(row[f"p_{tag}"]), has_score=True, status="REVIEW",
                   image_path=image_path, source_path=row["path"])


def pcb_examples():
    records = {row["image_id"]: row for row in rows(PCB_INTEGRATION / "pcb_predictions.csv")}
    detections = {row["image_id"]: row for row in json.loads(
        (PCB_INTEGRATION / "pcb_detections.json").read_text(encoding="utf-8-sig"))}
    pass_id = next(key for key, row in records.items() if row["decision"] == "OK" and row["y_true"] == "0")
    for key in ("component_damage_007.jpg", pass_id, "good_005.jpg"):
        row = records[key]
        source = PCB / "data/pcb4_yolo/images/test" / key
        image_path, width, height = image_asset(source, f"pcb_{source.stem}") if source.is_file() else (None, 0, 0)
        item = detections.get(key, {})
        threshold = float(row["threshold"])
        assert (float(row["defect_score"]) >= threshold) == (row["decision"] == "NG")
        selected = sorted(item.get("detections", ()), key=lambda entry: entry["confidence"], reverse=True)
        above = [entry for entry in selected if entry["confidence"] >= threshold]
        boxes = [
            dict(label=entry["label"], score=entry["confidence"], box=[
                min(1., max(0., value / (width if axis % 2 == 0 else height)))
                for axis, value in enumerate(entry["bbox_xyxy"])
            ])
            for entry in above
        ] if width and height else []
        sample = dict(image_id=key, part_type="PCB", model_version=row["model_version"],
                      defect_type=above[0]["label"] if above else None,
                      defect_score=float(row["defect_score"]), has_score=True, threshold=threshold,
                      has_threshold=True, status=row["decision"], image_path=image_path,
                      source_path=str(source.relative_to(ROOT).as_posix()), detections=boxes)
        if "inference_ms" in item:
            sample["inference_ms"] = item["inference_ms"]
            sample["has_time"] = True
        yield sample


if __name__ == "__main__":
    samples = [*ring_examples(), *pcb_examples()]
    assert len(samples) == 6 and all(s["part_type"] != "Lens" for s in samples)
    ASSETS.mkdir(parents=True, exist_ok=True)
    (ASSETS / "replay.json").write_text(json.dumps({"samples": samples}, indent=2, ensure_ascii=False), encoding="utf-8")
    for sample in samples:
        print(sample["part_type"], sample["image_id"], sample["status"], sample["image_path"])
