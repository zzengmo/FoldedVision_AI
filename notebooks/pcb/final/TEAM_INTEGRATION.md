# FoldedVision AI PCB — 팀 통합 계약

## 모델 실행

PCB는 Ultralytics/PyTorch의 .pt를 그대로 사용합니다. Lens/Ring의 .keras를 같은 형식으로 변환할 필요가 없습니다.

```python
from integration import predict_pcb, combine_team_results
pcb = predict_pcb('pcb_photo.jpg')
# lens/ring은 팀원이 각자의 모델로 생성한 실제 결과
# combined = combine_team_results([lens, ring, pcb])
```

predict_pcb는 최종 검증이 끝나 outputs/integration/pcb_model_config.json이 존재해야 동작합니다. 모델/설정 파일이 없으면 예외를 발생시키며 임의 OK를 만들지 않습니다. 입력은 이미지 경로, PIL RGB 이미지 또는 OpenCV BGR 배열입니다.

공통 필드: part_type, status, defect_score, threshold, model_version, mask_path, inference_ms, detections.
status는 OK/NG입니다. REVIEW는 입력 오류/촬영 조건 이탈을 통합 앱에서 확인하거나 팀 결과가 누락된 경우에 사용합니다. 자동 OOD 검출기는 현재 없습니다. 오류를 OK로 처리하면 안 됩니다.

mask_path는 null입니다. detections의 bbox_xyxy는 원본 이미지 픽셀 좌표이며 세그멘테이션 마스크가 아닙니다. confidence 및 defect_score는 보정된 불량 확률이 아닙니다. 서로 다른 모델 점수를 평균하지 마세요.

## 배포 묶음

- 실제 선정된 .pt 가중치: pcb_model_config.json의 model_path 확인
- outputs/integration/pcb_model_config.json
- inspect_pcb.py, integration.py, pcb4_transfer.py
- 검증 환경과 같은 PyTorch/torchvision/Ultralytics 및 이미지 처리 패키지

model_path는 전달본 폴더 기준 상대 경로입니다. 전처리는 letterbox 800, RGB CHW, 0~1 정규화입니다.

## 공통 평가 파일

pcb_predictions.csv는 정답이 있는 PCB4 최종 test만 포함합니다. y_true=1은 불량, y_pred=1은 NG입니다. 원래 영상별 최대 결함 confidence를 defect_score로 사용하며 validation에서 정한 임계값을 고정합니다.

pcb_metrics.json에는 이미지 단위 혼동행렬과 precision/recall/F1/AUC/AP/FPR, 별도의 객체 검출 지표가 들어갑니다. 이미지 AP와 객체 mAP는 다릅니다. FPR 등 비율 지표는 0~1, defect_inflow_reduction은 0~100의 퍼센트입니다.

pcb_model_config.json에는 모델 해시, 클래스, 전처리, 추론 설정과 한계가 들어갑니다. 기존 모델이 선정되면 그 경로를 기록하며 추가 학습 모델로 표시하지 않습니다.

## 사전 검사 효과

NG 부품을 후속 조립 전에 분리한다는 조건에서 TP/(TP+FN)*100을 불량 유입 감소율로 계산합니다. 이는 테스트셋 시뮬레이션이며 실제 자화전자 공정 불량률 개선 수치가 아닙니다. REVIEW는 보류·수동 재검 후 통과 여부를 별도로 정해야 합니다. PCB 평가의 자동 이진 판정에는 REVIEW 표본이 없습니다.

PCB4 test는 정상20/불량20입니다. 불량 한 장의 판정이 바뀌면 재현율이 5%p 변합니다. scratch는 test가 한 장뿐입니다. 서로 다른 부품의 독립 이미지 결과만으로 실제 완제품 단위 불량률을 계산할 수 없고, 제품 ID가 연결된 검사 이력 또는 명시적인 조합 시나리오가 필요합니다.

OpenCV 배열 입력은 uint8 HWC 3채널 BGR이어야 합니다. Lens/Ring용 정규화·리사이즈를 적용하기 전의 원본 이미지를 PCB 로더에 전달하세요. 다른 dtype/채널 수는 오류로 처리합니다.

객체 class_id와 이미지 y_true는 서로 다른 라벨입니다. YOLO class_id=0은 insufficient_solder 결함이며, CSV의 y_true=0은 정상입니다. pcb_model_config.json의 label_mapping은 객체 클래스, image_label_mapping은 이미지 판정을 뜻합니다.

팀 전체 CSV를 합칠 때는 (part_type, image_id)를 고유 키로 사용하세요. 이미지 NG 판정의 성공이 결함 종류와 위치 검출의 성공을 뜻하지는 않습니다. PCB의 객체 mAP와 이미지 F1을 구분해 표시하세요.

Lens/Ring의 실제 .keras 가중치는 이번 작업에 포함되지 않았으며, 세 부품의 실모델을 한 프로세스에서 동시에 실행한 검증은 하지 않았습니다. 각 로더의 패키지 호환성과 GPU 메모리 사용을 통합 환경에서 확인해야 합니다. 검증한 PCB 실행 환경은 outputs/runtime_versions.json에 기록했습니다.
