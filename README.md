# FoldedVision AI — 부품 외관 검사

먼저 볼 곳은 **[부품별 노트북](notebooks/), [공통 발표 자료](outputs/presentation/), 이 README**입니다.
다음 작업자는 [AGENTS.md](AGENTS.md)의 프로젝트 기억과 보존 규칙을 먼저 읽어 주세요.

다른 PC에서 Codex로 이어갈 때는 이 저장소를 복제해서 폴더를 열고, [인수인계 프롬프트](CODEX_PROMPT.txt)의 마지막 줄에 목표를 적어 Codex에 붙여 넣어 주세요. Windows 설치 명령은 아래 노트북 실행 절에 있습니다.

React 포트폴리오는 부품별 평가 사례, 모델 비교, 개발 과정, 3D 검사 게임을 제공합니다. [웹 실행 안내](sites/foldedvision-inspection/README.md)

최종 발표는 [PowerPoint](outputs/presentation/FoldedVision_최종발표.pptx)와 [표지 미리보기](outputs/presentation/slide_previews/표지.png)를 사용합니다. 현재 표지 한 장에는 외주 부품을 제조에 투입하기 전 외관 결함을 확인한다는 주제를 담았습니다. 이전 [검토 기록](outputs/presentation/REVIEW_NOTES.md)과 [발표 대본 기록](outputs/presentation/FoldedVision_공통발표_대본.txt)은 참고용입니다. 실제 시연 화면은 `outputs/presentation/공정캡처/`에 있습니다.

모델 구조와 노트북 읽는 순서는 [Lens 공부자료](outputs/presentation/공부자료/Lens_딥러닝_공부자료.pdf), [Ring 공부자료](outputs/presentation/공부자료/Ring_딥러닝_공부자료.pdf), [PCB 공부자료](outputs/presentation/공부자료/PCB_딥러닝_공부자료.pdf)로 따로 정리했습니다. 세 자료에 데이터 출처와 실제 이용 범위 부록을 넣었습니다. [전체 데이터 출처](DATA_SOURCES.md)

## 2026-11-23 추가 학습

Ring의 결함 유형 분류와 Lens의 구역 분류를 기존 평가 자료로 다시 비교했습니다. Amazon VisA PCB1–3 사진과 원형 금속 가공 부품 MSDD는 별도로 학습했습니다. 다운로드 및 학습 기록, 저장 모델의 재추론 방법, 평가 범위는 [추가 학습 보고서](outputs/quality_upgrade/REPORT.md)에 있습니다.

Windows에서는 [Start_FoldedVision.cmd](Start_FoldedVision.cmd)를 더블클릭한 뒤 부품을 선택하고 **추가 학습**으로 이동하면 실제 테스트 결과와 사례를 볼 수 있습니다. 노트북 02의 마지막 추가 절에서는 각 모델을 재학습하거나 로컬에서 추론할 수 있습니다. 추가 원본 데이터와 가중치는 원본 PC의 `data/external/quality_upgrade/`와 `models/quality_upgrade/`에 보관합니다.

|파일|용도|
|---|---|
|[Ring 기준 노트북](notebooks/ring/01_Ring_CNN_Baseline.ipynb) · [Ring 최종 노트북](notebooks/ring/02_Ring_DeepLearning_Final.ipynb)|Ring 기준·최종 모델, 추가 실험과 저장 모델 추론|
|[Lens 기준 노트북](notebooks/lens/01_Lens_CNN_Baseline.ipynb) · [Lens 최종 노트북](notebooks/lens/02_Lens_DeepLearning_Final.ipynb)|팀원의 학습 코드와 저장된 실행 결과|
|[PCB VisA 노트북](notebooks/pcb/PCB_VisA.ipynb) · [PCB YOLO 노트북](notebooks/pcb/PCB_YOLO.ipynb)|팀원의 검출 학습·평가 기록|
|[AGENTS.md](AGENTS.md)|지켜야 할 파일, 실제 성능, 출처, 실행 방법, 정리 이력|
|[COURSE_ALIGNMENT.md](COURSE_ALIGNMENT.md)|배운 수업과 구현의 연결, 발표 순서|
|[DATA_SOURCES.md](DATA_SOURCES.md)|원본 자료 출처·다운로드·이용 조건|

## 다른 PC에 필요한 자료

Ring 기준·최종 모델, 별도 베어링 최종 모델과 설정 JSON이 저장소에 포함됩니다. 해당 부품 사진을 준비하면 아래 시연 셀에서 추론할 수 있습니다. 원본 데이터, 실행 환경, 이전 실험 백업, 학습 중간 체크포인트는 원본 PC에 보관합니다. 새 PC에서 재학습할 때는 `DATA_SOURCES.md`의 위치에 맞춰 해당 데이터만 복원하세요.

렌즈 노트북은 `notebooks/lens/`를 작업 위치로 열어 실행합니다. 팀 CNN과 U-Net 시연에는 팀원의 가중치, 통합 설정·지표·예측 파일과 샘플이 필요합니다. 기존 실행 결과는 팀 렌즈 최종 노트북 하단에 있습니다. `notebooks/pcb/`에는 팀이 전달한 PCB 노트북을 보존했습니다. 같은 PCB4 성능을 재현하려면 팀의 원래 `jahwa` 실행 환경, 가중치와 실행 스크립트가 필요합니다.

## 폴더 안내

```text
FoldedVision_AI/
├─ notebooks/                        부품별 학습 코드 및 저장된 실행 결과
│  ├─ lens/                           팀 Lens 기준·최종
│  ├─ ring/                           내 Ring 기준·최종 및 추가 실험
│  └─ pcb/                            팀 PCB VisA·YOLO
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
│  ├─ presentation/                   공통 발표, 공부자료, 그림과 웹 캡처
│  └─ cleanup_records/               정리 목록·보존 해시·검증 결과
└─ archive/                           이전 실험을 모은 복원용 ZIP
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
