# PCB 검사 모델 팀 전달본

## 팀 프로그램에서 호출

이 폴더를 통째로 복사한 뒤 PCB 모듈 폴더를 Python import 경로에 추가합니다. PyTorch와 torchvision은 대상 장치에 맞는 호환 조합을 설치하고, 나머지 라이브러리와 기존 검증 환경은 requirements.txt와 outputs/runtime_versions.json을 참고합니다.

```python
from integration import predict_pcb

result = predict_pcb("data/pcb4_yolo/images/test/good_008.jpg")
print(result["status"], result["detections"])
```

입력은 사진 경로, PIL RGB 이미지 또는 uint8 OpenCV BGR 배열입니다. 출력에는 OK/NG, 검출 점수, 결함 종류, 원본 픽셀 기준 박스 좌표가 들어 있습니다. 모델 설정은 outputs/integration/pcb_model_config.json에서 읽으며, 모델 경로는 전달본 폴더를 기준으로 해석합니다. 위 예시의 사진 경로는 이 폴더에서 실행하는 경우의 상대 경로입니다.

## 데이터와 결과

- data/final_solder에는 기존 납땜 데이터의 YOLO 이미지와 라벨이 있습니다. 학습 3,836장, 검증 687장, 테스트 686장입니다.
- data/pcb4_yolo에는 PCB4 변환 이미지와 라벨이 있습니다. 학습 120장, 검증 40장, 테스트 40장입니다.
- data/visa/VisA/pcb4에는 PCB4 변환에 사용한 원본 사진과 JSON 라벨이 있습니다.
- data/pcb4_yolo/mixed.yaml은 두 YOLO 데이터셋을 합친 학습 설정입니다. 원본과 YOLO 변환본은 동일 PCB4 사진의 서로 다른 표현입니다.
- models/best.pt는 추가 학습 시작점이고 models/pcb_yolo_final.pt는 통합 호출에 사용되는 최종 파일입니다.
- PCB4 테스트 40장 기준 정상·불량 정확도는 92.5%, 결함 박스 mAP50은 83.89%입니다. 상세 결과 및 예시 이미지는 outputs/integration에 있습니다.
- FINAL_REPORT.md, EXPERIMENT_PROTOCOL.md, runs/pcb4_transfer/args.yaml은 실험 당시 기록입니다.

전달본에서 PCB4 테스트 사진 3장으로 추론을 확인했습니다. component_damage_000.jpg는 NG, good_008.jpg는 OK, 오탐 사례 good_015.jpg는 NG였습니다.