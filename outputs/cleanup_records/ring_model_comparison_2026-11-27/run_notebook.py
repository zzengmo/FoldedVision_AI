"""Execute only the appended Ring comparison cells using this interpreter.

Model implementation lives in the existing final notebook. This runner records
actual stdout, stderr, execution timing and outputs back to those new cells.
"""
from __future__ import annotations

import contextlib
import io
import json
import os
from pathlib import Path
import sys
import time
import traceback
from datetime import datetime, timezone

import nbformat

ROOT = Path(__file__).resolve().parents[3]
NOTEBOOK = ROOT / "notebooks/ring/02_Ring_DeepLearning_Final.ipynb"
STAGE = sys.argv[1] if len(sys.argv) > 1 else "all"
assert STAGE in ("off", "prepare", "train", "evaluate", "report", "verify", "all")
os.chdir(ROOT)
os.environ["RING_MODEL_COMPARISON_STAGE"] = STAGE
os.environ.setdefault("PYTHONUNBUFFERED", "1")
notebook = nbformat.read(NOTEBOOK, as_version=4)
def included(cell):
    name = cell.get("id", "")
    if cell.cell_type != "code" or not name.startswith("rbc-"):
        return False
    if name.startswith("rbc-train-") or name == "rbc-lock-20261127":
        return STAGE in ("all", "train")
    if name.startswith("rbc-eval-"):
        return STAGE in ("all", "evaluate")
    if name == "rbc-report-20261127":
        return STAGE in ("all", "evaluate", "report")
    if name == "rbc-verify-20261127":
        return STAGE in ("all", "evaluate", "report", "verify")
    return True


selected = [c for c in notebook.cells if included(c)]
for cell in selected:
    compile(cell.source, str(NOTEBOOK) + "#" + cell.id, "exec")


class Tee(io.TextIOBase):
    def __init__(self, terminal, capture, logfile):
        self.terminal, self.capture, self.logfile = terminal, capture, logfile

    def write(self, text):
        self.terminal.write(text)
        self.terminal.flush()
        self.capture.write(text)
        self.logfile.write(text)
        self.logfile.flush()
        return len(text)

    def flush(self):
        self.terminal.flush()
        self.logfile.flush()


namespace = {"__name__": "__main__"}
count = max((c.get("execution_count") or 0 for c in notebook.cells if c.cell_type == "code"), default=0)
record = ROOT / "outputs/cleanup_records/ring_model_comparison_2026-11-27"
run_stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
with (record / ("console_" + STAGE + "_" + run_stamp + ".log")).open("x", encoding="utf-8") as logfile:
    for cell in selected:
        count += 1
        started = time.perf_counter()
        start_iso = datetime.now(timezone.utc).isoformat()
        stdout, stderr = io.StringIO(), io.StringIO()
        failure = None
        print("CELL", cell.id, "STAGE", STAGE, flush=True)
        try:
            with contextlib.redirect_stdout(Tee(sys.stdout, stdout, logfile)), contextlib.redirect_stderr(Tee(sys.stderr, stderr, logfile)):
                exec(compile(cell.source, str(NOTEBOOK) + "#" + cell.id, "exec"), namespace)
        except BaseException as error:
            failure = error
            error_trace = traceback.format_exception(error)
        cell.execution_count = count
        cell.outputs = []
        if stdout.getvalue():
            cell.outputs.append(nbformat.v4.new_output("stream", name="stdout", text=stdout.getvalue()))
        if stderr.getvalue():
            cell.outputs.append(nbformat.v4.new_output("stream", name="stderr", text=stderr.getvalue()))
        if failure:
            cell.outputs.append(nbformat.v4.new_output("error", ename=type(failure).__name__, evalue=str(failure), traceback=error_trace))
        cell.metadata["execution"] = {"started": start_iso, "finished": datetime.now(timezone.utc).isoformat(), "duration_seconds": time.perf_counter() - started, "stage": STAGE, "interpreter": sys.executable}
        temporary = NOTEBOOK.with_suffix(".ipynb.executing")
        nbformat.write(notebook, temporary)
        # Windows indexers/editors can briefly hold a reader handle on the notebook.
        for attempt in range(10):
            try:
                temporary.replace(NOTEBOOK)
                break
            except PermissionError:
                if attempt == 9:
                    raise
                time.sleep(0.15 * (attempt + 1))
        print("CELL FINISHED", cell.id, "seconds", round(time.perf_counter() - started, 2), flush=True)
        if failure:
            logfile.write("".join(error_trace))
            raise failure
print("Completed Ring notebook stage:", STAGE, flush=True)
