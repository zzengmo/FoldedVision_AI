"""Preserve handoff docs and include the latest user deck without editing it."""
from pathlib import Path
import hashlib
import json
import shutil
import subprocess

ROOT = Path(__file__).resolve().parents[3]
HERE = Path(__file__).resolve().parent
BACKUP = ROOT / "archive/2026-11-27_before_github_update"
BACKUP.mkdir(exist_ok=False)
sha = lambda p: hashlib.sha256(p.read_bytes()).hexdigest()
records = []
for name in ("README.md", "CODEX_PROMPT.txt", "AGENTS.md", ".gitignore"):
    p = ROOT / name
    shutil.copy2(p, BACKUP / name)
    records.append({"path": name, "sha256": sha(p)})
head = subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=ROOT, text=True).strip()
(BACKUP / "MANIFEST.json").write_text(json.dumps({"reason": "User requested GitHub update. Clarify latest presentation files and commit current source/results while retaining existing dataset, model and runtime-data exclusions.", "head_before": head, "files": records}, ensure_ascii=False, indent=2), encoding="utf-8")
snapshot = json.loads((ROOT / "outputs/cleanup_records/presentation_history/common_revision_2026-11-27/source_snapshot.json").read_text(encoding="utf-8"))
source = Path(snapshot["snapshot"])
destination = ROOT / "outputs/presentation/FACT_사용자최신_44장.pptx"
if destination.exists():
    assert sha(destination) == snapshot["sha256"]
else:
    shutil.copy2(source, destination)
assert sha(source) == sha(destination) == snapshot["sha256"]
(HERE / "latest_deck.json").write_text(json.dumps({"path": destination.relative_to(ROOT).as_posix(), "sha256": sha(destination), "slides": 44, "modified": False, "common_revision_integrated": False}, ensure_ascii=False, indent=2), encoding="utf-8")
print("Preserved current handoff docs. Latest unmodified 44-slide deck copied for GitHub.")
