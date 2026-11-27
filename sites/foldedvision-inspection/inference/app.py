"""Exact inference-only adapter for the preserved Ring global+tiles model."""
import hashlib
import importlib.util
import io
import os
from pathlib import Path
import threading
import time

from fastapi import FastAPI, File, Form, HTTPException, UploadFile, Request
from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parents[3]
ENCODER = ROOT / 'models/quality_upgrade/vision_ring_encoder.keras'
HEAD = ROOT / 'models/quality_upgrade/vision_ring_global_tiles_48_head.keras'
CLASSES = ['t_contamination', 't_scratch', 'unfinished_surface']
LABELS = ['오염', '스크래치', '표면 미가공']
LOCK = threading.Lock()
MODELS = None
app = FastAPI(title='FoldedVision local inference', docs_url=None, redoc_url=None)
Image.MAX_IMAGE_PIXELS = 25_000_000


@app.middleware('http')
async def local_auth(request: Request, call_next):
    token = os.environ.get('INFERENCE_TOKEN')
    if token and request.headers.get('authorization') != 'Bearer ' + token:
        from fastapi.responses import JSONResponse
        return JSONResponse({'detail': 'Unauthorized'}, status_code=401)
    return await call_next(request)


@app.get('/health')
def health():
    ready = ENCODER.is_file() and HEAD.is_file() and importlib.util.find_spec('tensorflow') is not None
    return {'models': {
        'ring': {'ready': ready, 'message': '전체+부분 특징 모델 연결' if ready else '가중치 또는 TensorFlow 필요', 'version': 'vision_ring_global_tiles_48', 'policy': 'REVIEW'},
        'pcb': {'ready': False, 'message': 'PyTorch 전용 실행 환경 준비 필요', 'policy': '담당자 판정'},
        'lens': {'ready': False, 'message': '최신 YOLO 가중치 전달 대기', 'policy': '담당자 판정'},
    }}


def predict_ring(rgb):
    global MODELS
    import cv2
    import numpy as np
    from tensorflow import keras
    with LOCK:
        if MODELS is None:
            MODELS = (keras.models.load_model(ENCODER, compile=False), keras.models.load_model(HEAD, compile=False))
        encoder, head = MODELS
        h, w = rgb.shape[:2]
        crops = [rgb, rgb[:int(.66*h), :int(.66*w)], rgb[:int(.66*h), int(.34*w):], rgb[int(.34*h):, :int(.66*w)], rgb[int(.34*h):, int(.34*w):]]
        batch = np.stack([cv2.resize(c, (160, 160), interpolation=cv2.INTER_AREA if min(c.shape[:2]) >= 160 else cv2.INTER_LINEAR) for c in crops])
        # uint8 0..255; the preserved encoder owns its [-1,1] rescaling.
        f = encoder(batch, training=False).numpy()
        combined = np.concatenate([f[:1], f[1:].mean(axis=0, keepdims=True), f[1:].max(axis=0, keepdims=True)], axis=1)
        scores = head(combined, training=False).numpy()[0]
        winner = int(np.argmax(scores))
        return {'part_type': 'ring', 'status': 'REVIEW', 'defect_type': LABELS[winner], 'class_id': CLASSES[winner],
                'type_confidence': float(scores[winner]), 'scores': {label: float(v) for label, v in zip(LABELS, scores)},
                'model_version': 'vision_ring_global_tiles_48', 'score_is_probability_of_defect': False,
                'binary_supported': False, 'detections': [], 'review_reason': '결함 유형 분류 결과입니다. 정상·불량은 담당자가 확인해 주세요.'}


@app.post('/predict')
async def predict(part_type: str = Form(...), image: UploadFile = File(...)):
    if part_type != 'ring':
        raise HTTPException(503, '이 부품의 운영 모델은 연결 준비 중입니다.')
    raw = await image.read(8 * 1024 * 1024 + 1)
    if len(raw) > 8 * 1024 * 1024:
        raise HTTPException(413, '사진 크기는 8MB 이하여야 합니다.')
    try:
        source = Image.open(io.BytesIO(raw))
        if source.width * source.height > 25_000_000 or min(source.size) < 16:
            raise ValueError('invalid dimensions')
        import numpy as np
        rgb = np.asarray(ImageOps.exif_transpose(source).convert('RGB'))
    except Exception:
        raise HTTPException(422, '사진을 읽을 수 없습니다. 해상도와 파일 형식을 확인해 주세요.')
    started = time.perf_counter()
    try:
        # Execute the CPU model off the async request loop.
        from starlette.concurrency import run_in_threadpool
        result = await run_in_threadpool(predict_ring, rgb)
    except Exception as exc:
        print('Ring inference failed:', type(exc).__name__, flush=True)
        raise HTTPException(503, '모델을 실행하지 못했습니다. 서버 실행 환경을 확인해 주세요.')
    result['inference_ms'] = round((time.perf_counter() - started) * 1000, 1)
    result['image_sha256'] = hashlib.sha256(raw).hexdigest()
    return result
