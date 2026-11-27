"""Prepare the Korean selection explanation and audit existing/new artifacts.

All model implementation and actual training remain in the final notebook.
"""
from pathlib import Path
from datetime import datetime, timezone
import hashlib
import json

import nbformat
import pandas as pd

ROOT = Path(__file__).resolve().parents[3]
OUT = ROOT / "outputs/ring_model_comparison/2026-11-27"
RECORD = ROOT / "outputs/cleanup_records/ring_model_comparison_2026-11-27"
results = json.loads((OUT / "results.json").read_text(encoding="utf-8"))
verified = json.loads((OUT / "verification.json").read_text(encoding="utf-8"))
assert verified["actual_training_runs"] == 27
chosen = next(r for r in results["configurations"] if r["selected"])
representative = results["representative_seed42"]
names = {"custom_cnn": "직접 구성한 CNN", "mobilenetv2_a05": "MobileNetV2 폭 0.5",
         "mobilenetv2_a10": "MobileNetV2 폭 1.0", "resnet50": "ResNet50", "efficientnetb0": "EfficientNetB0"}
name = names[chosen["model_id"]]
view = "전체 사진" if chosen["view"] == "global" else "전체+부분 사진"
speech = (
    "학습 사진이 33장으로 적어 사전학습 특징을 활용하는 전이학습을 검토했습니다. "
    "MobileNet은 경량 구조를 가진 비교 후보로 두었고, 직접 구성한 CNN을 기준으로 "
    "ResNet50과 EfficientNetB0도 같은 조건에서 비교했습니다. "
    "MobileNet은 폭 0.5와 1.0을 모두 확인했으며 전체 사진과 부분 사진 결합을 구분했습니다. "
    "각 조건을 초기값 세 개로 반복한 뒤 검증 결과를 기준으로 선택했습니다. "
    f"이번 조건에서는 {name}의 {view} 구성이 선정됐고, 사전에 고정한 초기값 42의 "
    f"테스트 결과는 {representative['correct']}/42장, 정확도 {representative['accuracy'] * 100:.2f}%였습니다."
)
lines = [
    "Ring 모델 선정 설명 / 2026-11-27", "",
    f"선정 구성: {name} / {view}",
    "범위: 사전 고정한 160×160·학습 33장·검증 12장·기존 테스트 42장 조건의 비교", "",
    "발표에서 말할 설명", "", speech, "",
    "MobileNet 사용 이유를 세 단계로 구분", "",
    "1. 전이학습을 검토한 이유: 학습 33장으로 새로운 특징 추출기 전체를 학습하는 부담을 줄이고 사전학습 특징을 활용하기 위해서다.",
    "2. MobileNet을 비교 후보로 넣은 이유: CPU 실행을 고려해 경량 구조를 검토하기 위해서다. 작은 데이터에 MobileNet이 무조건 최적이라는 뜻은 아니다.",
    f"3. 이번 최종 선정 이유: 검증의 세 유형 평균 F1을 3회 평균했을 때 {chosen['validation_macro_f1_mean']:.4f}로 가장 높았다. "
    "테스트 결과를 보고 모델이나 초기값을 고르지 않았다.", "",
    "질문: 다른 모델도 실제로 학습했나요?", "",
    "직접 CNN 3회, 사전학습 모델별 전체/전체+부분 조건의 분류층 24회, 총 27회 학습했다. "
    "전이학습 후보는 특징 추출부를 고정하고 같은 설계의 분류층을 학습했다. "
    "ImageNet의 1,000개 분류 출력을 그대로 Ring 정답과 비교한 실험이 아니다. 특징 추출부 미세조정은 수행하지 않았다.", "",
    "질문: 학습 epoch는 같았나요?", "",
    "최대 55 epoch, 학습률 0.001, 배치 12, 조기 종료 기준은 동일했다. "
    "검증 손실이 개선되지 않으면 종료하므로 실제 학습 epoch는 다르다. 실행별 실제 epoch와 복원 epoch를 모두 기록했다.", "",
    "질문: 기존 92.86%와 이번 95.24%는 같은 모델인가요?", "",
    "별도 실험이다. 기존 92.86%는 MobileNetV2 폭 0.5에서 여러 층의 평균/최대 특징과 전체+부분 사진을 결합한 결과다. "
    "이번 공통 비교는 마지막 층의 평균 특징과 공통 분류층을 사용했고, 선정 구성은 별도 파일로 저장했다. "
    "기존 수치를 새 모델의 점수처럼 옮기지 않는다. 기존 모델·웹·Unity 연결도 변경하지 않았다.", "",
    "질문: 왜 가장 높았던 초기값을 쓰지 않나요?", "",
    "대표 초기값 42를 학습 전에 고정했다. 세 번 중 테스트 점수가 높은 실행을 골라 점수를 부풀리지 않았다. "
    "3회 반복 평균과 표준편차도 함께 제시한다. 세 초기값의 앙상블 결과는 아니다.", "",
    "질문: MobileNet이 모든 상황에서 최고라는 뜻인가요?", "",
    "이번 데이터 분할·입력 크기·고정 특징 추출 조건에서의 선정이다. 다른 해상도, 증강, 미세조정까지 "
    "각 모델의 최적 조건을 모두 탐색한 결과는 아니다. 초기값 반복은 교차검증이나 외부 검증을 대체하지 못한다.", "",
    "질문: 이 정확도로 정상/불량 차단이나 절감액을 말할 수 있나요?", "",
    "평가 대상은 오염·스크래치·표면 미가공의 결함 유형 세 가지다. 검증된 정상 사진이 없어 "
    "정상/불량 판정 성능이나 현장 차단율을 평가하지 않았다. 실제 추론 상태는 항상 REVIEW다.", "",
    "제시할 수치", "",
    f"검증 F1 3회 평균: {chosen['validation_macro_f1_mean']:.6f} ± {chosen['validation_macro_f1_std']:.6f}",
    f"기존 테스트 정확도 3회 평균: {chosen['test_accuracy_mean'] * 100:.2f}% ± {chosen['test_accuracy_std'] * 100:.2f}%p",
    f"기존 테스트 F1 3회 평균: {chosen['test_macro_f1_mean']:.6f} ± {chosen['test_macro_f1_std']:.6f}",
    f"초기값 42 정확도: {representative['correct']}/42 = {representative['accuracy'] * 100:.2f}%",
    f"초기값 42 F1: {representative['macro_f1']:.6f}",
    f"CPU 사진 1장 중앙값: {chosen['latency_median_ms']:.2f} ms; p95 {chosen['latency_p95_ms']:.2f} ms",
    "시간에는 입력 크기 조정·전처리·특징 추출·분류가 포함된다. 디스크 읽기와 모델 로딩은 제외했다.", "",
    "재현과 증거", "",
    "notebooks/ring/02_Ring_DeepLearning_Final.ipynb 마지막 Ring 비교 절: 실제 코드와 출력",
    "runs/: 실행별 학습 이력·실제 epoch·복원 epoch·평가 JSON",
    "predictions/: 실행별 검증 12장과 테스트 42장의 원본 ID·정답·예측·유형 점수",
    "training_events.jsonl: 실제 학습 완료 시각·가중치 해시",
    "selection_lock.json: 테스트 평가 전 고정한 선정 기록",
    "comparison_global_only.csv / comparison_all.csv: 전체 사진 비교 / 전체 9조건 비교",
    "selected_model_config.json: 새 선정 구성과 가중치 경로. 기존 배포 모델과 별개",
    "공식 참고: https://keras.io/2/api/applications/mobilenet/ ; https://keras.io/guides/transfer_learning/", "",
]
(OUT / "모델선정_설명과질문답변.txt").write_text("\n".join(lines), encoding="utf-8-sig")
report = OUT / "REPORT.md"
text = report.read_text(encoding="utf-8")
limitation = "- 이번 비교는 160×160·고정 ImageNet 특징 조건이다. 각 모델의 최적 입력 해상도·증강·미세조정까지 탐색한 결과가 아니며, 현재 검증 평균의 차이를 통계적으로 확정된 우열로 해석하지 않는다.\n"
if "이번 비교는 160×160" not in text:
    text = text.replace("## 재현과 증거", limitation + "\n## 재현과 증거")
    report.write_text(text, encoding="utf-8")
training = [json.loads(p.read_text(encoding="utf-8")) for p in (OUT / "runs").glob("*.json") if not p.stem.endswith(("_history", "_test"))]
pd.DataFrame([{k: r[k] for k in ("run_id", "model_id", "view", "seed", "started_at", "finished_at", "actual_epochs", "restored_epoch", "training_seconds", "training_scope", "model_path", "model_sha256")} for r in training]).to_csv(OUT / "actual_training_runs.csv", index=False, encoding="utf-8-sig")
sha = lambda p: hashlib.sha256(p.read_bytes()).hexdigest()
current = nbformat.read(ROOT / "notebooks/ring/02_Ring_DeepLearning_Final.ipynb", as_version=4)
original = nbformat.read(ROOT / "archive/2026-11-27_before_ring_model_comparison/notebooks/ring/02_Ring_DeepLearning_Final.ipynb", as_version=4)
assert current.cells[:69] == original.cells
before = json.loads((RECORD / "preservation_before.json").read_text(encoding="utf-8"))
protected = [r for r in before["files"] if r["path"] not in ("notebooks/ring/02_Ring_DeepLearning_Final.ipynb", "AGENTS.md", "README.md", "CODEX_PROMPT.txt")]
assert all(sha(ROOT / r["path"]) == r["sha256"] for r in protected)
audit = dict(completed_at=datetime.now(timezone.utc).isoformat(), total_actual_epochs=sum(r["actual_epochs"] for r in training),
    training_runs=len(training), learned_weight_files=27, frozen_encoder_files=4, original_69_cells_preserved=True,
    unchanged_protected_files=len(protected), selected_configuration=chosen["configuration"],
    source_sha256={c.id: hashlib.sha256(c.source.encode()).hexdigest() for c in current.cells[69:] if c.cell_type == "code"},
    interpretation="Validation-only selection; historical reused test; initialization SD, not cross-validation; all REVIEW.")
(RECORD / "final_audit.json").write_text(json.dumps(audit, ensure_ascii=False, indent=2), encoding="utf-8")
print(json.dumps(audit, ensure_ascii=False, indent=2))
