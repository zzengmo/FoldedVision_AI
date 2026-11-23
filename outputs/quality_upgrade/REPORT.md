# FoldedVision AI 추가 학습 기록

2026-11-23 · Asia/Seoul · 원본 작업 PC

## 결과

|부품|기존 수치|추가 학습|평가 단위|
|---|---:|---:|---|
|VISION Ring|정확도 80.95% · 34/42|**92.86% · 39/42**|기존 Ring 사진 42장의 결함 유형 3종|
|VISION Lens|AP 0.419|**AP 0.668**|기존 Lens 사진 52장의 3,410개 구역|
|VisA PCB1–3|전체 사진만 사용 AP 0.665 · F1 0.638|**전체 + 부분 AP 0.785 · F1 0.714**|PCB1–3 사진 1,324장의 정상·불량 분류|
|원형 금속 부품 MSDD|새 실험|**균형 정확도 81.2%**|별도 부품 30개의 테스트 사진 150장|

Ring, Lens, PCB는 각자 다른 평가 단위와 분할을 사용했습니다. AP는 불량 점수 순위의 정밀도·재현율을 요약하는 지표입니다. 세 점수의 평균으로 팀 전체 정확도를 계산할 수 없습니다.

## 새로 가져온 자료

|자료|확보한 내용|사용 범위와 저장 위치|
|---|---|---|
|Amazon VisA|공식 TAR 1,929,840,640 bytes, 공식 2cls high-shot CSV 658,163 bytes|PCB1–3 사진 3,311장을 선별 추출. `data/external/quality_upgrade/source_archives/VisA_20220922.tar`, `VisA_2cls_highshot.csv`|
|MSDD 원형 금속 부품|299개 부품의 사진 1,495장, 대응 YOLO 라벨 1,495개, 메타데이터 3개|원본의 부품별 분할 유지. `data/external/quality_upgrade/msdd_grouped/`|
|VISION Lens|PC의 `Downloads/Lens.tar.gz` 원본을 복사하고 SHA-256 대조. 75,168,801 bytes, 사진 222장과 COCO 어노테이션|팀과 같은 원본으로 재실행. `data/external/quality_upgrade/source_archives/Lens.tar.gz`와 `vision_lens/`|
|MobileNetV2 ImageNet 가중치|Keras 공식 alpha 0.5, 160 입력, no-top 가중치 3,201,480 bytes|학습 초기화용 가중치. `data/external/quality_upgrade/source_archives/MobileNetV2_0.5_160.h5`|

- VisA는 Amazon 원본과 공식 분할을 사용했습니다. [AWS 데이터 등록](https://registry.opendata.aws/visa/) · [공식 split](https://github.com/amazon-science/spot-diff/blob/main/split_csv/2cls_highshot.csv)
- MSDD는 CC BY 4.0 배포본의 리비전 `4ffb06a9c318b4cbfca4e5d66320a47fa70d68a5`를 고정했습니다. [원본 MSDD v9](https://universe.roboflow.com/msdd/msdd-prompt-learning-qjz4o/dataset/9) · [부품 단위 재분할본](https://huggingface.co/datasets/rltjr/metal-surface-defect-v1/tree/4ffb06a9c318b4cbfca4e5d66320a47fa70d68a5)
- Lens 원본의 공개 호스트 다운로드는 HTTP 401을 반환했습니다. 로컬 원본으로 팀의 분할과 구역 수를 재현했습니다. [VISION 공식 배포](https://huggingface.co/datasets/VISION-Workshop/VISION-Datasets)

추가 **정상 Lens** 후보인 Roboflow Lens Inspection의 내보내기 URL과 **동일 출처 Ring** 후보의 내보내기 URL은 HTTP 403을 반환했습니다. OGD-DET는 사용 목적 심사를 받는 광학 유리 검사 자료입니다. MLens는 OCT 스캔 자료이며 저장소가 전체 데이터 배포를 심사 이후로 안내합니다. DefectSpectrum Ring의 기존 재어노테이션도 새로운 사진 수로 집계하지 않았습니다. [Lens Inspection](https://universe.roboflow.com/lensdefect/lens-inspection-o7aru) · [Ring 후보](https://universe.roboflow.com/dataset-wzphc/hbb-inference-ori) · [OGD-DET](https://pntehan.github.io/OGD-DET/) · [MLens](https://github.com/cama36/MLens)

파일별 경로·크기·SHA-256과 요청 상태는 `data/external/quality_upgrade/source_archives/`의 `VisA_download.json`, `MSDD_download.json`, `MSDD_download_completion.json`, `Lens_local_acquisition.json`, `additional_access.json`에 있습니다. 추가 데이터 후보의 공개 메타데이터만 받은 경우는 학습 사진 수에서 제외했습니다.

## Ring

기존 3유형 라벨 87장과 학습 33장, 검증 12장, 테스트 42장의 분할을 유지했습니다. 원본 RGB 전체와 겹치는 네 부분을 각각 160×160으로 줄였습니다. 동결된 MobileNetV2의 얕은 층·중간 층·끝 층 특징에 평균·최댓값 풀링을 적용했습니다. 전체 특징만 쓰는 후보 두 개와 부분 특징을 결합한 후보 두 개 중 검증 Macro F1이 가장 높은 Dense 48 모델을 골랐습니다.

|기존 테스트 지표|기존 RGB CNN|전체 + 부분 전이학습|
|---|---:|---:|
|정확도|80.95%|92.86%|
|Macro F1|0.568|0.891|
|표면 미가공 정답|0/4|4/4|

오류 3건에는 오염을 표면 미가공으로 분류한 2건과 스크래치를 오염으로 분류한 1건이 있습니다. 기존 테스트를 다시 사용했으며 특히 표면 미가공은 테스트가 4장입니다. VISION Ring에는 검증된 정상 사진이 없어 정상·불량 판정을 검증할 수 없습니다. [평가 지표](vision_ring_transfer_metrics.json) · [예측 CSV](vision_ring_transfer_predictions.csv)

## Lens

팀 노트북의 같은 렌즈 그룹 제거, 촬영 규격별 이미지 배율, 256×256 구역과 마스크 판정 규칙을 재실행했습니다. 학습만 중복 좌표를 제거하고 정상 구역을 1,518개에서 2,455개로 늘렸습니다. 총 학습 구역 수는 2,277개에서 3,203개로 늘었습니다. 검증 16장 806구역과 테스트 52장 3,410구역을 유지했습니다. RGB 구역을 160×160으로 줄이고, 고정 CNN 특징을 사용해 선형 분류와 Dense 96을 학습했습니다. 검증 AP가 가장 높은 후보를 선택하고 검증 재현율 95% 이상에서 정밀도가 가장 높은 임계값을 사용했습니다.

|같은 테스트 구역의 지표|기존 팀 CNN|추가 학습|
|---|---:|---:|
|AP|0.419|0.668|
|ROC-AUC|0.756|0.859|
|불량 재현율|92.06%|92.40% (535/579)|
|정상 구역 오검출률|65.42%|53.16% (1,505/2,831)|

실제 정상 전체 렌즈의 테스트 라벨은 0장입니다. 정상 렌즈의 오검출률을 이 수치에서 추정할 수 없습니다. 팀의 기존 U-Net 결과는 팀 노트북에 보존했습니다. 이번 가중치는 구역 분류용입니다. [평가 지표](lens_patch_metrics.json) · [예측 CSV](lens_patch_predictions.csv)

## PCB

Amazon VisA의 고정 high-shot 분할을 사용했습니다. 공식 학습 사진만 기판과 클래스별로 80 대 20으로 나눠 학습 1,590장과 내부 검증 397장을 만들었습니다. 공식 테스트는 1,324장으로 정상 1,204장, 불량 120장입니다. 동일 파일 SHA-256 검사를 통과했습니다. 동일 물리 기판이나 촬영 세션을 구별하는 ID는 얻지 못했습니다.

Keras에서 Conv 16→32→64, 최대 풀링, 전역 평균·최대 풀링, Dense 32로 기준 CNN을 구현하고 20 epoch 학습했습니다. 검증 AP는 **0.319**였습니다. 전체 사진만 보는 MobileNetV2 전이학습 후보 최고 검증 AP는 **0.749**였고, 전체와 겹치는 네 부분을 결합한 후보는 **0.860**이었습니다. 부분 특징 Dense 96을 검증 AP로 선택하고, 예측 임계값은 검증 F1을 기준으로 고정했습니다.

|공식 테스트 지표|전체 사진 전이학습|전체 + 부분 전이학습|
|---|---:|---:|
|AP|0.665|0.785|
|F1|0.638|0.714|
|정확도|93.66%|95.39%|
|불량 재현율|61.67% (74/120)|63.33% (76/120)|
|정상 오검출률|3.16% (38/1,204)|1.41% (17/1,204)|

|기판|테스트 사진|불량 재현율|정상 오검출률|F1|
|---|---:|---:|---:|---:|
|PCB1|442|75.0% (30/40)|1.99%|0.769|
|PCB2|440|72.5% (29/40)|1.00%|0.795|
|PCB3|442|42.5% (17/40)|1.24%|0.548|

부분 모델의 전체 AP와 F1은 개선됐지만 PCB3 재현율은 47.5%에서 42.5%로 낮아졌습니다. 전체 모델 테스트를 확인한 뒤 부분 모델을 검토했으므로 두 수치는 같은 공식 테스트의 반복 비교입니다. 전체 정확도 95.39%는 정상 사진이 많은 환경의 지표이며 불량 44장을 놓쳤습니다. 팀 PCB4 YOLO는 결함 위치 검출을 평가한 별도 기록입니다. PCB4 기존 팀 가중치와 커스텀 학습 스크립트를 확보하지 못해 PCB4 YOLO 점수는 갱신하지 않았습니다. [선정 기록](pcb_selection.json) · [전체 사진 지표](pcb_visa_metrics.json) · [전체와 부분 지표](pcb_detail_metrics.json) · [예측 CSV](pcb_detail_predictions.csv)

## MSDD 원형 금속 가공 부품

동일 부품의 5방향 사진이 한 분할 안에 있도록 부품 ID를 확인했습니다. 학습 1,195장, 검증 150장, 테스트 150장입니다. 빈 폴리곤 라벨을 정상으로, 하나 이상 있는 라벨을 결함으로 사용했습니다. 파일명에 남아 있는 검사자의 OK/NG 표기에는 별도의 허용 기준이 있어 분류 정답에 사용하지 않았습니다.

두 전이학습 후보 중 정상·불량 AP 평균으로 Dense 96을 선택했습니다. 테스트 균형 정확도는 **81.2%**, 결함 재현율은 **74.4% (93/125)**, 정상 오검출률은 **12.0% (3/25)**입니다. MSDD와 기존 VISION Ring 사진의 동일 SHA-256은 0건입니다. MSDD는 VISION Ring의 87장이나 Ring 시험 성능에 합산하지 않았습니다. [평가 지표](msdd_metrics.json) · [예측 CSV](msdd_predictions.csv)

## 실행 방법

- **웹**은 프로젝트 루트의 [Start_FoldedVision.cmd](../../Start_FoldedVision.cmd)를 실행합니다. 부품을 선택하고 **추가 학습**에서 비교 막대와 실제 테스트 사진을 엽니다.
- **모델**은 [최종 노트북](../../notebooks/ring/02_Ring_DeepLearning_Final.ipynb) 끝부분의 설정에서 `infer`를 고르고 공통·추론 셀을 실행합니다. `predict_quality_rgb("ring", q_rgb(이미지경로))`처럼 호출합니다. Laptop CPU에서 학습했으며 재현에는 TensorFlow/Keras 2.15, Python 3.11, 기존 requirements 환경을 사용합니다.
- `lens` 추론 입력은 이미 팀 방식의 배율과 분할을 적용한 RGB 256×256 구역입니다. `pcb`와 `msdd`는 각각 해당 부품 원본 RGB 이미지에서 점수를 반환합니다.
- 학습 결과는 `models/quality_upgrade/`, 샘플별 예측과 후보별 실제 epoch·학습 이력은 이 보고서 폴더의 `*_predictions.csv`, `*_history.json`에 있습니다.

|추론 부품|선택 모델 파일|
|---|---|
|Ring|`vision_ring_encoder.keras`, `vision_ring_global_tiles_48_head.keras`|
|Lens|`lens_patch_model.keras`|
|PCB1–3|`pcb_detail_encoder.keras`, `pcb_detail_dense96_head.keras`|
|MSDD|`msdd_model.keras`|

다른 PC에서 재추론할 때는 해당 가중치와 이 폴더의 지표 JSON, PCB의 `pcb_selection.json`을 같은 상대 경로로 옮깁니다. 웹 증거 화면은 웹 파일과 여섯 사례 이미지를 포함해 별도로 실행할 수 있습니다.

## 이번 작업 이력

|시각 (KST)|작업과 확인 내용|
|---|---|
|12:52–13:04|기존 데이터·노트북·가중치와 외부 출처 조사. 원본 보존 파일 SHA-256 기록. VisA TAR·공식 분할·MSDD·ImageNet 가중치 다운로드. 로컬 Lens 원본 복사. MSDD 추가 요청이 기본 네트워크 권한에서 한 차례 막혀 허용된 네트워크 실행으로 재시도하여 전체 확보.|
|13:01–13:06|Ring 후보 네 개, Lens 후보 두 개, MSDD 후보 두 개, PCB 직접 구현 CNN과 전체 사진 전이학습 후보 두 개를 실제 학습하고 검증 점수로 선택. 첫 테스트 CSV와 지표 저장.|
|13:09 이후|PCB 부분 특징 후보 두 개 학습. 검증 AP로 최종 선택하고 기존 공식 테스트에서 비교. 선택·지표·샘플별 예측 기록 저장.|
|검증·정리|노트북 02에 선택 실행 셀 추가, 이전 내용은 원본 백업과 대조. 저장 모델로 재추론하고 브라우저 사례와 수치 확인. README, AGENTS, DATA_SOURCES, 다른 PC용 CODEX_PROMPT 갱신.|

- **코드**는 `02_Ring_DeepLearning_Final.ipynb` 끝에 설정·학습·추론·검증을 추가했습니다. 기존 58개 셀을 보존해 총 69개 셀이 됐습니다. 초기값 `off`에서 새 학습이 시작되지 않는 것을 확인했습니다. 기존 Ring 모델, 기준 노트북, 팀 노트북의 수정 전후 해시도 확인했습니다. 원본 최종 노트북은 `archive/2026-11-23_before_quality_upgrade_02.ipynb`에 있습니다. [보존 검증](preservation_check.json)
- **데이터와 모델**은 MSDD 사진·라벨·메타데이터 2,993개와 압축·가중치 파일의 해시를 대조했습니다. 후보와 최종 저장 모델을 합쳐 새 체크포인트 18개의 SHA-256을 기록했습니다. Ring 9건, Lens 12건, PCB 12건, MSDD 12건을 저장 모델에서 재추론했으며 예측 CSV와 가장 큰 점수 차이는 0.000002 미만이었습니다. [재추론 검증](inference_replay.json)
- **웹**은 `src/main.jsx`, `src/styles.css`에 결과 영역을 추가했습니다. `src/qualityResults.json`과 `public/evidence/quality/`에 검증 결과와 실제 평가 사진 6장을 저장했습니다. Vite 빌드가 통과했고 로컬 Edge로 세 부품의 수치와 이미지 두 장씩, 확대 열기·닫기, 390px 모바일 폭을 검증했습니다. 기본 권한에서 로컬 브라우저 연결이 지연돼 로컬 테스트 실행 권한으로 재시도했습니다. [브라우저 검증](web_validation.json)

검증용 임시 브라우저 프로필과 임시 코드 사본을 정리했습니다. 변경과 데이터는 로컬 프로젝트에 저장했습니다. 새 원본 아카이브와 중간 모델은 Git 제외 상태입니다.

## 다음에 수집할 사진

- **Ring**은 동일 카메라·조명에서 표면 미가공과 정상 제품을 더 촬영해야 합니다. 같은 부품이나 생산 로트가 학습·검증·평가에 섞이지 않도록 제품 ID를 함께 남깁니다.
- **Lens**는 검수된 정상 렌즈 전체 사진이 우선입니다. 반사·테두리가 강한 정상 사례와 작은 결함 마스크를 함께 확보하면 사진 단위 오검출을 재고 임계값을 정할 수 있습니다.
- **PCB**는 실제 팀 PCB4 촬영 조건의 정답 박스·정상 사진과 팀이 실행한 YOLO 가중치가 있어야 같은 위치 검출 과제의 개선을 검증할 수 있습니다.
