# FoldedVision 입고검사 관리실

입고 LOT, 검사 사진, AI 제안, 담당자 최종 판정, 재검 이력과 손실 시나리오를 관리합니다. 기존 포트폴리오와 Three.js 체험은 `/portfolio.html`에 보존했으며, Unity 발표와 업무 화면은 분리했습니다.

## 빠른 실행

프로젝트 루트의 `Start_FoldedVision.cmd`를 실행합니다. Node.js 22.13 이상과 npm이 필요합니다. 검증 환경은 Node.js 26.13.0입니다.

```powershell
cd sites/foldedvision-inspection
npm.cmd ci
npm.cmd test
npm.cmd run build
npm.cmd start
```

`http://127.0.0.1:4173`에서 엽니다. 코드 편집 시 `npm.cmd run dev`를 실행하면 프런트엔드 5173, 로컬 API 8788이 함께 시작됩니다.

## 업무 기능

- 업무 현황: 오늘 등록, 판정·재검 대기, 확정 불량, 판정 완료와 14일 추이.
- 입고 LOT: 공급사·품번·입고일·부품·수량 등록, LOT별 검사 이력과 진행 조회.
- 검사: 부품 1개의 사진 1~5장 업로드. JPG·PNG·WebP, 장당 8MB·전체 20MB.
- 판정: AI 제안과 담당자 확정을 분리. 확정 결함명, 사유, 처리자, 시간과 변경 이력 저장. 동시 수정은 기록 버전으로 충돌을 알림.
- 재검·이력: 검색, 부품·판정·기간 필터, 사진 확대·원본 내려받기, 검사 기록 인쇄, 엑셀용 CSV 내보내기.
- 품질 분석: 담당자 확정건을 기준으로 공급사·부품·결함 유형 집계.
- 손실 계산: 3종 합산·건당 13,000원·25 ppm 기본 가정, 입력값 변경·계산표 내보내기·시나리오 저장.
- 사용자 권한: 관리자·검사자·조회자. 조회자의 등록·판정 요청은 서버에서도 차단.

## 저장과 인증

로컬은 이 PC에서만 접속하는 작업공간입니다. 로컬 관리자 계정으로 실행하며 서버는 127.0.0.1에 바인딩합니다. 외부에 그대로 노출하지 않습니다.

- 데이터베이스: `.runtime/operations.sqlite` (SQLite WAL).
- 업로드 원본: `.runtime/uploads/`.
- 생성 파일: `.runtime/client/`, `dist/`.
- 검사 기록은 브라우저 localStorage가 아닌 서버에 저장합니다. localStorage에는 선택한 작업공간 같은 화면 설정만 저장합니다.
- 업무 데이터와 예시 작업공간은 DB의 scope로 분리합니다. 예시 자료는 사용자가 ‘평가 사례로 체험’을 눌렀을 때만 준비합니다.
- 실제 운영 데이터는 Git·Sites 소스 아카이브에 포함하지 않습니다. 로컬 백업은 서버를 종료한 다음 SQLite 파일과 업로드 폴더를 함께 보관합니다.

게시 사이트는 기존 본인 전용 접근을 유지합니다. Sites의 ChatGPT 로그인을 사용하고 서버에서 계정 ID와 역할을 검사합니다. D1(`DB`)에 기록, R2(`BUCKET`)에 사진을 저장합니다. 로컬과 게시 사이트의 DB는 서로 다르며 자동 동기화하지 않습니다. 배포 버전과 DB는 별개이며 마이그레이션 SQL과 Drizzle metadata를 `drizzle/`에 보존합니다.

## 실제 모델 연결 범위

로컬 실행은 프로젝트 루트의 `.venv/Scripts/python.exe`가 있으면 127.0.0.1:8011에서 추론 서비스를 함께 시작합니다. FastAPI·Uvicorn·TensorFlow·OpenCV·NumPy·Pillow가 필요합니다. 이미 설치된 환경을 사용하며 학습을 시작하지 않습니다.

- Ring: 보존된 `vision_ring_encoder.keras`와 `vision_ring_global_tiles_48_head.keras`를 실제로 호출합니다. RGB uint8, 전체+겹치는 4구역, 160×160입니다. 외부 `/255` 없이 encoder 내부 Rescaling을 사용합니다. 판정은 항상 REVIEW이며 점수는 결함 유형 점수입니다.
- PCB: 최종 가중치는 있으나 현재 TF 환경에 PyTorch·Ultralytics가 없어 실행 환경 준비 상태입니다. 다른 PCB 실험의 저장 점수를 새 사진의 추론 결과로 만들지 않습니다.
- Lens: 최신 YOLO 가중치가 전달되지 않아 가중치 전달 대기 상태입니다. 과거 구역 CNN으로 대체하지 않습니다.
- 연결되지 않은 부품도 사진 등록과 사람 판정은 가능합니다.
- 재분석 결과는 사진별 점수와 함께 이력에 보존합니다. 중단된 분석은 10분 후 다시 시작할 수 있으며, 늦게 끝난 분석이 새 결과를 덮어쓰지 않도록 토큰으로 확인합니다.

게시 환경의 Cloudflare Worker에서는 Python 모델을 실행하지 않습니다. 게시 웹의 실제 AI 분석에는 별도 HTTPS 추론 서버가 필요합니다. `INFERENCE_URL`, 필요 시 `INFERENCE_TOKEN`을 Sites 런타임 환경 변수로 설정합니다. 토큰은 브라우저 코드·Git·hosting.json에 넣지 않습니다. 로컬에는 실행마다 생성한 프로세스 전용 토큰을 사용합니다.

## 주요 파일

| 경로 | 역할 |
|---|---|
| `src/business/App.jsx` | 메뉴·현황·LOT·대기함·이력·품질·사용자 권한 |
| `src/business/Records.jsx` | 사진 등록·원본 확대·AI 제안·담당자 판정 |
| `src/business/Finance.jsx` | 손실 계산·검산·시나리오 저장 |
| `src/business/business.css` | 데스크톱·모바일 UI와 인쇄 |
| `server/api.mjs`, `server/domain.mjs` | 서버 권한·입력 검증·DB 작업·금액 계산 |
| `inference/app.py` | 보존된 노트북에서 추출한 Ring 추론 전용 어댑터 |
| `scripts/local-server.mjs`, `scripts/local-store.mjs` | 로컬 서버·SQLite·사진 저장·모델 프로세스 |
| `db/schema.js`, `drizzle/` | DB 스키마와 실제 생성한 마이그레이션 |
| `scripts/build.mjs`, `worker/index.mjs` | Vite 화면과 API를 한 Worker로 포장 |
| `src/portfolio.jsx`, `portfolio.html` | 이전 발표용 포트폴리오와 3D 체험 |

## 검증

`npm.cmd test`는 금액 계산, Ring 가정 확인, 판정 사유, 권한, 동시 수정, 사진 저장, 재시작 후 보존, CSV 수식 차단, 업로드 크기 제한, 중단된 분석 복구와 과거 AI 결과 보존을 확인합니다. 기존 공정 시계 테스트 4개도 유지합니다.

Chrome에서 데스크톱 1440px와 모바일 390px의 주요 화면을 확인하고 LOT 등록 → 실제 사진 업로드 → Ring 분석 → 불량·재검 판정 변경 → 시나리오 저장을 실행했습니다. 원본 Ring 000073.jpg의 추론 점수는 저장 평가값과 약 1.08e-8 차이였습니다. 학습·모델·원본 데이터·PPT·Unity 소스는 변경하지 않았습니다.

손실 시뮬레이션은 계산 가정이며 현장 실적이나 순이익이 아닙니다. 현장 자동 판정 확대는 정상 사진·촬영 조건·독립 로트에서 추가로 검증해야 합니다.
