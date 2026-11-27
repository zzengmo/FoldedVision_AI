"""Consolidate only Ring slides using OOXML; preserve all existing media bytes.

No training, original image editing, or third-party package installation is used.
The archived presentation is the immutable source for reproducible rebuilds.
"""
from __future__ import annotations

import copy
import hashlib
import html
import json
import posixpath
import re
from io import BytesIO
from pathlib import Path
from xml.dom import Node, minidom
from zipfile import ZIP_DEFLATED, ZipFile
from PIL import Image

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[3]
BACKUP = ROOT / 'archive/2026-11-27_before_ring_consolidation'
SOURCE = next(BACKUP.glob('*.pptx'))
CONTENT = json.loads((HERE / 'content.json').read_text(encoding='utf-8'))
SECTIONS = CONTENT['sections']
A = 'http://schemas.openxmlformats.org/drawingml/2006/main'
P = 'http://schemas.openxmlformats.org/presentationml/2006/main'
R = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'
PR = 'http://schemas.openxmlformats.org/package/2006/relationships'
EMU = 914400
NAVY, TEAL, GRAY, RUST = '17324D', '008DA3', '59758B', 'AA5636'
BG, PALE, ORANGE = 'F8FAFC', 'D9EDF0', 'F9EDD9'


def sha(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def descendants(node, namespace, name):
    return list(node.getElementsByTagNameNS(namespace, name))


def first(node, namespace, name):
    return descendants(node, namespace, name)[0]


def element(doc, tag, attrs=None, children=None):
    ns = {'a': A, 'p': P, 'r': R}[tag.split(':')[0]]
    item = doc.createElementNS(ns, tag)
    for k, v in (attrs or {}).items():
        item.setAttribute(k, str(v))
    for child in children or []:
        item.appendChild(child)
    return item


def clear(node):
    for child in list(node.childNodes):
        node.removeChild(child)


def text_of(node):
    return ''.join(t.firstChild.data if t.firstChild else '' for t in descendants(node, A, 't'))


def shapes(doc):
    return [n for n in first(doc, P, 'spTree').childNodes if n.nodeType == Node.ELEMENT_NODE]


def shape_id(node):
    nv = descendants(node, P, 'cNvPr')
    return int(nv[0].getAttribute('id')) if nv else None


def by_id(doc, number):
    return next(n for n in shapes(doc) if shape_id(n) == number)


def replace_text(node, value):
    runs = descendants(node, A, 't')
    if not runs:
        raise ValueError('No text to replace: ' + value)
    clear(runs[0])
    runs[0].appendChild(node.ownerDocument.createTextNode(value))
    for run in runs[1:]:
        parent=run.parentNode
        if parent.localName in ['r','fld']:
            parent.parentNode.removeChild(parent)
        else:
            clear(run)


def move_shape(node, x, y, width, height):
    xf = first(node, P if node.localName == 'graphicFrame' else A, 'xfrm')
    off = first(xf, A, 'off')
    ext = first(xf, A, 'ext')
    for key, val in [('x', x), ('y', y)]:
        off.setAttribute(key, str(round(val * EMU)))
    for key, val in [('cx', width), ('cy', height)]:
        ext.setAttribute(key, str(round(val * EMU)))


def crop_preserving_region(node, width, height, source_part, package):
    """Adjust editable picture cropping, retaining the original region's center."""
    rp=posixpath.join(posixpath.dirname(source_part),'_rels',posixpath.basename(source_part)+'.rels')
    rels=minidom.parseString(package[rp])
    rid=first(node,A,'blip').getAttribute('r:embed')
    target=next(x.getAttribute('Target') for x in descendants(rels,PR,'Relationship') if x.getAttribute('Id')==rid)
    image_path=posixpath.normpath(posixpath.join(posixpath.dirname(source_part),target))
    iw,ih=Image.open(BytesIO(package[image_path])).size
    crops=descendants(node,A,'srcRect')
    crop=crops[0] if crops else element(node.ownerDocument,'a:srcRect')
    if not crops:
        fill=first(node,P,'blipFill')
        stretch=descendants(fill,A,'stretch')
        fill.insertBefore(crop,stretch[0] if stretch else None)
    l,t,r,b=[int(crop.getAttribute(k) or 0)/100000 for k in ['l','t','r','b']]
    current=(iw*(1-l-r))/(ih*(1-t-b))
    target_ratio=width/height
    if current>target_ratio:
        delta=(1-l-r)*(1-target_ratio/current)/2
        l+=delta; r+=delta
    else:
        delta=(1-t-b)*(1-current/target_ratio)/2
        t+=delta; b+=delta
    for key,value in zip(['l','t','r','b'],[l,t,r,b]):
        crop.setAttribute(key,str(round(value*100000)))


def color(doc, value):
    return element(doc, 'a:solidFill', children=[element(doc, 'a:srgbClr', {'val': value})])


def paragraph(doc, text, size=18, ink=NAVY, bold=False, align='l'):
    p = element(doc, 'a:p')
    p.appendChild(element(doc, 'a:pPr', {'algn': align, 'latinLnBrk': '0', 'eaLnBrk': '1'}))
    r = element(doc, 'a:r')
    props = element(doc, 'a:rPr', {'lang': 'ko-KR', 'sz': round(size*100), 'b': '1' if bold else '0', 'dirty': '0'})
    props.appendChild(color(doc, ink))
    for kind in ['latin', 'ea', 'cs']:
        props.appendChild(element(doc, 'a:'+kind, {'typeface': 'Malgun Gothic'}))
    r.appendChild(props)
    t = element(doc, 'a:t')
    t.appendChild(doc.createTextNode(text))
    r.appendChild(t)
    p.appendChild(r)
    p.appendChild(element(doc, 'a:endParaRPr', {'lang': 'ko-KR', 'sz': round(size*100)}))
    return p


class Slide:
    def __init__(self, doc):
        self.doc = doc
        self.tree = first(doc, P, 'spTree')
        self.next_id = max(n for n in [shape_id(s) for s in shapes(doc)] if n is not None)+1

    def base(self, keep_ids):
        for n in shapes(self.doc):
            if n.localName not in ['nvGrpSpPr', 'grpSpPr'] and shape_id(n) not in keep_ids:
                self.tree.removeChild(n)

    def add(self, shape):
        node = self.doc.importNode(shape, True)
        ids = descendants(node, P, 'cNvPr')
        for nv in ids:
            nv.setAttribute('id', str(self.next_id))
            self.next_id += 1
        self.tree.appendChild(node)
        return node

    def box(self, x, y, width, height, fill=None, name='Editable shape'):
        d = self.doc
        sp = element(d, 'p:sp')
        nv = element(d, 'p:nvSpPr', children=[
            element(d, 'p:cNvPr', {'id': self.next_id, 'name': name}),
            element(d, 'p:cNvSpPr'), element(d, 'p:nvPr')])
        self.next_id += 1
        sp.appendChild(nv)
        props = element(d, 'p:spPr')
        props.appendChild(element(d, 'a:xfrm', children=[
            element(d, 'a:off', {'x': round(x*EMU), 'y': round(y*EMU)}),
            element(d, 'a:ext', {'cx': round(width*EMU), 'cy': round(height*EMU)})]))
        props.appendChild(element(d, 'a:prstGeom', {'prst': 'rect'}, [element(d, 'a:avLst')]))
        props.appendChild(color(d, fill) if fill else element(d, 'a:noFill'))
        props.appendChild(element(d, 'a:ln', children=[element(d, 'a:noFill')]))
        sp.appendChild(props)
        self.tree.appendChild(sp)
        return sp

    def text(self, value, x, y, width, height, size=18, ink=NAVY, bold=False, align='l'):
        sp = self.box(x, y, width, height, name=value[:65])
        tx = element(self.doc, 'p:txBody')
        tx.appendChild(element(self.doc, 'a:bodyPr', {'wrap': 'square', 'lIns': '0', 'tIns': '0', 'rIns': '0', 'bIns': '0', 'anchor': 't'}))
        tx.appendChild(element(self.doc, 'a:lstStyle'))
        for line in value.split('\n'):
            tx.appendChild(paragraph(self.doc, line, size, ink, bold, align))
        sp.appendChild(tx)
        return sp

    def line(self, x, y, width, fill='D9E4EC'):
        return self.box(x, y, width, .012, fill, 'Thin divider')

    def table(self, values, x, y, widths, row_height=.51):
        d = self.doc
        frame = element(d, 'p:graphicFrame')
        frame.appendChild(element(d, 'p:nvGraphicFramePr', children=[
            element(d, 'p:cNvPr', {'id': self.next_id, 'name': 'Editable data split table'}),
            element(d, 'p:cNvGraphicFramePr'), element(d, 'p:nvPr')]))
        self.next_id += 1
        frame.appendChild(element(d, 'p:xfrm', children=[
            element(d, 'a:off', {'x': round(x*EMU), 'y': round(y*EMU)}),
            element(d, 'a:ext', {'cx': round(sum(widths)*EMU), 'cy': round(len(values)*row_height*EMU)})]))
        graphic = element(d, 'a:graphic')
        data = element(d, 'a:graphicData', {'uri': 'http://schemas.openxmlformats.org/drawingml/2006/table'})
        tbl = element(d, 'a:tbl')
        tbl.appendChild(element(d, 'a:tblPr', {'firstRow': '1', 'bandRow': '0'}))
        grid = element(d, 'a:tblGrid')
        for w in widths:
            grid.appendChild(element(d, 'a:gridCol', {'w': round(w*EMU)}))
        tbl.appendChild(grid)
        for ri, row in enumerate(values):
            tr = element(d, 'a:tr', {'h': round(row_height*EMU)})
            for ci, value in enumerate(row):
                cell = element(d, 'a:tc')
                tx = element(d, 'a:txBody', children=[element(d, 'a:bodyPr', {'anchor': 'ctr'}), element(d, 'a:lstStyle')])
                ink = GRAY if ri == 0 else TEAL if ci == 3 else NAVY
                tx.appendChild(paragraph(d, value, 14 if ri == 0 else 16, ink, ri == 0 or ci == 0 or ri == 4, 'l' if ci == 0 else 'ctr'))
                cell.appendChild(tx)
                fill = 'E5EEF3' if ri == 0 else 'E8F0F4' if ri == 3 else BG
                tcpr=element(d, 'a:tcPr', {'marL': '91440', 'marR': '91440', 'marT': '45720', 'marB': '45720'})
                for border in ['lnL','lnR','lnT']:
                    tcpr.appendChild(element(d,'a:'+border,children=[element(d,'a:noFill')]))
                tcpr.appendChild(element(d,'a:lnB',{'w':'6350'},[color(d,'D9E4EC')]))
                tcpr.appendChild(color(d,fill))
                cell.appendChild(tcpr)
                tr.appendChild(cell)
            tbl.appendChild(tr)
        data.appendChild(tbl)
        graphic.appendChild(data)
        frame.appendChild(graphic)
        self.tree.appendChild(frame)
        return frame


with ZipFile(SOURCE) as original:
    entries = {item.filename: original.read(item.filename) for item in original.infolist()}
    infos = original.infolist()
    pres = minidom.parseString(entries['ppt/presentation.xml'])
    pres_rels = minidom.parseString(entries['ppt/_rels/presentation.xml.rels'])
    rel_targets = {r.getAttribute('Id'):r.getAttribute('Target') for r in descendants(pres_rels, PR, 'Relationship')}
    slide_nodes = list(first(pres, P, 'sldIdLst').childNodes)
    slide_nodes = [n for n in slide_nodes if n.nodeType == Node.ELEMENT_NODE]
    paths = {i:posixpath.normpath(posixpath.join('ppt',rel_targets[n.getAttribute('r:id')])) for i,n in enumerate(slide_nodes,1)}
    docs = {n:minidom.parseString(entries[path]) for n,path in paths.items()}
    originals = {n:doc.cloneNode(True) for n,doc in docs.items()}

    # 16 + 17: one introduction containing examples, the split and imbalance.
    s = Slide(docs[16])
    pictures = [by_id(originals[16], i) for i in [16,19,22]]
    s.base({2,3,4,5,6,25})
    replace_text(by_id(docs[16],5),SECTIONS[0]['title'])
    s.text('87장',.67,1.63,1.8,.67,34,TEAL,True)
    s.text('결함 유형 정답이 있는 사진',2.48,1.75,4.6,.4,18,NAVY,True)
    s.text('전체 551장 · 정답 미공개 464장은 학습·평가 제외',.67,2.35,11.9,.4,15,GRAY)
    s.line(.67,2.95,12)
    s.text('결함 유형 3종',.67,3.16,5.4,.4,17,TEAL,True)
    s.text('정답 87장의 분할',6.63,3.16,5.5,.4,17,TEAL,True)
    for pic,x,label in zip(pictures,[.67,2.58,4.49],['오염','스크래치','표면 미가공']):
        newpic=s.add(pic)
        move_shape(newpic,x,3.79,1.73,1.85)
        crop_preserving_region(newpic,1.73,1.85,paths[16],entries)
        s.text(label,x,5.8,1.73,.35,16,NAVY,True,'ctr')
    s.table([
        ['유형','학습','검증','테스트'],
        ['오염','10','3','15'],
        ['스크래치','18','7','23'],
        ['표면 미가공','5','2','4'],
        ['합계','33','12','42'],
    ],6.63,3.76,[2.17,1.02,1.02,1.12],.47)
    s.text('학습 표본 편차  ·  스크래치 18장 / 미가공 5장',6.63,6.32,5.53,.4,14,RUST,True)
    s.text('VISION Ring · 결함 유형 분류',.67,6.57,5.6,.25,10,GRAY)

    # Keep the three original preprocessing images and all actual feature maps.
    replace_text(by_id(docs[19],5),'실제 중간 출력으로 합성곱층이 만드는 특징맵을 확인합니다.')
    replace_text(by_id(docs[20],5),'채널별 특징을 요약해 학습해야 할 분류기의 연결 수를 줄였습니다.')

    # Baseline slide is about the failure and the improvement hypothesis only.
    s = Slide(docs[21])
    for i in [8,9,10,11,12,13]:
        node=by_id(docs[21],i)
        node.parentNode.removeChild(node)
    replace_text(by_id(docs[21],5),SECTIONS[4]['title'])
    s.text('기준 RGB CNN · 20 epoch',.67,1.76,5.8,.4,17,TEAL,True)
    s.text('표면 미가공 4장',.67,2.62,5.9,.73,34,NAVY,True)
    s.text('모두 스크래치로 잘못 분류',.67,3.48,5.9,.48,21,RUST,True)
    s.line(.67,4.21,5.55)
    s.text('개선 가설',.67,4.6,5.5,.4,18,TEAL,True)
    s.text('전체 축소 과정에서',.67,5.11,5.65,.4,19,NAVY)
    s.text('작은 결함 단서가 약해졌을 가능성',.67,5.56,5.65,.45,19,NAVY)

    # Strategy slide describes implementation; validation and results move later.
    replace_text(by_id(docs[22],5),SECTIONS[5]['title'])
    replace_text(by_id(docs[22],30),'기존에 학습된 특징을 활용하는 전이학습')

    # Training slide: remove test confusion matrices and enlarge the actual chart.
    s = Slide(docs[23])
    graph = copy.deepcopy(by_id(originals[23],14))
    s.base({2,3,4,5,6,66})
    for i in [2,3]:
        node=by_id(docs[23],i)
        node.parentNode.removeChild(node)
    s.text('FoldedVision AI · 김현모',.67,.23,5.5,.35,11,NAVY,True)
    replace_text(by_id(docs[23],5),SECTIONS[6]['title'])
    s.text('분류기 16에포크 · 학습 33장 / 검증 12장',.67,1.77,11.7,.4,17,TEAL,True)
    newgraph=s.add(graph)
    # Preserve the 1440x840 chart aspect ratio, including all axis labels.
    move_shape(newgraph,.55,2.34,7.5,4.375)
    s.text('구성 선택',9.02,2.61,3.3,.35,16,TEAL,True)
    s.text('검증 Macro F1  0.833',9.02,3.03,3.55,.4,17,NAVY,True)
    s.line(9.02,3.65,3.27)
    s.text('가중치 선택',9.02,3.99,3.3,.35,16,TEAL,True)
    s.text('9에포크',9.02,4.4,3.4,.58,30,NAVY,True)
    s.text('검증 손실 최저 시점 복원',9.02,5.06,3.7,.4,15,GRAY)
    s.line(9.02,5.65,3.27)
    s.text('검증 12장',9.02,5.94,3.3,.35,16,TEAL,True)
    s.text('한 장 차이 ≈ 8.3%p',9.02,6.36,3.7,.4,16,NAVY)
    s.text('학습 기록: vision_ring_global_tiles_48_history.json',.67,6.76,8,.22,9,GRAY)

    # Final evaluation: combine the summary, the two matrices and one case.
    s = Slide(docs[24])
    case = copy.deepcopy(by_id(originals[24],12))
    truth = copy.deepcopy(by_id(originals[24],13))
    s.base({2,3,4,5,6,16})
    replace_text(by_id(docs[24],5),SECTIONS[7]['title'])
    s.text('동일 테스트 42장 · 결함 유형 분류',.67,1.76,11.9,.35,16,TEAL,True)
    s.text('정확도',.67,2.22,3,.31,15,GRAY)
    s.text('80.95%  →  92.86%',.67,2.64,6.4,.59,29,TEAL,True)
    s.text('정답 사진 34 / 42장 → 39 / 42장',.67,3.28,6.7,.31,14,GRAY)
    s.text('유형별 균형 점수 · Macro F1',7.5,2.22,5.1,.31,15,GRAY)
    s.text('0.568  →  0.891',7.5,2.64,5.15,.59,29,NAVY,True)
    s.line(.67,3.86,12)
    classes=['오염','스크래치','미가공']
    for ox,title,matrix in [(.67,'1차 기준',[[12,3,0],[1,22,0],[0,4,0]]),(4.64,'2차 개선',[[13,0,2],[1,22,0],[0,0,4]])]:
        cell=.57
        gx,gy=ox+.94,4.92
        s.text(title,ox,4.07,3.15,.35,16,TEAL,True)
        for ci,label in enumerate(classes):
            s.text(label,gx+ci*cell-.13,4.53,cell+.26,.3,10,GRAY,False,'ctr')
        for ri,label in enumerate(classes):
            s.text(label,ox,gy+ri*cell+.17,.85,.28,11,GRAY,False,'r')
            for ci,value in enumerate(matrix[ri]):
                fill=PALE if ri==ci else ORANGE if value else 'EAF0F5'
                s.box(gx+ci*cell,gy+ri*cell,cell-.015,cell-.015,fill,'Editable confusion matrix cell')
                s.text(str(value),gx+ci*cell,gy+ri*cell+.1,cell-.015,.38,20,NAVY if ri==ci else RUST if value else GRAY, bool(value),'ctr')
    s.text('행 = 정답 · 열 = 예측 · 대각선 = 정답 수',.67,6.79,7.8,.27,11,GRAY)
    s.text('같은 사진의 개선 사례 · 000073.jpg',8.77,4.1,3.9,.35,13,TEAL,True)
    newcase=s.add(case)
    # Preserve the original source aspect and transform its truth box with it.
    oldxf=first(case,A,'xfrm'); oldoff=first(oldxf,A,'off'); oldext=first(oldxf,A,'ext')
    oldx,oldy=[int(oldoff.getAttribute(k))/EMU for k in ['x','y']]
    oldw,oldh=[int(oldext.getAttribute(k))/EMU for k in ['cx','cy']]
    newx,newy,neww=9.37,4.56,2.30
    scale=neww/oldw; newh=oldh*scale
    move_shape(newcase,newx,newy,neww,newh)
    box=s.add(truth)
    txf=first(truth,A,'xfrm'); toff=first(txf,A,'off'); text=first(txf,A,'ext')
    bx,by=[int(toff.getAttribute(k))/EMU for k in ['x','y']]
    bw,bh=[int(text.getAttribute(k))/EMU for k in ['cx','cy']]
    move_shape(box,newx+(bx-oldx)*scale,newy+(by-oldy)*scale,bw*scale,bh*scale)
    s.text('1차  스크래치\n2차  표면 미가공',8.77,6.50,3.9,.55,13,NAVY,True)

    # Scope slide: keep the unique remaining-error example; remove total counts.
    replace_text(by_id(docs[25],5),SECTIONS[8]['title'])
    replace_text(by_id(docs[25],8),'정상·불량 자동 판정으로 확대하려면 추가 검증이 필요합니다.')
    replace_text(by_id(docs[25],10),'현재 활용')
    replace_text(by_id(docs[25],11),'추정 유형 표시 · REVIEW로 작업자 재검')
    replace_text(by_id(docs[25],12),'평가 한계')
    replace_text(by_id(docs[25],13),'정상 사진 0장 · 미가공 테스트 4장')
    replace_text(by_id(docs[25],16),'현장 검증이 필요한 사례 · 000055.jpg')

    # Remove only the merged EDA slide from active order. Its original XML and
    # assets remain in the package, and the full original deck is archived.
    removed=slide_nodes[16]
    removed_rid=removed.getAttribute('r:id')
    removed.parentNode.removeChild(removed)
    for rel in descendants(pres_rels,PR,'Relationship'):
        if rel.getAttribute('Id')==removed_rid:
            rel.parentNode.removeChild(rel)
    entries['ppt/presentation.xml']=pres.toxml(encoding='utf-8')
    entries['ppt/_rels/presentation.xml.rels']=pres_rels.toxml(encoding='utf-8')

    # Only literal page labels are changed outside the Ring slides.
    for old,doc in docs.items():
        if old==17:
            continue
        new=old if old<17 else old-1
        changed=False
        for sp in shapes(doc):
            nv=descendants(sp,P,'cNvPr')
            if nv and nv[0].getAttribute('name')=='Presentation page':
                if text_of(sp)!=str(new):
                    replace_text(sp,str(new)); changed=True
        if changed or 16<=old<=25:
            entries[paths[old]]=doc.toxml(encoding='utf-8')

    # Speaker notes contain exactly the rewritten speech, with page fields synced.
    for old in range(1,51):
        if old==17:
            continue
        new=old if old<17 else old-1
        rp=posixpath.join(posixpath.dirname(paths[old]),'_rels',posixpath.basename(paths[old])+'.rels')
        rel_doc=minidom.parseString(entries[rp])
        for rel in descendants(rel_doc,PR,'Relationship'):
            if not rel.getAttribute('Type').endswith('/notesSlide'):
                continue
            note_path=posixpath.normpath(posixpath.join(posixpath.dirname(paths[old]),rel.getAttribute('Target')))
            nd=minidom.parseString(entries[note_path])
            touched=False
            for sp in descendants(nd,P,'sp'):
                phs=descendants(sp,P,'ph')
                kind=phs[0].getAttribute('type') if phs else ''
                if kind=='body' and 16<=old<=25:
                    section=next(q for q in SECTIONS if q['old_slide']==old)
                    body=first(sp,P,'txBody')
                    for child in list(body.childNodes):
                        if child.nodeType==Node.ELEMENT_NODE and child.localName=='p':
                            body.removeChild(child)
                    for value in section['speech']:
                        body.appendChild(paragraph(nd,value,12))
                    touched=True
                elif kind=='sldNum' and text_of(sp) and text_of(sp)!=str(new):
                    replace_text(sp,str(new)); touched=True
            if touched:
                entries[note_path]=nd.toxml(encoding='utf-8')

    # Application slide count is metadata only; media and all graphs are reused.
    app_doc=minidom.parseString(entries['docProps/app.xml'])
    for node in app_doc.getElementsByTagName('Slides'):
        clear(node); node.appendChild(app_doc.createTextNode('49'))
    entries['docProps/app.xml']=app_doc.toxml(encoding='utf-8')

    target=HERE/'revised.pptx'
    with ZipFile(target,'w',compression=ZIP_DEFLATED,compresslevel=6) as out:
        for info in infos:
            out.writestr(copy.copy(info),entries[info.filename])

    # Canonical comparison ignores only the page number text, never any content.
    def normalized_without_page(data):
        doc=minidom.parseString(data)
        for sp in descendants(doc,P,'sp'):
            props=descendants(sp,P,'cNvPr')
            if props and props[0].getAttribute('name')=='Presentation page':
                replace_text(sp,'PAGE')
        return doc.toxml(encoding='utf-8')

    outside_checks=[]
    for old in list(range(1,16))+list(range(26,51)):
        path=paths[old]
        same=normalized_without_page(original.read(path))==normalized_without_page(entries[path])
        outside_checks.append({'old_slide':old,'new_slide':old if old<17 else old-1,'same_except_page_number':same})
    assert all(x['same_except_page_number'] for x in outside_checks)
    media_checks=[name for name in entries if name.startswith('ppt/media/')]
    assert all(entries[name]==original.read(name) for name in media_checks)
    for data_name,data in entries.items():
        if data_name.endswith(('.xml','.rels')):
            minidom.parseString(data)

    report={
        'date':'2026-11-27 Asia/Seoul',
        'source':str(SOURCE.relative_to(ROOT)),
        'source_sha256':sha(SOURCE.read_bytes()),
        'candidate_sha256':sha(target.read_bytes()),
        'before_slide_count':50,'after_slide_count':49,
        'ring_before':'16-25 (10 slides)','ring_after':'16-24 (9 slides)',
        'merge':'Original data introduction 16 + original EDA 17 -> new 16',
        'redistribution':'Training and model selection -> new 22; test metrics, both confusion matrices and same case -> new 23',
        'outside_ring':outside_checks,
        'unchanged_media_count':len(media_checks),
        'all_original_media_bytes_identical':True,
        'speech_contains_macro_f1':any(re.search(r'macro\s*f1',p,re.I) for sec in SECTIONS for p in sec['speech']),
        'source_files_used':['outputs/quality_upgrade/vision_ring_global_tiles_48_history.json','outputs/integration/ring_predictions.csv','outputs/quality_upgrade/vision_ring_transfer_predictions.csv'],
        'new_training':False,'visual_qa_complete':False,
    }
    assert not report['speech_contains_macro_f1']
    (HERE/'validation.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')

lines=['FoldedVision AI | Ring 발표 대본 | 김현모','2026-11-27 · 통합 PPT 16–24장 · 9장',
       '데이터 → 전처리 → 기준 CNN → 오류 → 개선 → 학습 확인 → 최종 평가 → 적용 범위','']
for sec in SECTIONS:
    lines.extend([f"{sec['slide']:02d}. {sec['title']}",f"[화면 짚기] {sec['cue']}",''])
    lines.extend(p+'\n' for p in sec['speech'])
    lines.append('')
(HERE/'script.txt').write_text('\n'.join(lines),encoding='utf-8-sig')

# A Word-compatible HTML handout is an intermediate, not a new public Page.
# Three A4 pages, three sections each, with the same paragraphs as PPT notes.
pages=[]
for i in range(0,len(SECTIONS),3):
    sections=[]
    for sec in SECTIONS[i:i+3]:
        paragraphs=''.join('<p>'+html.escape(p)+'</p>' for p in sec['speech'])
        sections.append('<h2>'+str(sec['slide'])+'  '+html.escape(sec['title'])+'</h2><p class="cue">화면 짚기 · '+html.escape(sec['cue'])+'</p>'+paragraphs)
    pages.append('<div class="page"><h1>FoldedVision AI / Ring 발표 대본</h1><div class="meta">김현모 · 2026-11-27 · 최종 PPT 16–24장</div>'+''.join(sections)+'</div>')
handout='''<!doctype html><html lang="ko"><head><meta charset="utf-8"><style>
@page { size:21cm 29.7cm; margin:1.7cm 1.8cm; }
body { font-family:"Malgun Gothic"; font-size:10.5pt; line-height:1.55; color:#17324D; }
h1 { font-size:17pt; margin:0 0 5pt; color:#17324D; }
h2 { font-size:13pt; margin:18pt 0 5pt; color:#008DA3; page-break-after:avoid; }
p { margin:6pt 0; }
.meta { font-size:9pt; color:#59758B; margin-bottom:15pt; }
.cue { font-size:9pt; color:#59758B; margin:0 0 6pt; }
.page { page-break-after:always; }
.page:last-child { page-break-after:auto; }
</style></head><body>'''+''.join(pages)+'</body></html>'
(HERE/'script.html').write_text(handout,encoding='utf-8-sig')
print(json.dumps({'candidate':str(target),'slide_count':49,'ring_slides':9,'speech_characters':sum(len(p) for sec in SECTIONS for p in sec['speech']),'media_preserved':len(media_checks)},ensure_ascii=False))
