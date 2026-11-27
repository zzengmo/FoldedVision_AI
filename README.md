# FoldedVision AI — 부품 외관 검사

먼저 볼 곳은 **[부품별 노트북](notebooks/), [최종 발표 자료](outputs/presentation/), 이 README**입니다.
다음 작업자는 [AGENTS.md](AGENTS.md)의 프로젝트 기억과 보존 규칙을 먼저 읽어 주세요.

다른 PC에서 Codex로 이어갈 때는 이 저장소를 복제해서 폴더를 열고, [인수인계 프롬프트](CODEX_PROMPT.txt)의 마지막 줄에 목표를 적어 Codex에 붙여 넣어 주세요. Windows 설치 명령은 아래 노트북 실행 절에 있습니다.

웹은 **입고검사 관리실**입니다. Node.js 22.13 이상에서 `sites/foldedvision-inspection/`의 `npm.cmd ci`, `npm.cmd test`, `npm.cmd run dev`로 실행합니다. 평소에는 루트의 [시작 CMD](Start_FoldedVision.cmd)를 사용합니다. 로컬은 SQLite·사진 파일, 게시 웹은 D1·R2에 기록을 저장하며 서로 자동 동기화하지 않습니다. 실제 Ring 추론에는 보존된 Python 환경과 웹에 연결된 기존 전체+부분 모델 가중치가 필요합니다. [웹 실행 안내](sites/foldedvision-inspection/README.md)

업무 웹에서 LOT 등록, 사진 검사, 담당자 판정·재검, 이력 검색·CSV 내보내기, 품질 분석과 손실 시뮬레이션을 사용합니다. 이전 React 포트폴리오와 Three.js 체험은 `/portfolio.html`에 보존했습니다. Unity 공정 시각화와 웹 업무 발표는 분리합니다.

Unity 공정 시연에서는 외주 부품 투입부터 사전 검사와 갠트리 분류까지 확인할 수 있습니다. Lens는 3D 전시, Ring과 PCB는 저장 결과 재생이며 가상 공정 모드도 제공합니다. [Unity 실행 CMD](Start_FoldedVision_Unity.cmd) · [Unity 프로젝트 안내](unity/My%20project/README.md)

[게시된 웹](https://foldedvision-inspection.wholehaven1026.chatgpt.site)은 기존 본인 전용 접근 설정을 유지합니다. GitHub의 소스와 Sites의 게시 저장소는 별개입니다.

최신 발표 작업은 **[사용자 제공 원본 44장](outputs/presentation/FACT_사용자최신_44장.pptx)**과 **[공통부 수정본 6장](outputs/presentation/FACT_공통부_수정본.pptx)**을 기준으로 이어갑니다. 두 파일은 아직 통합하지 않았습니다. 공통부 수정본은 표지 유지 → 전체 목차 → 목표와 검사 대상 → 일정 → 선정 배경과 필요성 → 사용 기술 순서입니다. [공통부 PDF](outputs/presentation/FACT_공통부_수정본.pdf)도 함께 확인할 수 있습니다. 사용자 원본의 Lens는 7장에서 시작하며, 새 Ring 비교 실험의 95.24% 결과는 원본 PPT에 아직 반영하지 않았습니다.

이전 **[49장 통합 PowerPoint](outputs/presentation/FoldedVision_최종발표.pptx)**는 보관본입니다. 그 파일의 공통 1–6장 → Lens 7–15장 → Ring 16–24장 → PCB 25–39장 → 종합·손실·결론 40–43장 → Unity 44–49장 순서와 [Ring 대본 PDF](outputs/presentation/FoldedVision_Ring_발표대본_김현모.pdf)·[TXT](outputs/presentation/FoldedVision_Ring_발표대본_김현모.txt)를 최신 44장 순서와 혼동하지 않습니다. [Unity 대본 PDF](outputs/presentation/FoldedVision_Unity_발표대본.pdf)·[TXT](outputs/presentation/FoldedVision_Unity_발표대본.txt)는 이전 사용자 45장 판본의 실제 40–45장 기준입니다.

보관된 49장 판본의 15장은 VISION 렌즈 테스트 52장·3,410구역에서 AP 0.419 → 0.808, 정상 구역 오검출률 65.4% → 25.1%, 불량 구역 Recall 95.2%를 제시합니다. 같은 판본의 41–42장 손실 비교는 카메라 커버의 이전 결과와 Ring 결함 유형 정분류율을 대입한 시나리오입니다. Unity는 저장 결과와 가상 경로를 재생합니다.

발표 질문 대비 자료는 [Lens 과거 실험 자료](outputs/presentation/공부자료/Lens_딥러닝_공부자료.pdf), [Ring 기준 CNN과 전이학습](outputs/presentation/공부자료/Ring_딥러닝_공부자료.pdf), [PCB 기준 YOLO와 PCB4 전이학습](outputs/presentation/공부자료/PCB_딥러닝_공부자료.pdf)입니다. 최신 사용자 원본의 Lens 파트는 7–16장입니다. 새 Ring 모델 선정 설명은 [비교 실험 보고서](outputs/ring_model_comparison/2026-11-27/REPORT.md)를 따릅니다. [전체 데이터 출처](DATA_SOURCES.md)

## 2026-11-23 추가 학습

Ring의 결함 유형 분류와 Lens의 구역 분류를 기존 평가 자료로 다시 비교했습니다. Amazon VisA PCB1–3 사진과 원형 금속 가공 부품 MSDD는 별도로 학습했습니다. 다운로드 및 학습 기록, 저장 모델의 재추론 방법, 평가 범위는 [추가 학습 보고서](outputs/quality_upgrade/REPORT.md)에 있습니다.

Windows에서는 [Start_FoldedVision.cmd](Start_FoldedVision.cmd)를 더블클릭한 뒤 부품을 선택하고 **추가 학습**으로 이동하면 실제 테스트 결과와 사례를 볼 수 있습니다. 노트북 02의 마지막 추가 절에서는 각 모델을 재학습하거나 로컬에서 추론할 수 있습니다. 추가 원본 데이터와 가중치는 원본 PC의 `data/external/quality_upgrade/`와 `models/quality_upgrade/`에 보관합니다.

|파일|용도|
|---|---|
|[Ring 기준 노트북](notebooks/ring/01_Ring_CNN_Baseline.ipynb) · [Ring 최종 노트북](notebooks/ring/02_Ring_DeepLearning_Final.ipynb)|Ring 기준·최종 모델, 추가 실험과 저장 모델 추론|
|[Lens 기준 노트북](notebooks/lens/01_Lens_CNN_Baseline.ipynb) · [VISION Lens 개선 실험](notebooks/lens/02_Lens_DeepLearning_Final.ipynb) · [렌즈 YOLO](notebooks/lens/03_Lens_YOLO.ipynb) · [카메라 커버 실험](notebooks/lens/04_CameraCover_YOLO.ipynb)|Lens 팀원의 기준·개선·전이학습 코드와 별도 카메라 커버 실험|
|[PCB 최종 전달본](notebooks/pcb/final/README.md) · [평가 보고서](notebooks/pcb/final/FINAL_REPORT.md)|팀원의 최종 학습·추론 코드, 통합 설정과 저장된 평가. 데이터와 가중치는 원본 PC의 팀 ZIP에 보관|
|[PCB VisA 노트북](notebooks/pcb/PCB_VisA.ipynb) · [PCB YOLO 노트북](notebooks/pcb/PCB_YOLO.ipynb)|기존 팀원의 검출 학습·평가 노트북|
|[AGENTS.md](AGENTS.md)|지켜야 할 파일, 실제 성능, 출처, 실행 방법, 정리 이력|
|[COURSE_ALIGNMENT.md](COURSE_ALIGNMENT.md)|배운 수업과 구현의 연결, 발표 순서|
|[DATA_SOURCES.md](DATA_SOURCES.md)|원본 자료 출처·다운로드·이용 조건|

## 다른 PC에 필요한 자료

Ring 기준·최종 모델, 별도 베어링 최종 모델과 설정 JSON이 저장소에 포함됩니다. 해당 부품 사진을 준비하면 아래 시연 셀에서 추론할 수 있습니다. 원본 데이터, 실행 환경, 이전 실험 백업, 학습 중간 체크포인트는 원본 PC에 보관합니다. 새 PC에서 재학습할 때는 `DATA_SOURCES.md`의 위치에 맞춰 해당 데이터만 복원하세요.

렌즈 노트북은 `notebooks/lens/`를 작업 위치로 열어 실행합니다. 광학 렌즈 CNN·U-Net은 02번, 렌즈 YOLO 전이학습은 03번, 카메라 커버 YOLO는 04번을 참고합니다. 실제 재실행에는 각 실험의 데이터와 가중치가 필요합니다.

PCB는 `notebooks/pcb/final/`에 2026-11-24 팀 전달본을 폴더 구조대로 보관했습니다. 이 폴더를 Python import 경로로 사용하면 `integration.predict_pcb()`가 통합 설정에 지정된 `pcb_yolo_final.pt`를 찾습니다. `inspect_pcb.py`를 CLI로 호출할 때 기본 가중치는 기준 모델인 `best.pt`입니다. 팀원의 검증 환경과 현재 Ring 환경이 다르고 전달본의 PyTorch 요구 버전도 실행 기록과 다르므로, PCB 실행 환경은 별도로 확인해야 합니다. 새 PC에는 팀 ZIP을 같은 위치에 풀어 데이터와 가중치를 복원합니다. [통합 규격](notebooks/pcb/final/TEAM_INTEGRATION.md) · [팀 실행 기록](notebooks/pcb/final/outputs/runtime_versions.json)

## 폴더 안내

```text
FoldedVision_AI/
├─ notebooks/                        부품별 학습 코드 및 저장된 실행 결과
│  ├─ lens/                           팀 Lens 기준·최종
│  ├─ ring/                           내 Ring 기준·최종 및 추가 실험
│  └─ pcb/                            팀 PCB 노트북과 final/ 최종 전달본
├─ AGENTS.md                         프로젝트 기억·보존 규칙
├─ data/                             원본 압축·이미지·정답·출처·전처리 배열
├─ models/                           현재 노트북의 학습 모델
│  ├─ ring_cnn_baseline.keras         Ring 기준 CNN
│  ├─ ring_cnn_final.keras            팀 통합용 Ring 모델
│  └─ bearing_installation/           별도 베어링 실험의 기준·개선·최종 모델
├─ outputs/
│  ├─ FINAL_REPORT.md                 Ring 결과 보고서
│  ├─ integration/                   Ring 팀 통합용 설정·지표·예측
│  ├─ metrics/ · figures/             Ring 평가·설명용 그림
│  ├─ predictions/                   Ring 마스크·열지도 출력
│  ├─ bearing_installation/           베어링 보고서·설정·지표·예측·그림
│  ├─ user_supplied_links/            사용자 링크 조사 기록
│  ├─ presentation/                   최종 PPT, Ring 대본, 시연 영상과 발표 자료
│  └─ cleanup_records/               정리 목록·보존 해시·검증 결과
└─ archive/                           이전 실험과 발표 판본의 복원용 ZIP
```

`.venv/`는 설치된 실행 환경이고 `.vscode/`는 편집기 설정입니다. 둘 다 보존했으며 `.venv/`는 편집기 탐색기에서 숨겼습니다.
과거 미채택 실험의 복원 방법은 원본 PC의 `archive/README.md`에 있습니다.

## 실제 결과

|작업|내부 검증 정확도|최종 평가 정확도|의미|
|---|---:|---:|---|
|VISION Ring 결함 유형 3종|검증 Macro F1로 선정|**80.95% (34/42)**|오염·긁힘·표면 미가공 분류|
|다운로드한 엔진 베어링 설치 상태 16종|**94.81%**|**57.21% (365/638)**|설치 조합 ID 1~16 분류|

두 작업은 자료와 정답이 다릅니다. **94.81%를 Ring 정확도나 베어링 최종 평가 정확도로 쓰면 안 됩니다.**
베어링 기준 CNN의 최종 평가는 9.87%였고 개선 모델은 57.21%입니다. 95% 목표는 달성하지 못했습니다.

Ring은 정상 라벨이 없어 정상/불량 판정을 지원하지 않습니다. 시연 결과는 REVIEW와 추정 결함 유형입니다.
U-Net은 검증 기준 미달로 시연 마스크를 껐으며, Grad-CAM은 분류 근거 열지도입니다.

- [Ring 결과](outputs/FINAL_REPORT.md), [Ring 팀 통합 지표](outputs/integration/ring_metrics.json)
- [베어링 결과](outputs/bearing_installation/REPORT.md), [베어링 최종 평가 지표](outputs/bearing_installation/metrics.json)

## 노트북 실행

프로젝트의 `.venv/Scripts/python.exe`를 커널로 선택합니다. Ring 노트북은 `notebooks/ring/`이나 프로젝트 루트에서 같은 데이터·가중치·결과 경로를 사용합니다. 현재 Python 3.11.9 / TensorFlow 2.15 / CPU 환경입니다.

- **Ring:** 01 기준 코드 → 02 최종 코드의 Ring 부분을 순서대로 실행합니다.
- **베어링만:** 처음 `settings`, `environment`, `io` 셀을 실행한 뒤 마지막 `bearing_*` 절을 실행합니다.
- 기존 모델은 데이터·학습 설정의 서명이 일치하면 재사용합니다. 기본 모드는 full입니다.
- `RING_RUN_MODE=quick`은 2 epoch 기능 점검용이며 quick 폴더를 다시 만듭니다. 성능 발표에 쓰지 않습니다.
- 최종 노트북의 미채택 Ring PART 10~12는 백업 ZIP으로 분리했습니다. 현재 전체 실행에는 포함되지 않습니다.

새 PC에 설치할 때:

```powershell
py -3.11 -m venv .venv
.venv\Scripts\python.exe -m pip install -r requirements-lock.txt
```

수업 폴더와 실습 원본은 변경하지 않았습니다. 데이터는 `data/` 전체를 보존했습니다.

## 저장 모델만으로 시연·팀 통합

|모델|필수 파일|노트북 02에서 실행할 셀 태그|
|---|---|---|
|Ring|`models/ring_cnn_final.keras`, `outputs/integration/ring_model_config.json`|settings → environment → io → preprocessing → inference|
|베어링|`models/bearing_installation/bearing_cnn_final.keras`, `outputs/bearing_installation/model_config.json`|settings → environment → io → bearing_config → bearing_inference|

Ring은 `predict_ring(image)`, 베어링은 `predict_bearing_installation(image)`를 호출합니다.
모델별 입력 크기·정규화가 다르므로 설정 JSON을 그대로 사용해야 합니다.

Gradio 화면은 이어서 `LAUNCH_UI=True`와 `ui` 셀, 또는 `LAUNCH_BEARING_UI=True`와 `bearing_ui` 셀을 실행합니다.
서버는 127.0.0.1, share=False입니다.

PCB·렌즈 통합 시 팀원에게 **학습 모델 + 전처리 규칙 + 클래스 순서 + 테스트 이미지**를 받습니다.
React 포트폴리오에서 세 부품의 저장된 평가 사례를 볼 수 있습니다. 새 사진 검사 기능을 추가하려면 팀 모델과 추론 코드를 Python API에 연결해야 합니다.

## 정리와 보존

2026-11-19에 재생성 가능한 quick 산출물·설치 캐시·테스트 복사본을 정리하고,
과거 full 실험은 원본 PC의 `archive/2026-11-19_before_cleanup.zip`에 모았습니다.
베이스라인 노트북은 변경하지 않았고, 데이터와 현재 모델·최종 평가 결과는 해시로 보존을 확인합니다.
자세한 삭제·보관 내역과 실제 재검증은 원본 PC의 `outputs/cleanup_records/cleanup_result.json`에서 확인하세요.

2026-11-26에는 이전 발표본, 대본, 미리보기, 검토용 캡처를 원본 PC의 `archive/2026-11-26_presentation_drafts.zip`으로 모았습니다. 이동과 보존 내역은 [정리 기록](outputs/cleanup_records/workspace_cleanup_2026-11-26.json)에 있습니다.

## 2026-11-27 Ring 모델 비교 실험

MobileNet 선택 근거를 보완하기 위해 직접 CNN, MobileNetV2(폭 0.5/1.0), ResNet50, EfficientNetB0를 실제 비교했습니다. 전체/부분 사진을 구분한 9조건을 초기값 3개로 반복해 총 27회 학습했습니다. 구현과 실제 출력은 `notebooks/ring/02_Ring_DeepLearning_Final.ipynb` 마지막 절에 있으며 기본 실행은 `off`입니다. 최초 69셀과 이전 모델·결과는 보존했습니다.

검증 결과로 선정한 **MobileNetV2 폭 1.0·전체 사진**의 사전 고정 초기값 42는 기존 테스트 42장에서 **95.24%(40/42), Macro F1 0.9321**입니다. 학습 33장·검증 12장·기존 테스트 42장의 같은 분할을 사용했고, 테스트 점수로 후보나 초기값을 고르지 않았습니다. 이는 정상/불량 검출률이나 새로운 외부 검증 결과가 아닙니다. 기존 92.86% MobileNet 다중 특징 모델과 이번 공통 조건의 모델을 구분합니다.

[실험 설명과 전체 결과](outputs/ring_model_comparison/2026-11-27/REPORT.md) · [3쪽 결과 PDF](outputs/ring_model_comparison/2026-11-27/Ring_모델비교_실험결과.pdf) · [전체 비교 CSV](outputs/ring_model_comparison/2026-11-27/comparison_all.csv) · [선정 근거와 질문 답변](outputs/ring_model_comparison/2026-11-27/모델선정_설명과질문답변.txt)

```powershell
.\.venv\Scripts\python.exe -X utf8 outputs/cleanup_records/ring_model_comparison_2026-11-27/run_notebook.py all
```

새 가중치는 `models/ring_model_comparison/2026-11-27/`, ImageNet 출처·원본 가중치·특징 캐시는 `data/external/ring_model_comparison/2026-11-27/`에 보존합니다. 새 PC에서 실제 재현하려면 이 파일이 필요합니다. 결과 폴더의 `selected_model_config.json`이 새 후보 설정이며, 기존 웹·Unity 추론 연결과 PPT는 변경하지 않았습니다.
