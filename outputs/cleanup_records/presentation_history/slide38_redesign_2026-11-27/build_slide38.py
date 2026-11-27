"""Build only slide 38 from the user's 45-slide final attachment.

All numeric inputs are user-provided. The user explicitly confirmed that the
loss amounts aggregate all three parts at KRW 13,000 per defective part.
No original deck or existing project master is edited.
"""
from __future__ import annotations

import ast
import copy
import hashlib
import json
import posixpath
from pathlib import Path
from xml.dom import Node, minidom
from zipfile import ZIP_DEFLATED, ZipFile

HERE=Path(__file__).resolve().parent
ROOT=HERE.parents[3]
SOURCE=next(Path('C:/Users/kdt66/Downloads').glob('FoldedVision_* (2).pptx'))
OUTPUT=ROOT/'outputs/presentation/FoldedVision_38페이지_손실비교.pptx'
A='http://schemas.openxmlformats.org/drawingml/2006/main'
P='http://schemas.openxmlformats.org/presentationml/2006/main'
R='http://schemas.openxmlformats.org/officeDocument/2006/relationships'
PR='http://schemas.openxmlformats.org/package/2006/relationships'
EMU=914400
NAVY,TEAL,GRAY,RUST='17324D','008DA3','59758B','AA5636'
BG,PALE,ORANGE='F8FAFC','D9EDF0','F9EDD9'

# Reuse OOXML drawing functions only. Executable build statements from the
# previous Ring revision are deliberately excluded from this AST module.
helper=HERE.parent/'ring_consolidation_2026-11-27/build_revision.py'
tree=ast.parse(helper.read_text(encoding='utf-8'))
definitions=[n for n in tree.body if isinstance(n,(ast.Import,ast.ImportFrom,ast.FunctionDef,ast.ClassDef))]
exec(compile(ast.Module(body=definitions,type_ignores=[]),str(helper),'exec'),globals())


def main():
    with ZipFile(SOURCE) as src:
        package={n:src.read(n) for n in src.namelist()}
    source_hash=hashlib.sha256(SOURCE.read_bytes()).hexdigest()
    pres=minidom.parseString(package['ppt/presentation.xml'])
    rels=minidom.parseString(package['ppt/_rels/presentation.xml.rels'])
    targets={r.getAttribute('Id'):r.getAttribute('Target') for r in descendants(rels,PR,'Relationship')}
    active=descendants(first(pres,P,'sldIdLst'),P,'sldId')
    chosen=active[37]
    chosen_rid=chosen.getAttribute('r:id')
    slide_path=posixpath.normpath(posixpath.join('ppt',targets[chosen_rid]))
    (HERE/'original_slide38.xml').write_bytes(package[slide_path])
    for node in active:
        if node is not chosen:
            node.parentNode.removeChild(node)
    for rel in descendants(rels,PR,'Relationship'):
        if rel.getAttribute('Type').endswith('/slide') and rel.getAttribute('Id')!=chosen_rid:
            rel.parentNode.removeChild(rel)
    package['ppt/presentation.xml']=pres.toxml(encoding='utf-8')
    package['ppt/_rels/presentation.xml.rels']=rels.toxml(encoding='utf-8')

    doc=minidom.parseString(package[slide_path])
    slide=Slide(doc)
    slide.base(set())
    slide.box(0,0,13.333333,7.5,BG,'White slide background')
    slide.text('FoldedVision AI',.62,.23,5,.3,11,NAVY,True)
    slide.text('종합  /  연간 손실 시나리오',8,.23,4.7,.3,11,TEAL,True,'r')
    slide.text('사전 검사 전후, 예상 손실 비교',.62,.72,12.1,.62,31,NAVY,True)
    slide.text('3종 합산 · 불량 1개당 손실 13,000원 · 생산량과 불량률을 가정한 비교',.62,1.40,12.1,.32,14,GRAY)

    # A single formula strip, with no decorative card grid.
    slide.box(.62,1.93,12.08,.58,'E5F1F3','Initial-defect formula strip')
    slide.text('30,000,000개  ×  0.0025% (25 ppm)  =  부품별 750개',.85,2.04,11.64,.36,21,NAVY,True)

    # Editorial table: generous spacing, native text, pale horizontal rules.
    x=.62
    widths=[2.05,3.30,2.18,2.18,2.37]
    xs=[x]
    for width in widths[:-1]:
        xs.append(xs[-1]+width)
    y=2.85
    headings=['검사 대상','적용 비율 · 근거','검사 전 불량','적용 후 잔존*','가정상 감소']
    for i,label in enumerate(headings):
        slide.text(label,xs[i]+(.13 if i<2 else 0),y,widths[i]-.13,.3,13,GRAY,True,'l' if i<2 else 'ctr')
    slide.line(x,y+.40,sum(widths),'CADBE4')
    data=[
        ('Lens (커버)','202/215 · 93.95%','750개','45개','705개'),
        ('Ring*','유형 분류 39/42 · 92.86%','750개','54개','696개'),
        ('PCB4','20/20 · 100%','750개','0개','750개'),
    ]
    for ri,row in enumerate(data):
        ry=y+.49+ri*.55
        if ri==1:
            slide.box(x,ry-.045,sum(widths),.54,'EEF3F7','Ring assumption row')
        for ci,value in enumerate(row):
            slide.text(value,xs[ci]+(.13 if ci<2 else 0),ry+.04,widths[ci]-.13,.34,
                       15 if ci==1 else 17,
                       TEAL if ci==4 else NAVY if ci!=1 else GRAY,
                       ci in [0,3,4], 'l' if ci<2 else 'ctr')
        slide.line(x,ry+.49,sum(widths),'DEE7EE')

    # Financial totals are compared on one baseline with their formulas below.
    money_y=5.07
    for left,label,value,formula,ink in [
        (.62,'검사 전 합산 손실','29,250,000원','750개 × 3종 × 13,000원',NAVY),
        (4.85,'적용 후 예상 손실','1,287,000원','(45 + 54 + 0)개 × 13,000원',NAVY),
        (9.02,'예상 회피 손실','27,963,000원','29,250,000 − 1,287,000원',TEAL),
    ]:
        width=3.68
        slide.text(label,left,money_y,width,.29,13,GRAY,True)
        slide.text(value,left,money_y+.39,width,.51,26 if left<9 else 27,ink,True)
        slide.text(formula,left,money_y+.98,width,.29,11,GRAY)

    # Recompute the projection rather than preserving the source's 10-won typo.
    slide.line(.62,6.40,12.08,'CADBE4')
    slide.text('연 1억 개 확대 가정',.62,6.55,2.45,.32,14,TEAL,True)
    slide.text('27,963,000원 × (1억 / 3천만) = 약 93,210,000원',3.00,6.54,9.70,.37,17,NAVY,True,'r')
    slide.text('* Ring은 유형 분류율을 차단율로 대입한 가정이며 실제 자동 차단율은 미측정입니다.',.62,7.02,11.5,.22,10,GRAY)
    slide.text('잔존 수량은 반올림 · PCB 0개는 테스트 불량 20장 기준 · 재검·오검출·검사 운영비 제외',.62,7.25,11.5,.22,10,GRAY)
    slide.text('38',12.20,7.25,.5,.22,10,GRAY,False,'r')
    package[slide_path]=doc.toxml(encoding='utf-8')

    note_rel=posixpath.join(posixpath.dirname(slide_path),'_rels',posixpath.basename(slide_path)+'.rels')
    srels=minidom.parseString(package[note_rel])
    note_target=next(r.getAttribute('Target') for r in descendants(srels,PR,'Relationship') if r.getAttribute('Type').endswith('/notesSlide'))
    note_path=posixpath.normpath(posixpath.join(posixpath.dirname(slide_path),note_target))
    nd=minidom.parseString(package[note_path])
    notes=[
        '첨부한 최종본의 실제 38번째 슬라이드만 다시 제작했다. 원본 화면의 쪽번호 42는 실제 위치에 맞춰 38로 표시했다. 원본 첨부 파일과 프로젝트의 통합 최종 PPT는 수정하지 않았다.',
        '사용자가 확인한 손실 계산 기준은 부품 3종 합산, 불량 1개당 13,000원이다. 부품별 연 30,000,000개, 불량률 0.000025 = 0.0025% = 25 ppm으로 가정하면 부품별 불량은 750개다. 원본의 5~50 ppm 범위 중 계산에 대입한 값은 25 ppm이다.',
        'Lens는 별도 3CAD 카메라 커버의 이진 검출률 202/215를 적용한 가정이다. 750 × (1−202/215) = 약 45.35개를 45개로 반올림했다. Ring은 유형 정분류율 39/42를 차단율로 대입한 가정으로 750 × (1−39/42) = 약 53.57개를 54개로 반올림했다. Ring의 실제 자동 NG 검출률은 미측정이고 실제 판정은 REVIEW다. PCB4 0개는 테스트 불량 20장 중 20장에 해당하는 비율을 적용한 값이며 현장 무누락 보장이 아니다.',
        '검사 전 손실: (750+750+750) × 13,000 = 29,250,000원. 도입 후 손실: (45+54+0) × 13,000 = 1,287,000원. 회피 손실: 29,250,000−1,287,000 = 27,963,000원. 재검, 오검출, 설비·검사 운영비를 제외한 가정이며 순이익이나 실측 절감액으로 해석하지 않는다.',
        '연 100,000,000개 확대 시나리오: 27,963,000 × (100,000,000 / 30,000,000) = 93,210,000원. 원문 93,209,990원은 비례식에 맞춰 10원 수정했다. 공장명과 실제 CAPA를 검증한 수치로 표시하지 않고 생산량 확대 가정으로 표현했다.',
        '표, 수식, 금액, 주석은 모두 PowerPoint에서 편집 가능한 텍스트와 도형이다. 생성 이미지로 숫자나 표를 그리지 않았다.'
    ]
    for sp in descendants(nd,P,'sp'):
        ph=descendants(sp,P,'ph')
        kind=ph[0].getAttribute('type') if ph else ''
        if kind=='body':
            body=first(sp,P,'txBody')
            for n in list(body.childNodes):
                if n.nodeType==Node.ELEMENT_NODE and n.localName=='p':body.removeChild(n)
            for value in notes:body.appendChild(paragraph(nd,value,12))
        elif kind=='sldNum' and descendants(sp,A,'t'):
            replace_text(sp,'38')
    package[note_path]=nd.toxml(encoding='utf-8')

    app=minidom.parseString(package['docProps/app.xml'])
    for name in ['Slides','Notes']:
        for n in app.getElementsByTagName(name):
            clear(n);n.appendChild(app.createTextNode('1'))
    package['docProps/app.xml']=app.toxml(encoding='utf-8')

    # Keep exactly the reachable OPC parts; exclude the rest of the 45-slide
    # attachment, its many evaluation photos, and its 38 MB embedded movie.
    selected=set()
    def visit(part):
        if part and part in selected:return
        if part:selected.add(part)
        relpath=posixpath.join(posixpath.dirname(part),'_rels',posixpath.basename(part)+'.rels') if part else '_rels/.rels'
        if relpath not in package:return
        selected.add(relpath)
        for rel in descendants(minidom.parseString(package[relpath]),PR,'Relationship'):
            if rel.getAttribute('TargetMode')=='External':continue
            target=rel.getAttribute('Target')
            dest=target.lstrip('/') if target.startswith('/') else posixpath.normpath(posixpath.join(posixpath.dirname(part),target))
            dest=dest.split('#')[0]
            assert dest in package,(part,dest)
            visit(dest)
    visit('')
    ct=minidom.parseString(package['[Content_Types].xml'])
    for n in list(ct.documentElement.childNodes):
        if n.nodeType==Node.ELEMENT_NODE and n.localName=='Override' and n.getAttribute('PartName').lstrip('/') not in selected:
            ct.documentElement.removeChild(n)
    package['[Content_Types].xml']=ct.toxml(encoding='utf-8')
    selected.add('[Content_Types].xml')
    OUTPUT.parent.mkdir(parents=True,exist_ok=True)
    with ZipFile(OUTPUT,'w',ZIP_DEFLATED,compresslevel=8) as out:
        for name in sorted(selected):out.writestr(name,package[name])
    assert hashlib.sha256(SOURCE.read_bytes()).hexdigest()==source_hash
    report={
        'date':'2026-11-27 Asia/Seoul','source':str(SOURCE),'source_sha256':source_hash,
        'source_slide_count':45,'source_slide_ordinal':38,'source_slide_displayed_page':42,
        'output':str(OUTPUT.relative_to(ROOT)),'output_slide_count':1,'output_bytes':OUTPUT.stat().st_size,
        'source_unchanged':True,'project_master_changed':False,
        'user_confirmed_assumptions':{'sum_three_parts':True,'loss_per_defect_krw':13000},
        'defects_before_by_part':[750,750,750],'defects_after_by_part':[45,54,0],
        'loss_before_krw':29250000,'loss_after_krw':1287000,'avoided_loss_krw':27963000,
        'projection_100million_krw':93210000,'projection_correction_krw':10,
        'original_ring_assumption_disclosure_retained':True,
        'native_editable_shapes':True,'generated_image_used':False,'render_checked':False
    }
    (HERE/'validation.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(json.dumps({'output':str(OUTPUT),'bytes':OUTPUT.stat().st_size,'parts':len(selected)},ensure_ascii=False))


if __name__=='__main__':
    main()
