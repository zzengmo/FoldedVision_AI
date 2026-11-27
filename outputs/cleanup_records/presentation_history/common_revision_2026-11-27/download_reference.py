"""Download the publicly linked patent figure and record its source."""
from pathlib import Path
import hashlib
import json
import urllib.request

HERE = Path(__file__).resolve().parent
folder = HERE / "assets"
folder.mkdir(exist_ok=True)
url = "https://patentimages.storage.googleapis.com/cd/33/5b/a431a697b63583/PCTKR2021017359-appb-img-000001.png"
path = folder / "patent_fig1.png"
if not path.exists():
    request = urllib.request.Request(url, headers={"User-Agent": "FACT-Presentation-Source-Check/1.0"})
    with urllib.request.urlopen(request, timeout=40) as response:
        data = response.read()
    assert data.startswith(b"\x89PNG"), "Expected public patent PNG"
    path.write_bytes(data)
metadata = {"reference": "WO2022154244A1, drawing 1", "document": "https://patents.google.com/patent/WO2022154244A1/ko", "image_url": url, "retrieved": "2026-11-27", "bytes": path.stat().st_size, "sha256": hashlib.sha256(path.read_bytes()).hexdigest(), "scope": "Published technical drawing; not a verified current production BOM or factory photograph."}
(folder / "patent_source.json").write_text(json.dumps(metadata, ensure_ascii=False, indent=2), encoding="utf-8")
print("Patent reference PNG:", path.stat().st_size, "bytes")
