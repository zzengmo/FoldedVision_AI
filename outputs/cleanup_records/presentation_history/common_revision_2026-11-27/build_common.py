"""Build only the six-slide common part, retaining the original cover bytes.

The original presentation and its Lens/Ring/PCB sections are never rewritten.
New text, schedule bars and tables are native editable PowerPoint shapes.
"""
from __future__ import annotations

from collections import deque
from io import BytesIO
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
from xml.etree import ElementTree as ET
from xml.sax.saxutils import escape, quoteattr
import copy
import hashlib
import json
import posixpath

from PIL import Image

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[3]
CONTENT = json.loads((HERE / "content.json").read_text(encoding="utf-8"))
SNAPSHOT = json.loads((HERE / "source_snapshot.json").read_text(encoding="utf-8"))
SOURCE = Path(SNAPSHOT["snapshot"])
DEST = ROOT / "outputs/presentation" / (CONTENT["output_stem"] + ".pptx")
A = "http://schemas.openxmlformats.org/drawingml/2006/main"
P = "http://schemas.openxmlformats.org/presentationml/2006/main"
R = "http://schemas.openxmlformats.org/officeDocument/2006/relationships"
PR = "http://schemas.openxmlformats.org/package/2006/relationships"
CT = "http://schemas.openxmlformats.org/package/2006/content-types"
NAVY, TEAL, BODY, MUTED = "17324D", "008DA3", "4F667A", "708596"
BG, LINE, PALE = "F8FAFC", "D9E3EA", "E8F3F4"
ASSETS = []


def sha(data):
    return hashlib.sha256(data).hexdigest()


def emu(points):
    return str(round(points * 12700))


def xml_bytes(text):
    return ('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' + text).encode("utf-8")


def serialize(node):
    return ET.tostring(node, encoding="utf-8", xml_declaration=True)


class Slide:
    def __init__(self, number):
        self.number, self.shapes = number, []
        self.relationships = [
            dict(Id="rId1", Type=R + "/slideLayout", Target="../slideLayouts/slideLayout7.xml"),
            dict(Id="rId2", Type=R + "/notesSlide", Target=f"../notesSlides/notesSlide{number}.xml"),
        ]
        self.media, self.counter = {}, 1

    def identifier(self, name):
        self.counter += 1
        return f'<p:cNvPr id="{self.counter}" name={quoteattr(name)}/>'

    def relation(self, kind, target, external=False):
        rid = "rId" + str(len(self.relationships) + 1)
        rel = dict(Id=rid, Type=R + "/" + kind, Target=target)
        if external:
            rel["TargetMode"] = "External"
        self.relationships.append(rel)
        return rid

    def rect(self, x, y, w, h, fill=LINE, name="rule"):
        self.shapes.append(f'<p:sp><p:nvSpPr>{self.identifier(name)}<p:cNvSpPr/><p:nvPr/></p:nvSpPr>'
            f'<p:spPr><a:xfrm><a:off x="{emu(x)}" y="{emu(y)}"/><a:ext cx="{emu(w)}" cy="{emu(h)}"/></a:xfrm>'
            f'<a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:solidFill><a:srgbClr val="{fill}"/></a:solidFill>'
            '<a:ln><a:noFill/></a:ln></p:spPr></p:sp>')

    def text(self, text, x, y, w, h, size=16, color=BODY, bold=False, line=None, align="l", name="text", url=None):
        line = line or size * 1.32
        link = f'<a:hlinkClick r:id="{self.relation("hyperlink", url, True)}"/>' if url else ""
        paragraphs = []
        for part in text.split("\n"):
            paragraphs.append(f'<a:p><a:pPr algn="{align}"><a:lnSpc><a:spcPts val="{round(line * 100)}"/></a:lnSpc>'
                '<a:spcBef><a:spcPts val="0"/></a:spcBef><a:spcAft><a:spcPts val="0"/></a:spcAft></a:pPr>'
                f'<a:r><a:rPr lang="ko-KR" sz="{round(size * 100)}" b="{int(bold)}">'
                f'<a:solidFill><a:srgbClr val="{color}"/></a:solidFill><a:latin typeface="Malgun Gothic"/>'
                f'<a:ea typeface="Malgun Gothic"/><a:cs typeface="Malgun Gothic"/>{link}</a:rPr>'
                f'<a:t xml:space="preserve">{escape(part)}</a:t></a:r>'
                f'<a:endParaRPr lang="ko-KR" sz="{round(size * 100)}"/></a:p>')
        self.shapes.append(f'<p:sp><p:nvSpPr>{self.identifier(name)}<p:cNvSpPr txBox="1"/><p:nvPr/></p:nvSpPr>'
            f'<p:spPr><a:xfrm><a:off x="{emu(x)}" y="{emu(y)}"/><a:ext cx="{emu(w)}" cy="{emu(h)}"/></a:xfrm>'
            '<a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:noFill/><a:ln><a:noFill/></a:ln></p:spPr>'
            '<p:txBody><a:bodyPr wrap="square" lIns="0" rIns="0" tIns="0" bIns="0" anchor="t"><a:noAutofit/></a:bodyPr>'
            '<a:lstStyle/>' + ''.join(paragraphs) + '</p:txBody></p:sp>')

    def picture(self, relative, x, y, w, h, name, crop=None):
        source = ROOT / relative
        data = source.read_bytes()
        with Image.open(BytesIO(data)) as im:
            iw, ih = im.size
            extension = source.suffix.lower()
            if extension == ".webp":
                buffer = BytesIO()
                im.save(buffer, "PNG")
                data, extension = buffer.getvalue(), ".png"
        if extension == ".jpg":
            extension = ".jpeg"
        if crop is None:
            scale = min(w / iw, h / ih)
            dw, dh = iw * scale, ih * scale
            x, y, w, h = x + (w-dw)/2, y + (h-dh)/2, dw, dh
            source_crop = ""
        else:
            source_crop = '<a:srcRect ' + ' '.join(f'{key}="{round(value * 100000)}"' for key, value in crop.items()) + '/>'
        filename = f"fact_common_{self.number}_{len(self.media)+1}{extension}"
        self.media["ppt/media/" + filename] = data
        rid = self.relation("image", "../media/" + filename)
        self.shapes.append(f'<p:pic><p:nvPicPr>{self.identifier(name)}<p:cNvPicPr><a:picLocks noChangeAspect="1"/></p:cNvPicPr><p:nvPr/></p:nvPicPr>'
            f'<p:blipFill><a:blip r:embed="{rid}"/>{source_crop}<a:stretch><a:fillRect/></a:stretch></p:blipFill>'
            f'<p:spPr><a:xfrm><a:off x="{emu(x)}" y="{emu(y)}"/><a:ext cx="{emu(w)}" cy="{emu(h)}"/></a:xfrm>'
            '<a:prstGeom prst="rect"><a:avLst/></a:prstGeom></p:spPr></p:pic>')
        ASSETS.append(dict(slide=self.number, source=relative, source_sha256=sha(source.read_bytes()), embedded_sha256=sha(data), description=name))

    def heading(self, title, lead, section="01  프로젝트 개요"):
        self.rect(0, 0, 960, 4, TEAL)
        self.text(CONTENT["brand"], 48, 20, 220, 16, 10, MUTED, True)
        self.text(section, 674, 20, 238, 18, 10.5, TEAL, True, align="r")
        self.text(title, 48, 53, 864, 45, 29, NAVY, True)
        self.text(lead, 48, 108, 864, 44, 15.5, BODY, line=21)

    def footer(self):
        self.rect(48, 514, 864, .7, LINE)
        self.text(CONTENT["footer"], 48, 522, 720, 14, 8.3, MUTED)
        self.text(f"{self.number:02d}", 870, 520, 42, 16, 9, MUTED, align="r")

    def xml(self):
        group = '<p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>'
        return xml_bytes(f'<p:sld xmlns:a="{A}" xmlns:r="{R}" xmlns:p="{P}" showMasterSp="0"><p:cSld name="FACT common {self.number}">'
            f'<p:bg><p:bgPr><a:solidFill><a:srgbClr val="{BG}"/></a:solidFill><a:effectLst/></p:bgPr></p:bg>'
            '<p:spTree>' + group + ''.join(self.shapes) + '</p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sld>')

    def rels(self):
        root = ET.Element("Relationships", xmlns=PR)
        for rel in self.relationships:
            ET.SubElement(root, "Relationship", rel)
        return serialize(root)


def make_slides():
    slides = {}
    s = Slide(2)
    s.heading("발표 목차", "프로젝트 개요에서 부품별 실험, 종합 결과와 시스템 시연으로 이어집니다.", "CONTENTS")
    for i, group in enumerate(CONTENT["contents"]):
        x, y = 48 + (i % 3) * 296, 164 + (i // 3) * 164
        title = group["title"]
        if group["number"] == "03":
            title = "RING · 금속 표면 결함\n유형 분류"
        s.text(group["number"], x, y, 36, 32, 22, TEAL, True)
        s.text(title, x + 43, y + 2, 229, 41, 14.5, NAVY, True, line=19)
        s.rect(x, y + 42, 272, .65)
        for j, item in enumerate(group["items"]):
            yy = y + 51 + j * 19
            s.text("•", x + 1, yy, 12, 18, 11.5, TEAL)
            s.text(item, x + 15, yy, 257, 19, 12.2, BODY, line=17)
    s.footer()
    slides[2] = s

    c = CONTENT["goals"]
    s = Slide(3)
    s.heading(c["title"], c["lead"])
    for i, part in enumerate(c["parts"]):
        x = 48 + i * 296
        s.text(part["name"], x, 157, 272, 29, 20, TEAL, True)
        s.text(part["role"], x, 188, 272, 22, 14.1, NAVY, True)
        s.picture(part["asset"], x, 218, 272, 148, part["provenance"])
        s.text(part["task"], x, 376, 272, 43, 13.7, BODY, line=20)
    s.rect(48, 430, 864, .8)
    s.text(c["workflow"], 48, 441, 864, 24, 16.1, NAVY, True)
    s.text(c["scope"], 48, 470, 864, 20, 11.5, BODY)
    s.text("자료 출처  [S3] VISION Lens·Ring", 48, 495, 300, 14, 8.5, MUTED, url=CONTENT["sources"]["S3"]["url"])
    s.text("[S4] 팀 PCB4 원본 사진 · Lens 원 표시는 위치 설명용", 350, 495, 562, 14, 8.5, MUTED)
    s.footer()
    slides[3] = s

    c = CONTENT["schedule"]
    s = Slide(4)
    s.heading(c["title"], c["lead"])
    left, step = 284, 628/19
    for j, day in enumerate(range(12,31)):
        xx = left + j * step
        s.text(str(day), xx, 158, step, 21, 11.1, TEAL if day==27 else MUTED, bold=day==27, align="ctr")
        s.rect(xx, 181, .5, 273, "E5ECF1")
    s.rect(48, 181, 864, .8)
    for i, row in enumerate(c["rows"]):
        y = 192 + i * 52
        s.text(row["name"], 48, y, 205, 24, 16, NAVY, True)
        s.text(f'11/{row["start"]}–11/{row["end"]}  ·  {row["detail"]}', 48, y+26, 229, 18, 10.7, BODY)
        xx = left + (row["start"]-12)*step + 3
        color = "B8C8D3" if row["start"] >= 28 else (TEAL if i%2==0 else "416479")
        s.rect(xx, y+5, (row["end"]-row["start"]+1)*step-6, 29, color, "editable_schedule_bar")
        s.rect(48, y+48, 864, .5, "E5ECF1")
    marker = left + 15.5 * step
    s.rect(marker, 177, 1.1, 275, TEAL, "reference_date_2026_11_27")
    s.text("11/27 기준", marker-39, 456, 80, 20, 10, TEAL, True, align="ctr")
    s.text(c["note"], 48, 483, 864, 19, 10.5, BODY)
    s.text("일정 출처  사용자 제공 최종 PPT의 11/12–11/30 일정안", 48, 503, 864, 12, 8.2, MUTED)
    s.footer()
    slides[4] = s

    c = CONTENT["rationale"]
    s = Slide(5)
    s.heading(c["title"], c["lead"])
    product = next((ROOT / "outputs/presentation").glob("*/자화전자_폴디드줌.jpg"))
    s.picture(product.relative_to(ROOT).as_posix(), 48, 166, 300, 219,
              "사용자 제공 카메라 액추에이터 참고 사진. 공개 실험 데이터나 현장 검사 결과 사진이 아님.")
    s.text("카메라 액추에이터 참고 사진", 48, 395, 300, 23, 14, NAVY, True)
    s.text("사용자 제공 자료 · 공개 실험 데이터와 구분", 48, 422, 300, 21, 10.3, MUTED)
    for i, item in enumerate(c["items"]):
        y = 165 + i * 88
        s.text(item["label"], 380, y, 532, 25, 16.3, TEAL, True)
        s.text(item["text"], 380, y+31, 532, 48, 14.1, BODY, line=21)
        if i<2:
            s.rect(380, y+80, 532, .6)
    s.rect(48, 453, 864, .8)
    s.text(c["hypothesis"], 48, 465, 864, 21, 11.5, NAVY, True)
    s.text("자료 출처  [S1] 자화전자 공개특허 WO2022154244A1 (2022)", 48, 492, 477, 14, 8.5, MUTED,
           url=CONTENT["sources"]["S1"]["url"])
    s.text("[S2] ASQ, Cost of Quality — 입고 확인·폐기·재작업", 530, 492, 382, 14, 8.5, MUTED,
           url=CONTENT["sources"]["S2"]["url"])
    s.footer()
    slides[5] = s

    c = CONTENT["technology"]
    s = Slide(6)
    s.heading(c["title"], c["lead"])
    for text, x, w in [("개발 영역",48,90),("활용 기술",152,190),("구현 내용",355,218)]:
        s.text(text,x,157,w,21,11.7,MUTED,True)
    s.rect(48,183,525,.85,TEAL)
    for i,row in enumerate(c["rows"]):
        y=195+i*62
        s.text(row["area"],48,y,90,26,13.6,NAVY,True)
        s.text(row["tech"],152,y,190,44,12.5,BODY,line=19)
        s.text(row["use"],355,y,218,44,12.5,BODY,line=19)
        s.rect(48,y+53,525,.6)
    s.picture(c["web_asset"],610,161,302,116,"실제 구현한 로컬 업무 웹. 예시 작업공간의 검증용 데이터 화면.",crop={"l":0,"t":0,"r":0,"b":.49})
    s.text("웹 · 검사 업무와 이력 관리",610,285,302,22,12.4,NAVY,True)
    s.picture(c["unity_asset"],610,318,302,114,"실제 Unity 프로젝트의 가상 검사 셀. 저장 결과 재생이며 실제 회사 생산라인 사진이 아님.",crop={"l":0,"t":.16,"r":.28,"b":.16})
    s.text("Unity · 가상 설비와 분류 흐름",610,439,302,21,12.4,NAVY,True)
    s.text(c["status"],48,470,864,21,10.8,BODY)
    s.text("구현 근거  프로젝트 노트북·팀 PCB 코드·웹 소스·Unity README (2026.11.27 확인)",48,495,864,14,8.5,MUTED)
    s.footer()
    slides[6] = s
    return slides


def replace_notes(package, number, text):
    path = f"ppt/notesSlides/notesSlide{number}.xml"
    node = ET.fromstring(package[path])
    body = next(sp for sp in node.findall(f".//{{{P}}}sp") if sp.find(f".//{{{P}}}ph[@type='body']") is not None)
    tx = body.find(f"{{{P}}}txBody")
    for child in list(tx):
        if child.tag == f"{{{A}}}p":
            tx.remove(child)
    for line in text.split("\n"):
        para=ET.SubElement(tx,f"{{{A}}}p")
        run=ET.SubElement(para,f"{{{A}}}r")
        ET.SubElement(run,f"{{{A}}}t").text=line
    package[path]=serialize(node)


def relationship_part(base):
    if not base:
        return "_rels/.rels"
    return posixpath.join(posixpath.dirname(base),"_rels",posixpath.basename(base)+".rels")


def reachable(package):
    visited=set()
    pending=deque([""])
    while pending:
        part=pending.popleft()
        if part in visited:
            continue
        if part:
            assert part in package, "Missing internal part: "+part
            visited.add(part)
        rp=relationship_part(part)
        if rp not in package:
            continue
        visited.add(rp)
        for rel in ET.fromstring(package[rp]):
            if rel.attrib.get("TargetMode")=="External":
                continue
            target=rel.attrib["Target"].split("#")[0]
            target=target.lstrip("/") if target.startswith("/") else posixpath.normpath(posixpath.join(posixpath.dirname(part),target))
            if target not in visited:
                pending.append(target)
    return visited


def main():
    with ZipFile(SOURCE) as archive:
        package={name:archive.read(name) for name in archive.namelist()}
    source_package=copy.copy(package)
    slides=make_slides()
    for number,slide in slides.items():
        package[f"ppt/slides/slide{number}.xml"]=slide.xml()
        package[f"ppt/slides/_rels/slide{number}.xml.rels"]=slide.rels()
        package.update(slide.media)
        section=CONTENT[{3:"goals",4:"schedule",5:"rationale",6:"technology"}[number]] if number>=3 else None
        notes=["FACT PROJECT / 공통부","제목: "+("발표 목차" if number==2 else section["title"]),
               "본문은 발표자 설명 없이도 목표·대상·근거·구현 범위를 확인하도록 작성했다."]
        if number==2:
            notes += [g["number"]+" "+g["title"]+": "+" / ".join(g["items"]) for g in CONTENT["contents"]]
        else:
            notes.append(json.dumps(section,ensure_ascii=False,indent=2))
        notes += ["자료 출처와 주장 범위:"]+[key+" "+json.dumps(value,ensure_ascii=False) for key,value in CONTENT["sources"].items()]
        replace_notes(package,number,"\n".join(notes))
    presentation=ET.fromstring(package["ppt/presentation.xml"])
    ids=presentation.find(f"{{{P}}}sldIdLst")
    assert len(ids)==44
    selected_ids=list(ids)[:6]
    for node in list(ids)[6:]:
        ids.remove(node)
    for child in list(presentation):
        if child.tag==f"{{{P}}}custShowLst":
            presentation.remove(child)
        elif child.tag==f"{{{P}}}extLst":
            for ext in list(child):
                if any(n.tag.endswith("}sectionLst") for n in ext.iter()):
                    child.remove(ext)
    package["ppt/presentation.xml"]=serialize(presentation)
    allowed={node.attrib[f"{{{R}}}id"] for node in selected_ids}
    pr=ET.fromstring(package["ppt/_rels/presentation.xml.rels"])
    for rel in list(pr):
        if rel.attrib["Type"].endswith("/slide") and rel.attrib["Id"] not in allowed:
            pr.remove(rel)
    package["ppt/_rels/presentation.xml.rels"]=serialize(pr)
    app=ET.fromstring(package["docProps/app.xml"])
    for node in app.iter():
        if node.tag.endswith("}Slides"):
            node.text="6"
    package["docProps/app.xml"]=serialize(app)
    keep=reachable(package)
    types=ET.fromstring(package["[Content_Types].xml"])
    for node in list(types):
        if node.tag.endswith("}Override") and node.attrib["PartName"].lstrip("/") not in keep:
            types.remove(node)
    extensions={n.attrib.get("Extension") for n in types if n.tag.endswith("}Default")}
    for ext,mime in (("png","image/png"),("jpeg","image/jpeg")):
        if ext not in extensions:
            ET.SubElement(types,f"{{{CT}}}Default",Extension=ext,ContentType=mime)
    package["[Content_Types].xml"]=serialize(types)
    keep.add("[Content_Types].xml")
    # The cover and all its original relationships remain byte-for-byte unchanged.
    for part in ("ppt/slides/slide1.xml","ppt/slides/_rels/slide1.xml.rels","ppt/notesSlides/notesSlide1.xml"):
        assert package[part]==source_package[part]
    with ZipFile(DEST,"w",ZIP_DEFLATED) as archive:
        for name in sorted(keep):
            archive.writestr(name,package[name])
    (HERE/"assets_manifest.json").write_text(json.dumps(ASSETS,ensure_ascii=False,indent=2),encoding="utf-8")
    (HERE/"delivery.json").write_text(json.dumps(dict(pptx=DEST.relative_to(ROOT).as_posix(),slides=6,source_slides=44,
        original_cover_xml_unchanged=True,original_source_sha256=SNAPSHOT["sha256"],output_sha256=sha(DEST.read_bytes()),
        package_parts=len(keep),unused_video_and_slides_removed=True),ensure_ascii=False,indent=2),encoding="utf-8")
    print("Built common-only presentation:",DEST.name,"6 slides; bytes",DEST.stat().st_size,"parts",len(keep))


if __name__=="__main__":
    main()
