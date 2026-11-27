"""Refine report readability only; keep the registered study and trained weights."""
from pathlib import Path
import hashlib
import json
import shutil

import nbformat

ROOT = Path(__file__).resolve().parents[3]
OUT = ROOT / "outputs/ring_model_comparison/2026-11-27"
RECORD = ROOT / "outputs/cleanup_records/ring_model_comparison_2026-11-27"
backup = RECORD / "visual_review_before"
backup.mkdir(exist_ok=False)
files = [OUT / "figures/02_view_and_latency.png", OUT / "REPORT.md", OUT / "REPORT.html", next(OUT.glob("*.pdf"))]
manifest = []
for path in files:
    shutil.copy2(path, backup / path.name)
    manifest.append({"path": str(path.relative_to(ROOT)), "sha256": hashlib.sha256(path.read_bytes()).hexdigest()})
(backup / "MANIFEST.json").write_text(json.dumps({"reason": "Replace crowded scatter labels with a readable latency bar chart; add fixed-condition and file-size interpretation. No training, model, protocol or prediction changes.", "files": manifest}, ensure_ascii=False, indent=2), encoding="utf-8")
path = ROOT / "notebooks/ring/02_Ring_DeepLearning_Final.ipynb"
notebook = nbformat.read(path, as_version=4)
cell = next(c for c in notebook.cells if c.id == "rbc-report-functions-20261127")
source = cell.source
start = source.index('        for r in summary:\n            c=orange if r["selected"]')
end = source.index('        fig.suptitle(final_name+', start)
replacement = '''        axes[0].set_xticklabels(["MobileNetV2\\n0.5", "MobileNetV2\\n1.0", "ResNet50", "EfficientNetB0"], rotation=0, ha="center", fontsize=9)
        speed_rows=sorted(summary,key=lambda r:r["latency_median_ms"])
        speed_names=[labels[r["model_id"]]+(" / 전체" if r["view"]=="global" else " / 전체+부분") for r in speed_rows]
        colors=[orange if r["selected"] else (teal if r["view"]=="global" else "#7694ad") for r in speed_rows]
        yy=np.arange(len(speed_rows))
        axes[1].barh(yy,[r["latency_median_ms"] for r in speed_rows],color=colors,height=.62)
        axes[1].set_yticks(yy,speed_names,fontsize=8.5)
        axes[1].invert_yaxis()
        for i,r in enumerate(speed_rows):
            axes[1].text(r["latency_median_ms"]+2,i,f'{r["latency_median_ms"]:.1f}',va="center",fontsize=9)
        axes[1].set_xlim(0,max(r["latency_median_ms"] for r in speed_rows)*1.23)
        axes[1].set_xlabel("CPU 사진 1장 중앙값 ms / 작을수록 빠름")
        axes[1].set_title("실행 부담 / 주황색: 검증 선정")
        axes[1].grid(axis="x",alpha=.18)
'''
source = source[:start] + replacement + source[end:]
source = source.replace('"크기 MiB"', '"저장 크기 MiB"')
source = source.replace('"모델 크기(MiB)"', '"저장 파일(MiB)"')
source = source.replace('f\'{r["test_accuracy_mean"]*100:.2f} ± {r["test_accuracy_std"]*100:.2f}%\'', 'f\'{r["test_accuracy_mean"]*100:.2f}% ± {r["test_accuracy_std"]*100:.2f}%p\'')
anchor = '            "- 검증된 정상 사진이 없어 정상/불량 탐지 성능, 불량 차단율, 실제 손실 절감액은 평가하지 않았다. 모든 추론 상태는 REVIEW다.","",'
extra = '''            "- 검증된 정상 사진이 없어 정상/불량 탐지 성능, 불량 차단율, 실제 손실 절감액은 평가하지 않았다. 모든 추론 상태는 REVIEW다.",
            "- 이번 비교는 160×160·고정 ImageNet 특징 조건이다. 각 모델의 최적 해상도·증강·미세조정까지 탐색한 결과가 아니며, 검증 평균의 차이를 통계적으로 확정된 우열로 해석하지 않는다.",
            "- 저장 파일 크기는 encoder와 분류기 .keras 파일의 합이며 분류기 학습용 optimizer 상태를 포함한다. 순수 추론 가중치 크기나 실제 실행 메모리와 구분한다.","",'''
assert anchor in source
source = source.replace(anchor, extra)
compile(source, cell.id, "exec")
cell.source = source
nbformat.write(notebook, path)
print("Updated reporting code only. Registered protocol, training and evaluation code unchanged.")
