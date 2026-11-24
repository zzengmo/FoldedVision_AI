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

## 2026-11-23 생성형 AI 표지 리디자인

- 사용자 요청으로 `outputs/presentation/FoldedVision_최종발표.pptx`의 표지 한 장을 다시 디자인했다. 현재 실제 PPT는 총 1장이며, 위의 과거 30장 발표 기록과 구분한다.
- OpenAI Imagegen으로 생성한 렌즈·금속 링·PCB 콘셉트 이미지는 `outputs/presentation/자료/FoldedVision_AI_검사부품_생성이미지.png`에 보존했다. 실제 자화전자 제품 또는 생산라인 촬영 사진으로 설명하지 않는다. 생성 사실은 이미지 대체 텍스트와 발표자 노트에도 기재했다.
- 제목과 부제, 팀명, 날짜는 PowerPoint에서 편집 가능한 텍스트다. 기존 16:9 크기를 유지했고, PowerPoint에서 렌더링한 최신 미리보기는 `outputs/presentation/slide_previews/표지.png`다.
- 수정 전 PPT와 미리보기는 `archive/2026-11-23_before_cover_redesign/`에 보존했다. 생성 프롬프트, 원본·결과 해시와 확인 내역은 `outputs/cleanup_records/presentation_history/cover_redesign_2026-11-23.json`에 있다.

## 2026-11-23 발표 목차 추가

- 사용자가 "표지"가 아니라 "목차" 추가를 뜻했다고 정정했다. 승인된 생성형 AI 표지는 그대로 두고, 같은 네이비·시안 디자인의 목차 한 장만 추가했다. 현재 PPT는 표지와 목차, 총 2장이다. 채팅에서 제안한 공통 도입부 10장 전체를 제작한 상태가 아니다.
- 목차는 프로젝트 배경 → 데이터와 검사 설계 → Lens·Ring·PCB 부품별 실험 → 결과와 시연 순서다. 목차 텍스트와 발표자 노트는 PowerPoint에서 편집 가능하다.
- 표지의 추가 전후 PowerPoint 렌더 SHA-256 일치를 확인했다. 목차 미리보기는 `outputs/presentation/slide_previews/slide-02.png`, 변경 전 PPT는 `archive/2026-11-23_before_contents/`에 있다. 확인 기록은 `outputs/cleanup_records/presentation_history/contents_slide_2026-11-23.json`에 있다.
- 후속 요청으로 목차를 각 제목 아래 세부 목록이 오는 구조로 변경했다. 01·02는 위쪽, 03·04는 아래쪽이며 편집 가능한 기본 글머리표 목록 4개, 항목 12개다. 표지는 그대로다. 변경 전 파일은 `archive/2026-11-23_before_contents_list/`, 확인 기록은 `outputs/cleanup_records/presentation_history/contents_list_2026-11-23.json`에 보존했다.

## 2026-11-23 사용자 사진을 반영한 공통 도입부

- 현재 실제 최종 PPT는 `outputs/presentation/FoldedVision_최종발표.pptx`의 **11장**이다. 승인된 표지·목차 2장은 그대로 두고 3~11장을 추가했다. 각 장을 PowerPoint에서 렌더링해 확인했고 앞의 2장은 수정 전후 렌더 해시가 같다.
- 순서: 표지 → 목차 → 프로젝트 개요 → 주제 선정 배경 → 주제 선정 이유 → 문제 정의 → 검사 대상과 부품별 과제 → 데이터와 라벨 구성 → 개발과 평가 설계 → 통합 웹과 3D 공정 시연 → 검증 범위와 부품별 실험. 개인별 Lens·Ring·PCB 상세 실험은 아직 추가하지 않았다.
- 선정 취지는 사용자가 직접 설명했다. 폴디드 액추에이터 관련 부품의 외주 공급 흐름에서 착안해, 외주와 제조 사이에 외관 불량 탐지를 두자는 아이디어다. 회사의 실제 공급 방식은 사용자 설명을 근거로 기록했고, 실제 검사 체계의 부재나 현장 개선 효과를 확인했다고 주장하지 않는다.
- 사용자 제공 `자화전자_폴디드줌.jpg`, `카메라_액추에이터_구조_참고.jpg`, `품질경영_프로세스_참고.png`를 넣었다. 구조도는 액추에이터 구성 참고도이며 특정 폴디드 줌 제품의 실제 BOM이나 공개 Lens·Ring·PCB 데이터와 일대일 대응한다고 설명하지 않는다. 품질 프로세스 원본의 제조 후 검사와 제안하는 제조 전 검사를 구분한다.
- 8장의 데이터 표, 3·6·9장의 도식과 모든 본문은 편집 가능하다. 발표자 노트에 설명과 자료의 출처·범위를 넣었다. 웹은 저장된 사례 재생이며 실시간 추론 연결은 후속 과제다. 부품별 지표 단위와 데이터 출처의 확인 범위를 보존한다.
- 이전 2장 판본은 `archive/2026-11-23_before_common_intro/`에 보존했다. 최신 미리보기는 `outputs/presentation/slide_previews/slide-01.png`~`slide-11.png`, 검증 및 발표 노트 기록은 `outputs/cleanup_records/presentation_history/common_intro_2026-11-23.json`에 있다.

## 2026-11-23 네모 도식 대신 생성형 AI 시각자료 적용

- 사용자는 네모 상자를 화살표로 연결한 도식이 AI가 만든 것처럼 보인다고 지적했고, 생성형 AI로 보기 좋게 바꾸도록 요청했다. 이후에도 반복되는 네모 카드나 상자 도식 대신 사진 중심 구성과 간결한 편집 가능 텍스트를 우선한다.
- 전체는 11장 그대로이며 3장(개요), 6장(문제 정의), 9장(개발·평가)만 변경했다. 각각 부품 검사, 제조 전 검사, 모델 개발·검토 콘셉트 이미지를 생성해 넣었다. 해당 장에 있던 채워진 상자와 화살표 도식은 제거했다. 8장의 실제 데이터 표는 그대로다.
- 생성 이미지는 `outputs/presentation/자료/생성이미지/`의 PNG 세 개다. 실제 자화전자 설비나 프로젝트 장비, 모델 예측 또는 평가 결과 사진으로 설명하지 않는다. 이미지 대체 텍스트와 발표자 노트에 생성 사실을 기록했다. 특히 9장의 화면과 그래프는 개념 이미지의 일부이며 실제 평가 데이터가 아니다.
- 표지·목차를 포함한 나머지 8장은 전후 렌더 SHA-256이 같다. 새 장의 제목과 설명은 PowerPoint에서 수정할 수 있다. 이전 판본은 `archive/2026-11-23_before_generated_visuals/`에 보존했다.
- 생성 프롬프트는 `outputs/cleanup_records/presentation_history/generated_visual_prompts_2026-11-23.json`, 결과 확인은 `generated_visual_redesign_2026-11-23.json`에 있다. 최신 3·6·9장 미리보기도 같은 파일명으로 갱신했다.

## 2026-11-23 본문 흰색 통일과 데이터 표 개선

- 사용자는 6·11장의 검은 배경이 본문에서 튄다고 지적했다. **1장 표지만 기존 어두운 표지를 유지하고, 2~11장은 모두 같은 흰색 계열 F8FAFC 배경으로 통일한다.** 목차도 색만 맞췄으며 제목 아래 세부 목록과 배치는 유지했다. 이후 임의로 검은 본문이나 섹션 장을 넣지 않는다.
- 6장은 생성 이미지의 밝은 검사실 판본 `outputs/presentation/자료/생성이미지/AI_제조전검사_화이트_v2.png`와 편집 가능한 설명으로 교체했다. 실제 장비·생산라인의 사진으로 설명하지 않는다. 이전 어두운 생성 이미지는 보존했다.
- 8장은 편집 가능한 4행·6열 표다. 학습·검증·테스트를 각각 정렬하고 테스트 수치를 청록색으로 강조했다. 두꺼운 채움 헤더 대신 여백과 얇은 가로 구분선을 사용했다. 기존 표에서 값을 읽어 옮겼고 Lens 50/16/52, Ring 33/12/42, PCB4 120/40/40 및 자료·평가 지표를 보존했다.
- 11장은 기존 내용과 발표 노트를 유지하면서 흰 배경, 남색 제목, 회청색 본문으로 정리했다. 나머지 7장은 전후 렌더 해시가 같다. 전체는 11장이다.
- 이전 판본은 `archive/2026-11-23_before_white_theme/`에 보존했다. 생성 프롬프트는 `outputs/cleanup_records/presentation_history/white_preinspection_prompt_2026-11-23.json`, 최종 확인 기록은 `white_theme_table_2026-11-23.json`에 있다. 2·6·8·11장 미리보기를 갱신했다.

## 2026-11-23 전체 시각 구성 보완

- 사용자가 전체적으로 심심하므로 풍성하게 다듬어 달라고 요청했다. 내용을 늘리거나 같은 좌우 배치를 반복하는 대신, 큰 부품 이미지·제품 확대·원본과 세부 확대·가로형 검사 장면·실제 예측 예시·웹 화면 묶음으로 장별 구성을 다르게 했다. 전체는 11장이고 표지와 8장 표는 전후 렌더 해시가 같다. 2~11장의 흰색 배경 원칙을 유지했다.
- 3장은 생성형 AI의 투명 배경 부품 클러스터, 4장은 사용자 제공 제품 사진의 확대와 구조 참고도, 5장은 품질 프로세스 원본과 외주·제조 구간 확대, 6장은 넓은 검사 장면, 7장은 실제 Lens 위치 예시·Ring Grad-CAM·PCB 예측 박스로 구성했다. 9장은 실험 이미지와 평가 역할, 10장은 실제 웹의 라인 전체·촬영부·분류부 화면을 묶었다. 11장은 검증 범위를 요약하고 세 부품 이미지로 개인 발표를 연결한다.
- 새 투명 PNG는 `outputs/presentation/자료/생성이미지/AI_부품클러스터_투명.png`, `AI_부품별발표_투명.png`다. 실제 제품·학습 데이터로 설명하지 않는다. 7장의 예시는 기존 웹 evidence 자산에 있는 실제 저장 평가 기록이며 생성 이미지가 아니다. Ring Grad-CAM은 결함 마스크가 아니다.
- 사진 확대는 편집 가능한 PowerPoint 이미지 자르기를 사용했고 원본 파일은 변경하지 않았다. 표지, 데이터 표와 숫자, 기본 학습 코드와 모델은 보존했다. 이전 판본은 `archive/2026-11-23_before_rich_design/`에 있다.
- 전 장을 PowerPoint에서 렌더링해 검토했다. 글자 잘림, 10개 본문 배경, 11개 발표 노트, 네이티브 데이터 표와 내부 파일 연결을 확인했다. 최종 기록은 `outputs/cleanup_records/presentation_history/rich_design_2026-11-23.json`, 생성 프롬프트는 `rich_design_prompts_2026-11-23.json`이다.

## 2026-11-23 GitHub 저장 시 확인한 최신 상태

- GitHub 저장 요청 시 실제 로컬 PPT를 확인하니 웹·3D 시연 장이 빠진 **공통부 10장**이었다. 이 최신 사용자 편집 파일을 변경 없이 보존했다. 현재 10장은 검증 범위와 부품별 실험이며, 위의 11장 기록은 이전 판본 이력이다.
- 웹·3D 시연은 개인별 Lens·Ring·PCB 실험과 종합 결과 뒤에 배치하는 흐름으로 논의했다. 아직 개인 파트와 후반 시연을 붙인 상태는 아니다. 기존 웹 시연 화면은 `outputs/presentation/slide_previews/slide-web-demo.png`에 참고용으로 남겼고 공통부에 다시 넣지 않는다.
- 미리보기를 읽기 전용 PPT 복사본에서 `slide-01.png`~`slide-10.png`로 갱신했다. 번호가 맞지 않던 이전 `slide-11.png`와 갱신 전 미리보기는 `archive/2026-11-23_before_github_save/`에 보존했다. PPT 원본 SHA-256은 갱신 전후 동일하다.
- 현재 파일의 슬라이드 목록과 해시는 `outputs/cleanup_records/presentation_history/github_save_snapshot_2026-11-23.json`에 있다. README와 CODEX_PROMPT는 10장 판본과 후반 시연 계획에 맞췄다. 원본 데이터·모델·실행 캐시·로컬 백업의 기존 Git 제외 규칙은 유지한다.

## 2026-11-23 웹 디자인과 자동 공정

- 사용자가 웹 전체 디자인과 3D 공정 품질 개선을 요청했다. 웹을 흰색·남색·청록색으로 바꾸고 기존 발표의 AI 생성 부품·검사 장면을 `sites/foldedvision-inspection/public/visuals/`로 복사했다. 실제 평가 사진과 구분해 표기한다. PPT는 변경하지 않았다.
- 3D는 금속 컨베이어·광학 카메라·조명·렌즈/링/PCB 형상·분류 갠트리·트레이를 새로 구성했다. 네 저장 사례를 자동 반복하며 일시정지, 배속, 초기화, 직접 분류를 지원한다. 진행 시계는 `src/factoryTimeline.mjs`에 있고 `npm.cmd test`로 검증한다.
- 시연은 저장 결과 재생이다. 웹 실시간 추론·실제 설비 제어로 설명하지 않는다. 기존 평가 JSON과 원본 모델·데이터는 보존했다. 자세한 사용법과 시각 검증 한계는 웹 README에 있다.

## 2026-11-23 다른 PC 인수인계

- 최신 상태와 새 PC 실행, 웹 파일별 역할, 네 자동 시나리오, 검증 결과, 남은 시각 검수, 게시 정보는 `CODEX_PROMPT.txt`에 정리했다. 웹 작업만 할 때 Python이나 대용량 데이터 복원은 필요 없다. 원본 데이터·가중치·백업은 기존 제외 규칙과 보존 원칙을 유지한다.
- 게시 성공 주소는 https://foldedvision-inspection.wholehaven1026.chatgpt.site 이며 기존 본인 전용 접근을 유지했다. `.openai/hosting.json`의 project_id는 재사용한다. Sites 소스 커밋 `b2ef8e76f9d85a4dbc552d827ef1cf33aa5952f6`은 GitHub 커밋과 별개다. 로컬 포장 프로세스 오류 후 서버 빌드로 게시에 성공했다.
- 상태 전환 테스트 4개·빌드·평가 자산 경로 검증은 통과했다. 브라우저 연결 불가로 최신 웹의 데스크톱/모바일·WebGL 시각 검수는 미완료다. 다음 웹 작업에서는 이 부분을 먼저 확인한다. 이전 `공정캡처/`와 PPT의 웹 미리보기는 이번 밝은 웹 디자인을 캡처한 이미지가 아니다.

## 2026-11-24 팀 PCB 최종 전달본

- 사용자가 제공한 `pcb.zip`의 내부 폴더를 `notebooks/pcb/final/`로 풀었다. 같은 폴더의 이전 `PCB_VisA.ipynb`, `PCB_YOLO.ipynb`는 보존한다. `final/` 아래에는 학습·평가 `pcb4_transfer.py`, 검사 `inspect_pcb.py`, 호출 규격 `integration.py`, 기준·최종 가중치, 데이터와 실행 결과가 있다.
- ZIP SHA-256은 `c72628717554c41110709a463038d1419136e5ecfca3a018056685aa7d6aff76`이다. 추출 파일 11,187개(618,549,213바이트)의 크기와 CRC를 모두 대조했고, 최종 가중치 SHA-256이 팀 설정과 일치했다. 데이터 이미지·라벨 짝, PCB4 예측 40건과 혼동행렬, 30에포크 기록도 확인했다.
- 최종 추론은 `integration.predict_pcb()`가 `outputs/integration/pcb_model_config.json`의 `models/pcb_yolo_final.pt`와 검증으로 고른 임계값 0.102958612를 사용한다. `inspect_pcb.py`의 CLI 기본 가중치는 `models/best.pt`다. 박스는 원본 이미지 픽셀 좌표다. 점수는 보정된 불량 확률로 해석하지 않는다.
- PCB4 기존 테스트 40장(정상 20, 불량 20)의 저장 결과는 이미지 정확도 92.50%, 이미지 F1 93.02%, TP 20·TN 17·FP 3·FN 0이다. 박스 mAP50 83.89%, mAP50–95 58.90%다. 원본 PCB 테스트의 박스 Recall은 기준 대비 88.47%에서 76.22%로 낮아졌다. PCB4 테스트에서 모든 불량을 잡았다는 결과는 그 데이터 범위에 적용한다. PCB1–3 사진 분류는 별도 실험이다.
- `final/data/`, `final/models/`, `final/outputs/integration/examples/`는 로컬 보존 대상이며 Git 제외 경로다. 팀의 `requirements.txt`와 `outputs/runtime_versions.json`의 PyTorch 버전이 다르므로 별도 실행 환경을 확인해야 한다. 현재 TF 환경에서 재추론·재학습을 실행하지 않았으며 웹·PPT는 변경하지 않았다. 팀 보고서에 언급된 별도 HTTP·UI 검증 JSON은 ZIP에 포함되지 않았다.

## 2026-11-24 Ring·PCB 및 일정 발표 반영 이력

- 현재 발표는 `outputs/presentation/FoldedVision_최종발표.pptx` 및 같은 이름의 PDF, 총 34장이다. 공통부 1–11장, Lens 제목 자리 12장, Ring 13–21장, PCB 22–31장이다. 두 담당 파트는 데이터 소개·EDA·전처리·모델 구성·1차 오류·2차 학습·학습 곡선과 혼동행렬·추론 비교·결론 순서로 구성했다.
- 4장 가로 일정표는 주제 선정 11/12–18, 데이터 수집 11/19–22, 전처리 11/23–24, 모델 학습 11/25–27, 최종 모델링 11/28–30으로 배치했다. 주제 선정과 수집의 종료일은 사용자가 확인했으며, 나머지 날짜는 요청에 따라 배분한 계획이다. 날짜와 막대는 PowerPoint 도형으로 편집할 수 있다.
- Ring은 VISION Ring 기준 RGB CNN과 전체+부분 전이학습을 같은 테스트 42장으로 비교했다. PCB는 팀 최종 전달본의 기준 YOLO 추론과 PCB4 전이학습을 구분했다. 실제 저장 예측과 라벨 근거를 쓰고 설명은 발표자 노트에 담았다.
- 19장은 Ring 2차 분류기 16에포크 학습·검증 정확도와 손실, 같은 테스트 42장의 결함 유형 혼동행렬이다. 그래프는 `outputs/quality_upgrade/vision_ring_global_tiles_48_history.json`, 행렬은 `outputs/integration/ring_predictions.csv`와 `outputs/quality_upgrade/vision_ring_transfer_predictions.csv`에서 가져왔다. 검증 손실 최저는 9에포크이며 가중치를 복원했다. 후보 선택은 검증 Macro F1로 했다.
- 28장은 PCB YOLO 30에포크 혼합 검증 박스 mAP·학습/검증 박스 손실, 별도 PCB4 테스트 40장의 사진 단위 혼동행렬이다. 팀 전달본의 `runs/pcb4_transfer/results.csv`, `outputs/integration/baseline_image_comparison.json`, `outputs/integration/pcb_predictions.csv`가 출처다.
- PCB 뒤 32–34장은 부품별 종합 결과, 오류 사례 분석, 결론과 한계다. Ring의 스크래치→오염 예측은 `000086.jpg`, PCB4의 정상→NG 예측은 `good_005.jpg`를 사용했다. Lens 최종 평가 확정 후 12장과 종합표의 Lens 행에 반영한다. 웹·3D 공정 시연은 이번 발표 범위에서 제외했다.

## 2026-11-24 Unity 공정 시각화

- 기존 Unity 프로젝트 `unity/My project/`와 샘플 씬을 보존했다. Unity 6000.6.9f1, URP 17.6.0의 새 `Assets/FoldedVision/Scenes/FoldedVisionFactory.unity`가 시연 씬이다. 루트 `Start_FoldedVision_Unity.cmd`로 열고 Play를 누른다.
- Lens는 광학 모듈과 검사기 모델링만 제공한다. PENDING, 추론 연결 없음, 분기·세션 집계 제외다. Ring의 유형 점수는 정상·불량 확률이 아니므로 저장 재생에서 REVIEW, PCB는 팀 PCB4 저장 판정과 위치 좌표를 사용한다. 두 부품 각 3건을 `Assets/FoldedVision/Resources/FoldedVision/replay.json`에 포장했다.
- `Assets/FoldedVision/Editor/`는 메시·소재·프리팹 및 씬 생성과 Play Mode 검증, `Scripts/`는 공정 상태·로봇·대시보드다. 실제 자료를 갱신할 때는 `Tools/export_replay.py`를 사용한다. 1080p 캡처와 검증 기록은 `Presentation/`에 있다.
- Play Mode에서 Lens 모델 전시, Ring REVIEW, PCB OK·NG, PCB 예측 박스, 갠트리 집기·놓기, 가상 모드 세 경로 및 대시보드 기능을 검증했다. `Presentation/FoldedVision_Factory_Demo.mp4`는 720p, 24fps, 약 14초의 Unity 렌더 영상이다.

## 2026-11-24 카메라 커버 최종 결과 및 42장 발표본

- 전달받은 `notebooks/lens/04_CameraCover_YOLO.ipynb`를 원본 해시 그대로 보존했다. 초기 VISION Lens 구역·분할과 최종 3CAD 카메라 커버 사진 판정은 대상과 평가 단위가 다르다.
- 3CAD 커버 사진 2,230장(정상 1,153, 불량 1,077), 학습/검증/테스트 1,329/453/448장. CPU YOLO26n 40에포크. 검증 453장으로 OK 상한 0.0038509, NG 하한 0.0206086을 정했다.
- 테스트 448장의 사진 F1 90.58%, 자동 NG Recall 93.95%, 정상 오검출률 12.45%. 정답별 [OK, REVIEW, NG]는 정상 [115, 89, 29], 불량 [4, 9, 202]. 박스 mAP50 69.03%, mAP50–95 42.83%. 발표에는 노트북 저장 로그와 출력 사진을 썼다.
- 이 판본의 PPT/PDF는 42장이었다. 공통 1–11장, Lens 12–20장, Ring 21–29장, PCB 30–39장, 종합 40–42장. 20분 대본은 `outputs/presentation/FoldedVision_최종발표_대본.txt`. 공정 시연은 별도 Unity 프로젝트에서 실행하며 현재 발표 범위에는 포함하지 않았다.

## 2026-11-24 손실 시나리오와 43장 발표본

- 42장에 사전 검사 손실 차이를 추가했고 결론은 43장이다. 연 3,000만 개는 2026-06-01 알파경제의 카메라 액추에이터 CAPA 보도를 참고해 부품별 투입량 가정으로 사용했다. 불량률 2.3%는 사용자 제공 가정이며 공식 전국 평균 원자료는 확인하지 못했다. 건당 1,000원은 놓친 불량의 후공정 추가 손실을 보여주는 예시 단가다. [CAPA 보도](https://kr.investing.com/news/stock-market-news/article-1966473)
- 부품별 독립 계산에서 미도입 불량 유입은 각각 690,000개다. 자동 NG만 분리하고 공개 테스트 검출률을 그대로 적용하면 카메라 커버 202/215 → 648,279개 차단·41,721개 잔존, PCB4 20/20 → 690,000개 차단·0개 잔존 가정이다. Ring은 유형 정확도 39/42와 이진 검출률을 구분해 적용 후 수치와 비용을 산정하지 않았다. 부품별 수치는 합산하지 않으며 재검·오검출·운영비를 제외한 조건부 비용 차이다.

## 2026-11-24 손익분기점과 44장 발표본

- 43장에 사전 검사 도입 손익분기점을 추가했다. 42장 가정 아래 연간 검사 총비용이 카메라 커버 648,279,000원(검사당 약 21.61원), PCB4 690,000,000원(검사당 23.00원)과 같으면 손익분기다. 연간 환산 설비비·운영비·재검·오분리 비용을 총비용에 포함한다. Ring은 이진 검출률 근거가 있어야 산정한다.
- 25,500원은 사용자 제공 액추에이터 판매가 가정이다. 690,000개와 1:1로 환산한 175.95억 원은 규모 참고값이다. 단위 판매가와 실제 후공정 손실 차이, 순이익을 구분한다. 결론은 44장, PPT/PDF 및 20분 대본을 갱신했다.

## 2026-11-24 담당자별 발표 질문 대비

- `outputs/presentation/공부자료/`의 기존 파일명으로 Lens 9쪽, Ring 8쪽, PCB 8쪽 PDF를 갱신했다. 실제 학습 설정과 설계 이유, 저장 곡선·오류 사례, 계산 연습, 답변과 데이터 링크를 담았다.
- Lens는 초기 VISION 광학 렌즈의 구역·U-Net 실험과 최종 3CAD 카메라 커버의 사진·박스 평가를 구분했다. Ring은 동일 테스트 42장으로 기준·전이학습을 비교하고, PCB는 팀 최종 전달본의 40장 사진 평가와 원본·PCB4 박스 평가를 구분했다.
