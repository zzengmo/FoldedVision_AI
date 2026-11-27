"""Enumerate exact tracked/unignored paths; keep runtime/model data excluded."""
from pathlib import Path
import hashlib
import json
import re
import subprocess

ROOT = Path(__file__).resolve().parents[3]
HERE = Path(__file__).resolve().parent
BACKUP = ROOT / "archive/2026-11-27_before_github_update"
scope_path = HERE / "scope.json"
scope_path.write_text("{}\n", encoding="utf-8")


def git_paths(*args):
    result = subprocess.check_output(["git", *args], cwd=ROOT)
    return [p for p in result.decode("utf-8").split("\0") if p]


paths = sorted(set(git_paths("diff", "--name-only", "-z") + git_paths("ls-files", "--others", "--exclude-standard", "-z")))
assert paths
assert not any(p.startswith(("data/", "models/", "archive/")) or "/.runtime/" in p or "/.git/" in p or "/.sites-source/" in p for p in paths)
assert not any((ROOT / p).is_file() and (ROOT / p).stat().st_size >= 100 * 1024**2 for p in paths)
patterns = {
    "github_pat": r"github_pat_[A-Za-z0-9_]{30,}",
    "github_token": r"gh[pousr]_[A-Za-z0-9]{25,}",
    "openai_key": r"\bsk-(?:proj-)?[A-Za-z0-9_-]{30,}",
    "private_key": r"-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----",
    "aws_access_key": r"\bAKIA[0-9A-Z]{16}\b",
}
findings = []
for name in paths:
    p = ROOT / name
    if not p.is_file() or p.suffix.lower() in (".pptx", ".pdf", ".png", ".jpg", ".jpeg", ".webp", ".mp4"):
        continue
    try:
        text = p.read_text(encoding="utf-8-sig")
    except (UnicodeError, OSError):
        continue
    for kind, pattern in patterns.items():
        if re.search(pattern, text):
            findings.append({"path": name, "pattern": kind})
assert not findings, findings
checks = {
    "presentation": json.loads((ROOT / "outputs/cleanup_records/presentation_history/common_revision_2026-11-27/validation.json").read_text(encoding="utf-8")),
    "ring": json.loads((ROOT / "outputs/ring_model_comparison/2026-11-27/verification.json").read_text(encoding="utf-8")),
    "web": json.loads((ROOT / "outputs/cleanup_records/business_web_2026-11-27/validation.json").read_text(encoding="utf-8")),
}
assert checks["presentation"]["cover_render_identical"] and checks["presentation"]["all_requested_contents_present"]
assert checks["ring"]["actual_training_runs"] == 27 and checks["ring"]["original_69_notebook_cells_preserved"]
assert checks["web"]["tests_passed"] == 10 and checks["web"]["build_passed"]
scope = dict(repository="zzengmo/FoldedVision_AI", branch="main",
    parent_commit=subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=ROOT, text=True).strip(),
    included_files=paths, file_count=len(paths), credential_pattern_findings=findings,
    data_models_runtime_excluded=True, existing_validation_records=checks,
    validation_note="Reuses completed task-specific validation records; this Git save does not retrain models or change the website deployment.")
scope_path.write_text(json.dumps(scope, ensure_ascii=False, indent=2), encoding="utf-8")
(BACKUP / "stage_paths.nul").write_bytes(b"\0".join(p.encode("utf-8") for p in paths) + b"\0")
(BACKUP / "commit_message.txt").write_text(
    "Save FACT presentation, Ring benchmarks, and inspection workspace\n\n"
    "Add the editable six-slide common section and preserve the latest user 44-slide deck separately.\n"
    "Record 27 Ring training runs across nine configurations, validation-only selection, predictions, timing and reports.\n"
    "Save the operational inspection web, local Ring inference, persistence, roles and the previous portfolio.\n"
    "Clarify current presentation files and reproducibility in the handoff docs.\n\n"
    "Validation records: six-slide PowerPoint rendering and cover preservation; 87 source image hashes and prediction replay; 10 web tests, build and desktop/mobile browser workflows.\n"
    "Keep original data, additional model weights, local DB/photos and backup archives excluded.\n", encoding="utf-8")
print("Exact staging manifest:", len(paths), "files. No credentials or protected runtime data included.")
