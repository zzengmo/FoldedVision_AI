# FoldedVision AI Factory

외주 부품이 제조에 투입되기 전에 카메라로 외관을 검사하고 통과·격리·재검으로 분기하는 가상 검사 공정입니다. 자화전자 KDT 팀 프로젝트의 공개 데이터 실험을 시연합니다.

## 실행

1. 저장소 루트의 [Start_FoldedVision_Unity.cmd](../../Start_FoldedVision_Unity.cmd)를 실행합니다. Unity Hub에서는 이 폴더를 **Unity 6000.6.9f1**로 열 수 있습니다.
2. [FoldedVisionFactory.unity](Assets/FoldedVision/Scenes/FoldedVisionFactory.unity)를 열고 **Play**를 누릅니다. 에디터의 **Tools → FoldedVision → Open Factory**에서도 열 수 있습니다.
3. **공정 시작**은 Ring과 PCB 연속 재생, **Ring 투입**과 **PCB 투입**은 개별 재생입니다. **Lens 보기**로 광학 모듈과 설비를 봅니다.

| 조작 | 기능 |
|---|---|
| 1 / 2 / 3 / 4 / 5 | 공장 전경 / 검사 근접 / 부품 추적 / 분류 장치 / 자동 투어 |
| 우클릭 드래그 · 휠 | 시점 회전 · 거리 조절 |
| Space | 일시정지 및 계속 |
| 가상 시연 | 가상 판정에 따른 세 가지 경로 재생 |
| 검사 기록 | 현재 모드의 완료 기록 확인 |

URP 17.6.0과 기존 PC 품질 설정으로 렌더링합니다. 에디터의 **Tools → FoldedVision → Build Factory**는 씬이 없을 때 모델·프리팹·소재와 씬을 생성합니다. 기존 생성 씬이 있으면 열립니다. **Rebuild Generated Factory…**는 확인 후 생성물에 덮어씁니다. 샘플 씬은 기존 경로에 있습니다.

## 저장 결과와 가상 시연

| 부품 | 동작 |
|---|---|
| Lens | 렌즈 모듈과 검사 장비 모델링만 제공. PENDING으로 표시하며 재생·가상 판정·검사 건수에서 제외 |
| Ring | VISION Ring 전이학습 테스트 결과 3건을 재생. 결함 유형과 분류 점수를 보여주고 항상 REVIEW로 분기 |
| PCB | 팀 PCB4 테스트 결과 3건을 재생. 사진 판정 기준과 실제 예측 박스 및 기록 추론 시간을 값이 있는 경우 표시 |

가상 시연은 화면에 **공정 시각화 데모 — 가상 검사 결과**로 표시합니다. 가상 모드에서는 PCB의 PASS·NG·REVIEW와 Ring의 REVIEW 경로, 결함 메시 예시를 볼 수 있습니다. 두 모드의 세션 집계는 전환 시 초기화됩니다. 공정 이동과 갠트리의 집기·이송·놓기는 사전에 정의한 키네마틱 경로로 재생합니다. 한 번에 한 부품을 처리하고, 목적지별 마지막 부품 한 개를 버퍼에 남깁니다.

기록 데이터는 [Ring 테스트 예측 CSV](../../outputs/quality_upgrade/vision_ring_transfer_predictions.csv), [팀 PCB4 판정 CSV](../../notebooks/pcb/final/outputs/integration/pcb_predictions.csv), [검출 위치 JSON](../../notebooks/pcb/final/outputs/integration/pcb_detections.json)에서 가져왔습니다. [Tools/export_replay.py](Tools/export_replay.py)는 이전 PC의 절대 경로를 사용하지 않고 실제 저장 이미지와 좌표를 프로젝트 상대 경로의 재생 JSON으로 변환합니다. 이 시연은 저장된 추론 결과를 사용합니다. [최종 발표자료](../../outputs/presentation/FoldedVision_최종발표.pptx)의 평가 수치는 공개 데이터에 대한 결과입니다. 전체 자료의 출처는 [DATA_SOURCES.md](../../DATA_SOURCES.md)를 참고하세요.

## 검증과 관리

**Tools → FoldedVision → Verify Play Mode and Capture**를 실행하면 저장 Ring·PCB 결과, 데모 경로, 배치 및 집기 상태, UI 조작을 확인하고 1920×1080 캡처를 `Presentation/`에 저장합니다. Play Mode 측정 조건과 통과 항목은 [verification.txt](Presentation/verification.txt)를 참고하세요.

발표용 [공정 시연 영상](Presentation/FoldedVision_Factory_Demo.mp4)은 Unity Play Mode의 338프레임을 1280×720, 24fps로 인코딩했습니다. 공장 전경 → Lens 광학 모듈 → Ring 촬영과 재검 → PCB 판정과 갠트리 이송 순서입니다.

영상을 다시 만들 때는 **Tools → FoldedVision → Capture Presentation Frames**를 실행한 뒤 프로젝트의 `Tools/encode_preview.py`를 팀 Python 환경으로 실행합니다. 영상 인코딩에만 OpenCV가 필요합니다.

셀의 모델링 소스는 `Assets/FoldedVision/Editor/`, 재생과 대시보드는 `Assets/FoldedVision/Scripts/`, 생성 메시·재질·프리팹은 `Assets/FoldedVision/Generated/`에 있습니다.
