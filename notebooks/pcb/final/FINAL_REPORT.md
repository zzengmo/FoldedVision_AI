# FoldedVision AI PCB — 실제 실행 결과 보고서

## 실제 학습 및 데이터

정식 학습: 30에포크, 고유 학습 사진 3,956장(원본3,836 + PCB4 120). 정상404 / 불량3,552. epoch 반복은 고유 이미지 증가로 집계하지 않았다.
Smoke Test는 원본6 + PCB4 유형별6 = 12장, 1에포크로 파이프라인만 검증했다.
PCB4 전체는 정상100/불량100, train120/val40/test40이다. test는 정상20/불량20이다. 결함 박스는 전체142개다.

추가 학습 후보 클래스: 기존 insufficient_solder, excess_solder, solder_bridge, solder_void, missing_component, shifted_component, burn, physical_damage, oxidation 및 신규 pcb4_component_damage, pcb4_foreign_material, pcb4_miss, pcb4_oxidation, pcb4_scratch.
동등한 어노테이션 정책이 확인되지 않아 의미가 비슷한 이름을 자동 통합하지 않았다. 클래스 통합 ablation은 수행하지 않았다.

## 객체 검출 성능

| validation 평가 | Precision | Recall | mAP50 | mAP50-95 |
|---|---:|---:|---:|---:|
| 기존 모델 / 원본 PCB | 91.05% | 91.46% | 91.07% | 63.49% |
| 추가 학습 후보 / 원본 PCB | 93.75% | 87.30% | 93.52% | 64.96% |
| 추가 학습 후보 / PCB4 | 71.99% | 59.53% | 72.01% | 43.62% |

| 원본 PCB test 평가 | Precision | Recall | mAP50 | mAP50-95 |
|---|---:|---:|---:|---:|
| Baseline | 82.39% | 88.47% | 88.31% | 63.87% |
| 선정 모델 | 97.03% | 76.22% | 86.96% | 61.75% |

선정 모델 PCB4 test mAP50: 83.89%, mAP50-95: 58.90%.
해당 PCB4 테스트 평가의 이미지당 순수 신경망 추론 시간은 19.30ms다(입출력/모델 초기 로딩 제외). 실서비스 요청 시간은 deployment_http_verification.json의 실제 기록을 따르며 cold start와 구분한다.
기존9클래스 모델은 신규5클래스를 출력하지 못하므로 PCB4 클래스 AP의 직접 전후 개선율은 주장하지 않는다.
원본 validation/test에는 oxidation 정답이 없어 해당 클래스 보존은 검증할 수 없다. 클래스별 결과는 outputs/integration/class_ap.csv에 있다.
원본 test에서 박스 재현율과 mAP50-95가 낮아졌으므로 기존 객체 검출 성능이 완전히 유지됐다고 결론낼 수 없다. 이번 모델은 PCB4 적응 PoC 후보이며 범용 PCB 검사기의 무조건적인 대체 모델이 아니다. 테스트 결과로 선정 규칙이나 임계값을 다시 조정하지 않았다.

## 동일 PCB4 test의 이미지 단위 비교

| 모델 | Precision | Recall | F1 | FP | FN |
|---|---:|---:|---:|---:|---:|
| Baseline | 64.00% | 80.00% | 71.11% | 9 | 4 |
| 선정 모델 | 86.96% | 100.00% | 93.02% | 3 | 0 |

선정 모델 TP=20, TN=17, Accuracy=92.50%, ROC-AUC=1.0, 이미지 Average Precision=1.0, 정상 오검출률=15.00%.
각 모델은 같은 validation40장에서 자기 임계값을 정한 뒤 같은 test40장을 평가했다. 선정 모델 임계값은 0.10295861다. 최대 결함 confidence는 확률이 아니다.
이미지를 NG로 맞힌 것만으로 결함 종류와 위치까지 맞혔다고 해석할 수 없다. 종류·위치 성능은 객체 검출 mAP 및 클래스별 AP로 별도 판단한다.

## 모델 선정과 기존 성능 유지

최종 사용 가중치: `C:\Project\AI_Source\jahwa\models\pcb_yolo_final.pt`.
실제 선정 모델의 클래스 목록: ['insufficient_solder', 'excess_solder', 'solder_bridge', 'solder_void', 'missing_component', 'shifted_component', 'burn', 'physical_damage', 'oxidation', 'pcb4_component_damage', 'pcb4_foreign_material', 'pcb4_miss', 'pcb4_oxidation', 'pcb4_scratch'].
추가 학습 후보 채택 여부: True.
사전 규칙: 원본 val mAP50-95 하락 ≤0.05, PCB4 val 이미지 F1 개선. 원본 mAP50-95 변화는 +0.014694다.
원본 이미지 단위 판정은 PCB4에서 정한 운영 임계값 적용 시 test recall=96.91%, FPR=0.47%다. 객체 mAP 유지와 이미지 판정 유지가 같은 의미는 아니다.
동일 원본 test에서 각 모델의 PCB4 val 임계값을 적용한 Baseline 이미지 recall=99.61%, FPR=26.23%, F1=82.03%; 선정 모델 이미지 F1=98.05%다.
기존 models/best.pt는 보존했다. 후보가 탈락하면 최종 파일을 새로 생성한 것처럼 표시하지 않는다.

## 사전 검사 효과 시뮬레이션

PCB4 test 검사 40장 중 실제 불량 20장, 검출 실제 불량 20장, 잔존 불량 0장, 정상 오분리 3장.
NG를 후속 조립 전 분리할 때 불량 유입 감소율은 100.00%다. Wilson95% 구간(%)은 [83.88698745050667, 100.0]이다.
이는 공개 데이터의 조건부 시뮬레이션이며 실제 자화전자 생산 불량률 감소 실적이 아니다. test 불량 한 장이 재현율5%p에 해당한다. 자동 이진 평가에는 REVIEW가 없으며 현장 REVIEW는 보류·수동 재검 정책이 필요하다.

## 산출물과 재실행

- PCB_YOLO.ipynb: Baseline 검증, 실제 검사, 정답/예측 비교, 원본 이미지 판정.
- PCB_VisA.ipynb: EDA, Smoke Test, 정식 학습, 모델 선정, test, 팀 통합 산출물과 HTTP 검증.
- `C:\Project\AI_Source\jahwa\runs\pcb4_transfer`: args.yaml, results.csv, 학습 곡선 및 best/last 체크포인트.
- outputs/integration/pcb_predictions.csv: 실제 test40장 이미지 판정.
- outputs/integration/pcb_metrics.json, pcb_model_config.json: 실제 모델과 평가/전처리/클래스 규격.
- outputs/integration/pcb_detections.json: 위치 검출과 confidence.
- outputs/eda/: 클래스·박스·해상도·위치 분포, GT 시각화, OpenCV 비교.
- outputs/integration/examples/: 실제 FP/FN 및 정상 판정 사례. 오류가 없는 유형은 사례를 임의 생성하지 않음.
- TEAM_INTEGRATION.md: Lens/Ring 전달 규약. 각 프레임워크의 원래 모델 로더를 사용.

## 미완료 및 한계

실제 액추에이터 PCB 현장 데이터 검증, 촬영 개체/세션 단위 분리, scratch 데이터 보강, 클래스 통합/학습률/해상도/샘플링별 ablation은 수행하지 않았다.
정확한 중복은 없었지만 유사 사진 누출은 배제하지 못한다. scratch는 train3/val1/test1이라 클래스 성능이 불안정하다.
자동 OOD 검출기는 없으며 입력 오류와 조건 이탈을 OK로 처리하면 안 된다. Bounding Box는 정밀 마스크가 아니다.
팀의 개별 부품 테스트만으로 완제품 단위 효과를 주장할 수 없다. 실제 제품ID 연결 또는 명시적 조합 가정이 필요하다.
Lens/Ring 실제 가중치는 제공되지 않아 세 부품 실모델의 동시 실행은 검증하지 않았다. 통합 환경의 패키지 호환성과 GPU 메모리 사용은 별도 확인이 필요하다.
실제 모델 API의 경로/PIL/OpenCV 입력, 정상/불량 2종×Baseline/최종 2모드의 실제 HTTP 업로드 4건과 잘못된 입력의 REVIEW 응답을 검증했다. 독립 app.py 서버에서도 정상/불량 2건 업로드와 주석 JPEG/실제 모델 버전을 확인했다.
브라우저 화면에서 클릭·업로드한 시각 검증 상태: blocked_before_visual_verification. 브라우저 연결 호스트를 사용할 수 없었고, 로그인된 Google Drive 창 선택은 비공개 정보 접근 우려로 자동 승인 검토에서 거절됐다. 그 창의 내용을 읽지 않았으며 전용 로컬 검사 창을 기다리고 있다. HTTP 검증을 GUI 시각 검증 완료로 표시하지 않는다.
세부 증거는 outputs/integration/http_verification.json, api_verification.json, deployment_http_verification.json, ui_verification.json에 있다.
