# Ring 데이터 출처와 추가 확보 기록

확인일: 2026-11-18. Ring 학습에 사용한 자료와 후속 사용자 링크 다운로드 기록입니다.

## 사용자가 추가 제공한 두 링크 조사

후속 요청에서 제공된 Drive 파일은 직접 다운로드해 내부를 확인한 결과 다른 부품 자료였습니다. 아래 기록은 이 후속 다운로드에 관한 것이며, 기존 Ring 학습에 포함하지 않았습니다.

|제공 링크|실제 확인 결과|저장·사용 상태|
|---|---|---|
|[Google Drive Data.zip](https://drive.google.com/file/d/1x1fWg54HHkBc4zABBs3n2Szl6izrwr3n/view)|엔진 커넥팅로드 베어링 설치 상태 16종, JPG 1,573장|다운로드·안전 추출 완료. Ring 학습에서 제외|
|[EL O-Ring v1](https://universe.roboflow.com/el-ewg0p/o-ring-defect-detection-doyk7/dataset/1)|페이지에 Crack / Cutting / Inner-Stamped / OK / Outer-Stamped 표시|다운로드 HTTP 403. 데이터 파일은 미확보|

Drive 원제공자는 [alireza768 / Bearing-Dataset](https://github.com/alireza768/Bearing-Dataset)입니다. README의 Classification Data 링크가 사용자가 준 Drive ID와 일치합니다. 원제공자는 네 기통 엔진의 베어링 설치 조합 16종으로 설명합니다. 숫자 폴더를 O-Ring 결함 유형 또는 정상/불량 라벨로 바꾸지 않았습니다.

실제 Drive 압축은 1,383,934,519 bytes이며, 내부 Train 933장 / Validation 640장입니다. 1~16 폴더 중 train의 7번은 33장이고 나머지는 60장, validation은 각 40장입니다. 원제공자 README의 전체 데이터 수와 이번 ZIP의 실제 파일 수가 달라 실제 ZIP 개수를 기록했습니다. ZIP에는 정상/불량 뜻을 설명하는 별도 문서나 클래스명 매핑이 없습니다.

- ZIP: `data/archives/user_oring/Data.zip`
- 추출: `data/external/user_drive_bearing/Data/`
- URL·크기·SHA-256: `data/external/source_metadata/user_ring_links/drive_download_manifest.json`
- 압축 목록·샘플: 같은 폴더의 `archive_inventory.json`, `drive_samples.png`
- 종합 조사: `outputs/user_supplied_links/source_audit.json`
- 새 O-Ring 재학습 상태: 실제 O-Ring 내보내기 파일 대기. 이번 두 링크로 새 Ring 모델을 학습했다고 기록하지 않습니다.

이후 사용자가 **다운로드한 자료 자체로 학습을 진행**하도록 명시해 베어링 설치 상태 16종의 별도 학습 실험을 추가했습니다. 이 실험은 Ring 모델에 섞지 않습니다. 학습 773장, 내부 검증 154장, 원본 Validation에서 중복 제거한 홀드아웃 638장을 사용합니다. 같은 사진 해시와 파일명 번호 5장 블록은 분할 사이에 겹치지 않습니다. 학습 코드·결과는 두 노트북의 베어링 절과 `outputs/bearing_installation/`에 저장합니다.

Roboflow 데이터가 확보되면 별도의 입력 검증과 학습 계획이 필요합니다. 과거 노트북 02 PART 12의 `data/archives/user_oring/roboflow_oring_coco.zip` 입력 준비 코드는 `archive/2026-11-19_before_cleanup.zip`에 보관했습니다. COCO 클래스와 정상 OK 정답을 검증하고, 파일명에 표시된 증강 계열 및 동일 바이트 사진을 같은 그룹으로 연결합니다. 이 새 정상/불량 작업과 기존 VISION의 3종 유형 분류 점수는 구분해야 합니다.

## 기존 VISION Ring

- 제공처: [VISION-Workshop / VISION-Datasets](https://huggingface.co/datasets/VISION-Workshop/VISION-Datasets)
- 논문: [Bai et al., VISION Datasets](https://arxiv.org/abs/2306.07890)
- 원본: 사용자가 제공한 `data/Ring.tar.gz`.
- 실제 이미지: 551장. 유형·위치 정답 87장, 정답 미공개 inference 464장.
- 공식 polygon 라이선스: CC BY-NC 4.0. 이미지 원본은 각 원제공처의 조건을 함께 확인해야 합니다.

## 이번에 다운로드한 DefectSpectrum Ring

- 제공처: [DefectSpectrum / Defect_Spectrum / DS-VISION / Ring](https://huggingface.co/datasets/DefectSpectrum/Defect_Spectrum/tree/main/DS-VISION/Ring)
- 저자 저장소: [EnVision-Research / Defect_Spectrum](https://github.com/EnVision-Research/Defect_Spectrum)
- 논문: [Yang et al., Defect Spectrum, ECCV 2024](https://arxiv.org/abs/2310.17316)
- 고정 revision: `a00e814d12595f394a819f34132f058457099f07`.
- 저장 위치: `data/external/DefectSpectrum/DS-VISION/Ring/`.
- 다운로드: JPG 80개 + 정답 PNG 마스크 80개 = 160개 파일, 6,482,803 bytes.
- 저장소 카드의 라이선스 표기: MIT. 상위 VISION·원본 이미지의 이용 조건을 자동으로 대체한다고 해석하지 않습니다.
- URL·다운로드 시각·파일별 SHA-256·크기: `data/external/source_metadata/ring_download_manifest.json`.
- 제공처 설명 원문: `data/external/source_metadata/DefectSpectrum_README.md`.

### 중복 검사 결과와 사용

80장 모두 기존 Ring 사진과 SHA-256이 같습니다. 기존 정답 사진 64장(공식 train 37 + val 27), 기존 정답 미공개 inference 사진 16장입니다. **새로 촬영된 이미지 80장을 확보한 것이 아닙니다.** 새로 확보한 것은 기존 inference 16장의 마스크와 기존 사진의 정밀 재어노테이션입니다.

DefectSpectrum은 기존 어노테이션을 더 세밀하게 수정한 자료이고, Ring 마스크에는 0~4 값이 있습니다. 이를 VISION의 세 결함 유형으로 추정 변환하지 않았습니다. 비영 픽셀의 합집합을 결함 위치 보조 학습에만 사용합니다. 새 마스크가 없는 기존 학습 사진은 기존 COCO polygon을 사용합니다.

유형 정답이 없는 16장은 분류 손실 가중치를 0으로 설정하고 마스크 손실로만 학습합니다. 기존 validation 및 holdout 사진의 DefectSpectrum 마스크는 학습에서 제외합니다. 사진 해시 기준 사용 내역은 `outputs/improvement_v2/external_overlap_audit.csv`에 있습니다.

## 확인했지만 다운로드하지 못한 후보

VISION 논문 부록의 Ring 원출처 링크는 [dataset / hbb inference ori](https://universe.roboflow.com/dataset-wzphc/hbb-inference-ori)로 연결됩니다. [Object Detection / Ring 551장](https://universe.roboflow.com/object-detection-sogkb/ring-49tzf) 재게시 자료도 확인했습니다. Roboflow 다운로드 페이지 요청이 HTTP 403으로 거절돼 파일을 가져오지 못했습니다. 인증이나 접근 제한을 우회하지 않았고, 이 후보를 학습 데이터에 포함했다고 주장하지 않습니다.

## 95% 목표와 평가 범위

목표는 기존 작업과 같은 **결함 유형 분류 정확도 95% 이상**입니다. 정상/불량 Recall 95%와 다릅니다. 검증된 정상 부품 정답은 여전히 없으므로 정상/불량 성능과 제조 불량 유입 감소율은 평가할 수 없습니다.

추가 실험은 학습 33장, 검증 12장, 기존 홀드아웃 42장을 유지합니다. 모델 선택은 검증 Macro F1로 합니다. 42장은 이전 개발에서 이미 확인한 평가 세트이므로 재사용 홀드아웃 결과로 표시합니다. 새로운 촬영·로트의 독립 성능이나 95% 보장으로 해석하지 않습니다. 테스트 정답 마스크·bbox를 분류 입력으로 쓰지 않습니다.

후속 교차검증 실험은 공식 train 45장 안에서만 3-fold를 수행합니다. 각 사진의 out-of-fold 예측으로 구조를 선택하고, fold별 최적 epoch 중앙값을 고정해 45장을 최종 재학습합니다. 이 과정에서는 외부 마스크를 유형 정답으로 사용하지 않으며, 기존 공식 val 42장은 계속 학습에서 제외합니다. 근접 촬영 중복과 생산 로트 정보는 검증할 수 없어 일반화 한계로 남깁니다.

## 인용

Bai, H. et al. (2023). VISION Datasets: A Benchmark for Vision-based InduStrial InspectiON. arXiv:2306.07890.

Yang, S. et al. (2024). Defect Spectrum: A Granular Look of Large-Scale Defect Datasets with Rich Semantics. ECCV. arXiv:2310.17316.


## 다운로드한 베어링 실제 학습 결과

사용자가 다운로드 자료 자체의 학습을 요청해 별도 16종 분류 실험을 완료했습니다. 기준 CNN 9.87% → 개선 57.21%(365/638장), Macro F1 0.5556입니다. 내부 검증 94.81%와 최종 평가 점수는 다르며, 95%는 미달입니다. 학습 773 / 내부 검증 154 / 최종 평가 638장입니다. [전체 결과](outputs/bearing_installation/REPORT.md)와 [검증 기록](outputs/bearing_installation/validation_checks.json)에 남겼습니다. 기존 Ring 모델과 통합 출력은 유지했습니다.


## 2026-11-19 폴더 정리

이 문서가 언급하는 과거 `outputs/improvement_v2/`, `outputs/cross_validation_v3/`, `outputs/revisions/` 및 당시 코드는 복원용 ZIP `archive/2026-11-19_before_cleanup.zip` 안의 동일 상대 경로에 보관했습니다. 원본·추가 데이터·다운로드 근거인 `data/`는 전체 보존했습니다. 현재 기준·최종 코드와 베어링 결과는 활성 폴더에 남아 있습니다.
