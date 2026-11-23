# 프로젝트 기억과 파일 보존 규칙

이 문서는 다음 작업자가 먼저 읽어야 하는 프로젝트 기억 파일이다.
마지막 정리 기준일: 2026-11-19, Asia/Seoul.

GitHub에서 작업을 이어갈 때는 README.md와 CODEX_PROMPT.txt를 참고한다. 아래 보존 경로는 원본 작업 PC 기준이다. 새 PC에는 원본 데이터, 환경, 과거 실험 백업과 일부 체크포인트를 필요한 경우 가져온다. `notebooks/lens/`와 `notebooks/pcb/`에는 팀원이 전달한 코드와 실행 결과가 있다. 기존 Lens 가중치와 통합 설정, PCB 재현 환경은 별도 전달이 필요하다.

## 사용자의 의도

- 수업에서 배운 TensorFlow/Keras CNN을 중심으로 설명하기 쉬운 프로젝트를 만든다.
- **베이스라인 코드, 최종 코드, 데이터 자료를 반드시 보존한다.**
- 실제 학습·평가·출처 기록을 남기고 검증과 최종 평가 점수를 혼동하지 않는다.
- 코드 구현은 두 노트북에 유지한다. 임시 Python 스크립트를 루트에 쌓지 않는다.
- 향후 PCB·렌즈 담당자의 모델과 입력/출력 규격을 받아 통합한다.
- React 포트폴리오는 `sites/foldedvision-inspection/`에 있다. 저장된 평가 사례와 Three.js 3D 공정 게임을 사용한다. 팀 모델의 실시간 웹 추론 연결은 후속 작업이다.

## 반드시 남길 파일

|경로|역할|
|---|---|
|`notebooks/ring/01_Ring_CNN_Baseline.ipynb`|Ring 및 다운로드한 베어링의 기준 CNN 코드와 실제 실행 결과|
|`notebooks/ring/02_Ring_DeepLearning_Final.ipynb`|Ring 최종 실험·추론·Gradio, 별도의 베어링 최종 실험·추론·Gradio|
|`notebooks/lens/`, `notebooks/pcb/`|팀원 원본 노트북 네 개와 저장된 실행 결과|
|`data/` 전체|원본 압축, 해제된 사진과 정답, 추가 마스크, 출처 자료, 전처리 배열|
|`models/ring_cnn_baseline.keras`와 `.json`|Ring 베이스라인 가중치와 학습 이력|
|`models/ring_cnn_final.keras`|팀 통합에 쓸 Ring 최종 가중치|
|`models/bearing_installation/` 전체|베어링 베이스라인·비교 후보·최종 모델과 학습 이력|
|`models/`의 나머지 루트 모델·JSON|현재 최종 노트북의 CNN·U-Net 비교 실행 캐시|
|`outputs/integration/`|Ring 팀 통합용 설정, 실제 평가 지표, 예측 CSV|
|`outputs/bearing_installation/`|베어링 설정, 분할, 실제 지표·예측·보고서·검증 기록|
|`outputs/metrics/`, `outputs/figures/`|Ring 분할·학습 이력·평가·설명용 그림|
|`outputs/user_supplied_links/`|사용자 제공 링크의 다운로드 및 자료 식별 기록|
|`requirements*.txt`, `.venv/`, `.vscode/`|현재 실행 환경과 재설치 정보|
|`archive/2026-11-19_before_cleanup.zip`|정리 전 코드·문서·full 모델·full 결과의 복원용 백업|
|`outputs/cleanup_records/`|정리 전 보존 파일 해시, 삭제·보관 내역, 정리 후 검증 기록|

위 파일은 '중간 파일처럼 보인다'는 이유로 삭제하거나 덮어쓰지 않는다.
`data/processed/`도 이번 사용자가 보존 요청한 data 범위에 포함한다.
모델은 같은 이름이라도 학습용 체크포인트와 추론용 최종 내보내기가 다를 수 있다.
새 요청으로 변경할 때는 원본 상태와 이유를 먼저 기록한다.

## 서로 다른 두 작업과 실제 수치

### VISION Ring: 결함 유형 3종

- 전체 JPG 551장: 유형 정답 87장, 정답 없는 inference 464장.
- 유형은 `t_contamination`, `t_scratch`, `unfinished_surface`.
- 학습 33장 / 검증 12장 / 최종 평가 42장.
- 최종 모델은 기준 RGB CNN. 정확도 **80.9524% (34/42)**, Macro F1 **0.5677655678**.
- 검증된 정상 라벨이 없다. inference 사진을 정상 정답으로 바꾸면 안 된다.
- 정상/불량 확률·불량 Recall·실제 불량 감소율은 평가할 수 없다.
- `predict_ring(image)`는 `status="REVIEW"`이며 유형과 유형 점수를 반환한다.
- U-Net은 검증 품질이 낮아 시연의 마스크를 비활성화했다.
- Grad-CAM은 분류 근거 열지도이며 정밀 결함 마스크가 아니다.

### 사용자 Drive 자료: 엔진 베어링 설치 상태 16종

- **O-Ring 결함 자료가 아니다.** Ring과 합치거나 성능을 직접 비교하지 않는다.
- 숫자 폴더 1~16은 설치 조합 ID다. 정상/불량 대응표가 없어 임의 변환하지 않는다.
- 원본 1,573장: Classification Train 933 / Classification Validation 640.
- 동일 바이트 및 번호 블록 중복 정리 후 학습 **773** / 내부 검증 **154** / 최종 평가 **638**.
- 클래스별 파일 번호 5장 블록 분리는 촬영 연속성을 완화하는 가정이며 실제 세션 ID는 아니다.
- 기준 최종 평가 9.8746%, 개선 최종 평가 **57.2100% (365/638)**, Macro F1 **0.5555665708**.
- 개선 모델 내부 검증 정확도는 **94.8052%**. 최종 평가 정확도 또는 Ring 성능으로 쓰면 안 된다.
- 사용자는 내부 검증 94.81%에 만족하고 추가 학습을 종료했다. 95% 달성으로 기록하지 않는다.
- 4개 후보를 검증 Macro F1로 선택한 뒤 원본 Validation에서 평가했다.
- 실제 실행 epoch: 기준 70, 공간 CNN 22, 증강 CNN 33, 정확도 체크포인트 증강 CNN 61.
- 선정 모델: `bearing_cnn_spatial_aug_accuracy`.
- 베어링 데이터 서명: `2a5a1d481f13e89351f907eca4684ed181df69a7cabcfad67b1d8ab703f0d096`.
- 앞의 두 후보는 실제 학습 후 이력 JSON 직렬화 오류가 있었다. 실제 stdout의 반올림 이력을 복원했고 가중치는 유지했다. 확인 불가 학습 시간은 null이다. 뒤 두 후보는 수정 후 정상 저장했다.

## 데이터 출처와 원본 위치

- Ring 원본: `data/Ring.tar.gz`, 해제본 `data/raw/Ring/`.
- VISION: https://huggingface.co/datasets/VISION-Workshop/VISION-Datasets
- DefectSpectrum Ring: `data/external/DefectSpectrum/`. 80쌍은 기존 사진과 일치하는 재어노테이션/추가 마스크이며 새 사진 80장이 아니다.
- Drive: https://drive.google.com/file/d/1x1fWg54HHkBc4zABBs3n2Szl6izrwr3n/view
- 원제공자: https://github.com/alireza768/Bearing-Dataset
- Drive ZIP: `data/archives/user_oring/Data.zip`, **1,383,934,519 bytes**.
- ZIP SHA-256: `1e785532382b487eb2838aa9bfa860c0b07e80a72ebe9acf46abd938d0af59d9`.
- 해제본: `data/external/user_drive_bearing/Data/`.
- 다운로드 증거: `data/external/source_metadata/`.
- Roboflow O-Ring 링크는 HTTP 403으로 파일 미확보. 학습했다고 기록하지 않는다.
- 출처·이용 조건의 상세 내역은 `DATA_SOURCES.md`에 있다.

## 실행과 팀 통합

- Ring은 이 프로젝트 루트 또는 `notebooks/ring/`에서 실행한다. 커널은 `.venv/Scripts/python.exe`.
- Python 3.11.9, TensorFlow/Keras 2.15.0. 현재 CPU 실행이다.
- Ring 모델 입력: RGB 256×256, 외부 전처리 float32 / 255, 클래스 순서는 통합 설정 JSON 참조.
- 베어링 입력: 축소 JPEG 디코딩 → RGB 192×192 uint8, 모델 내부에 Rescaling(1/255)이 있다.
- Ring 추론만: 노트북 02의 `settings`, `environment`, `io`, `preprocessing`, `inference` 셀. UI는 이어서 `ui` 셀.
- 베어링 추론만: `settings`, `environment`, `io`, `bearing_config`, `bearing_inference` 셀. UI는 이어서 `bearing_ui` 셀.
- 베어링만 학습/평가: 처음 세 설정·환경·입출력 셀과 마지막 `bearing_*` 절을 실행한다.
- 전체 재실행은 저장 모델과 학습 설정의 서명이 일치할 때 기존 체크포인트를 재사용한다.
- `RING_RUN_MODE=quick`은 2 epoch 기능 점검용이다. 정리로 기존 quick 파일을 지웠으므로 실행하면 다시 생성된다.
- 노트북 Gradio는 로컬 127.0.0.1, share=False. React 포트폴리오의 로컬 실행 방법은 `sites/foldedvision-inspection/README.md`에서 확인한다.
- PCB·렌즈와 합칠 때는 각자 학습된 모델·전처리·클래스 의미·샘플을 받고 Python API에서 부품별 함수를 호출한다.

## 2026-11-19 정리 원칙과 복원

- 데이터, 현재 베이스라인/최종 코드, 현재 학습 모델과 결과, 실행 환경은 보존했다.
- 최종 노트북에서 과거 Ring PART 10~12(미채택 개선·교차검증·미확보 ZIP 준비)를 분리했다.
- 해당 원본 코드, 실험 모델과 결과는 정리 전 ZIP 안의 원래 상대 경로에 보관했다.
- quick 결과, 설치용 uv 캐시, 모델 단독 테스트용 복사본, 임시 UI/커널 캐시는 재생성 가능하므로 삭제 대상이다.
- `.venv`의 설치 패키지와 `data/`는 캐시 정리 대상에 포함하지 않는다.
- 모델·데이터 SHA-256을 정리 전후 대조한다. 결과는 `outputs/cleanup_records/cleanup_result.json`에서 확인한다.
- ZIP 복원은 먼저 별도 임시 폴더에 해제하고 필요한 파일만 복사한다. 현재 최종 파일 위에 무조건 덮어쓰지 않는다.
- 향후 정리 시 이 문서와 보존 목록을 먼저 읽고, 대상의 절대 경로가 이 작업 폴더 안인지 검증한다.

## 정리 완료 확인

2026-11-19 정리 완료. 데이터 2,317개와 보존 대상 2,351개의 해시가 모두 일치했다. 베이스라인 노트북은 바이트 단위 동일하며 최종 노트북은 88 → 58셀로 정리했다. Ring·베어링 실제 예측이 기존 CSV와 일치했고 두 베이스라인 모델 로딩 및 pip check를 통과했다. 새 학습은 하지 않았다. 재생성 가능한 quick·캐시와 기존 미채택 실험 경로 17개를 정리했으며 과거 full 실험은 검증된 ZIP으로 복원할 수 있다. 검증용 임시 파일도 제거했다. 자세한 내역은 outputs/cleanup_records/cleanup_result.json 참조.

## 2026-11-23 추가 실험

- 기존 수치와 모델은 위 절의 2026-11-19 결과다. 이번 수치, 출처·다운로드·학습·평가 작업 기록은 [추가 학습 보고서](outputs/quality_upgrade/REPORT.md)에 있다.
- `02_Ring_DeepLearning_Final.ipynb` 원래 58셀은 그대로다. 뒤에 추가한 절의 기본값은 `off`다. 필요할 때 `ring`, `lens`, `pcb`, `msdd`, `infer`, `verify` 중 한 가지를 실행한다. 수정 전 02의 원본은 `archive/2026-11-23_before_quality_upgrade_02.ipynb`에 보존한다.
- 새 원본·출처 기록은 `data/external/quality_upgrade/`, 새 체크포인트는 `models/quality_upgrade/`, 평가·예측·학습 이력은 `outputs/quality_upgrade/`에 있다. 이후 폴더 정리에서도 이 자료를 보존한다.
- Lens 점수는 마스크로 만든 구역 라벨 기준이며 정상 전체 렌즈의 오검출률은 평가하지 못했다. MSDD의 원형 금속 부품은 VISION Ring과 다른 데이터다. PCB1–3 사진 분류는 팀 PCB4 YOLO 위치 검출과 별개다.
- React 로컬 웹에 이전 평가와 새 평가를 확인할 수 있는 화면이 있다. `Start_FoldedVision.cmd`로 시작한다. 3D 체험은 저장 사례로 시연하며 브라우저 자체가 새 사진을 추론하는 기능은 아직 없다.

## 2026-11-23 발표 자료와 중복 정리

- 20분 팀 발표는 `outputs/presentation/FoldedVision_팀발표_20분_최종.pptx`와 `FoldedVision_팀발표_20분_최종_대본.txt`를 사용한다. 기존 Ring 단독 발표 파일도 남겼다.
- 현재 여섯 노트북은 `notebooks/lens/`, `notebooks/ring/`, `notebooks/pcb/`에 있다. 팀원 노트북 원본과 Ring 학습·평가 결과 셀을 보존했다. Ring 노트북의 프로젝트 루트와 Lens 참조 경로만 새 구조에 맞췄다.
- 이전 팀 PPT·대본과 웹 미리보기 7개는 `archive/2026-11-23_previous_presentations.zip`에서 복원할 수 있다. 웹의 `dist/`는 시작 CMD가 다시 만든다. 실행 환경과 평가 사진·자료는 프로젝트에 보관한다.
- 정리 전후 보호 파일 9,137개의 SHA-256 일치를 확인했다. [정리 기록](outputs/cleanup_records/presentation_cleanup_2026-11-23.json)

## 2026-11-23 공정 제어실 발표 판본

- 현재 최종 발표는 `outputs/presentation/FoldedVision_최종발표.pptx`이며 표지 한 장이다. 주제는 외주 부품이 제조에 투입되기 전 딥러닝 기반 외관 결함을 검사하는 것이며, Lens·Ring·PCB를 한 명씩 맡았다. 표지 미리보기는 `outputs/presentation/slide_previews/표지.png`다. 이전 21장·10장 PPT와 대응 PDF·미리보기를 휴지통으로 옮겼고, 대본과 검토 기록은 프로젝트에 남겼다. 92.86%는 VISION Ring 기존 테스트의 유형 분류 정확도다.
- 부품별 딥러닝 설계와 노트북 학습 가이드는 `outputs/presentation/공부자료/` PDF 세 개에 있다. `공정캡처/`는 새 발표에 사용한 실제 로컬 화면이다.
- `Start_FoldedVision.cmd`로 웹을 실행한다. 3D 공정의 네 사례는 실험 저장 결과다. 라인 전체·촬영부·분류부를 전환하고 실제 평가 사진과 모델 결과, 선택 경로와 권장 경로를 확인한다.
- 초기 공정 판본 웹 검증은 `outputs/presentation/industrial_validation.json`, 최신 발표·PDF 검증은 `outputs/presentation/data_provenance_validation.json`에 있다. 이전 19장과 27장 판본은 각각 `archive/2026-11-23_before_industrial_deck.zip`, `archive/2026-11-23_before_data_provenance_revision.zip`에 보관한다.
- 데이터 출처는 [DATA_SOURCES.md](DATA_SOURCES.md)를 기준으로 한다. VISION의 PCB 후보 확보 기록, 팀 PCB4 표본 6장의 VisA 원본 대조, 기존 PCB 납땜 자료의 URL 미확인 상태를 구분한다.

## 제공 템플릿으로 다시 만든 발표판

- 현재 PPT·PDF·대본은 기존 파일명으로 저장했다. 원본 `제목 없는 디자인.pptx`의 청색 세로 띠와 아이콘을 보존해 새 30장에 적용했다.
- 4장 일정표는 팀이 수정할 수 있는 11/12–11/30 단계별 일정안이다. 실명 대신 FoldedVision AI와 Lens·Ring·PCB 담당 역할을 표시한다.
- 개요 → 배경 → 데이터 설명 → 부품별 EDA·전처리·모델링 → 결과 해석 및 활용 → 결론 순서다. 30장은 데이터 출처 부록이다. 20분 대본과 발표자 노트는 같은 순서를 따른다.
- 최신 검증은 `outputs/presentation/template_rebuild_validation.json`, 이전 발표 자료는 `archive/2026-11-23_before_user_template_rebuild.zip`에 있다.
