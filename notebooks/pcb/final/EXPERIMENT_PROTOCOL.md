# FoldedVision AI — 고정 실험 프로토콜

기록일: 2026-11-19. 최종 test 추론 전에 작성한 규칙입니다.

## 데이터와 목표

- 원본: train 3836 / val 687 / test 686.
- PCB4: train 120 / val 40 / test 40. 각 split의 정상/불량은 각각 60/60, 20/20, 20/20.
- 혼합: train 3956 / val 727. 데이터 반복 복제로 고유 이미지 개수를 늘리지 않음.
- 객체 검출: 원본 9개 + PCB4 5개 출처별 클래스. 라벨 정책의 동등성이 입증되지 않아 이름만으로 합치지 않음.
- 이미지 판정: 모든 네이티브 결함 후보의 최대 confidence, 후보가 없으면 0.
- confidence는 실제 불량 확률이 아님.

## 학습

YOLO26m 기존 best.pt에서 전이. epochs 최대30, batch4, imgsz800, AdamW lr0=.001, patience10, seed42, workers0, AMP. 전체 설정은 runs/pcb4_transfer/args.yaml에 저장합니다.

사용자는 최대30에포크 계속 진행을 선택했습니다. 조기 종료 조건이 충족되면 30 이전에 종료할 수 있습니다.

실제 Smoke Test 로그에서 기존 클래스 이름에 따라 분류 헤드 9/14행을 remap하고 pretrained 가중치 768/768 항목을 전이했다고 확인했습니다. 신규5개 클래스 행은 새로 학습합니다. 단순히 검출 헤드 전체가 초기화됐다고 가정하지 않습니다.

GPU: RTX5060 Laptop 8GB. PyTorch2.14.1+cu130. 루트 .venv의 끊어진 Python base 경로를 백업 후 복구했습니다. NumPy2.2.6과 Ultralytics8.4.215로 모델 로딩 호환성을 맞췄습니다. 현재 torchvision의 CUDA NMS 미지원은 같은 torchvision NMS의 CPU 연산으로 fallback하며 모델 순전파·역전파는 GPU에서 실행됩니다. 이 경로는 학습·평가·추론에 공통 적용합니다.

OpenCV grayscale/CLAHE는 비교 그림만 생성합니다. 검증된 모델 입력 전처리에 임의로 추가하지 않습니다. 학습 중 실제 기본 증강 설정은 args.yaml을 따릅니다. 색상 증강과 산화 결함 의미 간 영향은 별도 ablation을 아직 수행하지 않았습니다.

## 후보 선정

1. 학습 중 mixed validation mAP50-95로 저장된 best 체크포인트를 후보로 사용.
2. 기존 도메인 val mAP50-95가 Baseline 대비 절대값 .05 이상 하락하지 않아야 함.
3. PCB4 val 이미지 F1이 Baseline보다 높아야 함.
4. 두 조건을 만족하면 별도 models/pcb_yolo_final.pt로 저장. 아니면 기존 models/best.pt 유지.

원본 validation/test에 oxidation 정답이 없어 그 클래스의 보존 여부는 확인할 수 없습니다. 0.05 허용치는 이번 PoC의 사전 지정 기준이며 산업용 허용 성능을 의미하지 않습니다.

## 이미지 판정 임계값

- imgsz800, candidate conf .001, iou .45, max_det300, class-aware.
- YOLO26 end-to-end head에서는 아키텍처 고유 후처리에 따라 통상적인 IoU NMS가 생략될 수 있음.
- validation F1 최대값. 동점은 FP가 적은 값, 그래도 같으면 더 높은 임계값.
- Baseline과 후보 각각 같은 PCB4 val40장에서 임계값을 정함.
- 동일 PCB4 test40장으로 각자의 고정 임계값을 평가. 신규 클래스 mAP를 기존9클래스 모델과 직접 개선율로 비교하지 않음.
- OK: max confidence < threshold. NG: max confidence >= threshold.
- 자동 OOD/불확실성 모델은 없으며 오류·조건 이탈을 통합 앱에서 REVIEW/수동 재검으로 처리.

## 최종 평가와 해석

이미지 단위 confusion counts, Accuracy/Precision/Recall/F1/AUC/AP/FPR와 객체 mAP를 구분합니다. 최종 모델/임계값을 확정한 뒤 test를 평가합니다.
NG를 투입 전 제거한다는 조건에서 TP/(TP+FN)*100을 모사된 불량 유입 감소율로 계산합니다. 표본 20불량의 Wilson95% 구간을 함께 기록하며 실제 생산 불량률 변화로 해석하지 않습니다.

정확한 픽셀 중복과 라벨 형식을 검사했지만 동일 실물의 유사 촬영 누출은 배제하지 못합니다. scratch는 train3/val1/test1이므로 일반화 성능 근거가 약합니다.

객체 검출 AP 평가는 framework validation 기본값과 같은 conf=0.001, IoU NMS=0.7, max_det=300을 사용합니다. 이미지 판정/팀 API의 IoU NMS=0.45와 구분합니다. Baseline과 후보는 각 평가 종류 안에서 동일 설정을 사용합니다. 현재 기존 체크포인트의 DetectionModel 및 Detect head에서 end2end=False임을 확인했습니다.
