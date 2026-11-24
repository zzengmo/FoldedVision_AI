"""Continue the existing PCB YOLO with annotated PCB4 and original training data."""
import hashlib
import json
import random
from pathlib import Path

import yaml
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent
OUT = ROOT / 'data/pcb4_yolo'
# Preserve all original class IDs; avoid silently equating different defect definitions.
EXTRA = ['pcb4_component_damage', 'pcb4_foreign_material', 'pcb4_miss',
         'pcb4_oxidation', 'pcb4_scratch']


def configure_runtime():
    """Keep GPU model execution with exact CPU NMS when this torchvision lacks CUDA NMS."""
    import torch
    import torchvision.ops
    if getattr(torchvision.ops.nms, '_pcb_cpu_fallback', False): return
    native = torchvision.ops.nms
    def compatible_nms(boxes, scores, iou_threshold):
        try:
            return native(boxes, scores, iou_threshold)
        except NotImplementedError:
            if boxes.is_cuda:
                return native(boxes.cpu(), scores.cpu(), iou_threshold).to(boxes.device)
            raise
    compatible_nms._pcb_cpu_fallback = True
    torchvision.ops.nms = compatible_nms


configure_runtime()


def prepare():
    original = ROOT / 'data/final_solder'
    config = yaml.safe_load((original / 'data.yaml').read_text(encoding='utf-8'))
    names = config['names']
    if isinstance(names, dict):
        names = [names[i] for i in range(len(names))]
    names = list(names) + EXTRA
    config['path'] = str(original)
    (ROOT/'data/local.yaml').write_text(yaml.safe_dump(config), encoding='utf-8')
    groups, seen = {}, set()
    for image in sorted((ROOT / 'data/visa/VisA/pcb4').glob('*/*.jpg')):
        with Image.open(image) as im:
            w, h = im.size
            digest = hashlib.sha256(im.convert('RGB').tobytes()).hexdigest()
        if digest in seen:
            raise ValueError(f'Duplicate image: {image}')
        seen.add(digest)
        lines = []
        if image.parent.name != 'good':
            annotation = image.with_suffix('.json')
            if not annotation.exists():
                raise FileNotFoundError(f'Missing real bounding-box annotation: {annotation}')
            data = json.loads(annotation.read_text(encoding='utf-8'))
            if (data['imageWidth'], data['imageHeight']) != (w, h):
                raise ValueError(f'Annotation dimensions differ: {image}')
            if not data['shapes']:
                raise ValueError(f'Empty anomaly annotation: {image}')
            for shape in data['shapes']:
                if shape['shape_type'] != 'rectangle' or len(shape['points']) != 2:
                    raise ValueError(f'Unsupported shape: {annotation}')
                class_id = names.index('pcb4_' + shape['label'])
                (xa, ya), (xb, yb) = shape['points']
                x1, x2 = sorted((max(0, min(w, xa)), max(0, min(w, xb))))
                y1, y2 = sorted((max(0, min(h, ya)), max(0, min(h, yb))))
                if x1 >= x2 or y1 >= y2:
                    raise ValueError(f'Degenerate box: {annotation}')
                lines.append(f'{class_id} {(x1+x2)/2/w:.8f} {(y1+y2)/2/h:.8f} {(x2-x1)/w:.8f} {(y2-y1)/h:.8f}')
        groups.setdefault(image.parent.name, []).append((image, lines, digest))
    if sum(map(len, groups.values())) != 200:
        raise ValueError('Expected the pinned 200-image PCB4 dataset')
    rng = random.Random(42)
    manifest = []
    for category, items in sorted(groups.items()):
        rng.shuffle(items)
        a, b = int(len(items)*.6), int(len(items)*.8)
        for split, rows in [('train', items[:a]), ('val', items[a:b]), ('test', items[b:])]:
            for image, lines, digest in rows:
                target = OUT / 'images' / split / f'{category}_{image.name}'
                label = OUT / 'labels' / split / (target.stem + '.txt')
                target.parent.mkdir(parents=True, exist_ok=True)
                label.parent.mkdir(parents=True, exist_ok=True)
                payload=image.read_bytes()
                if not target.exists() or target.read_bytes()!=payload:
                    target.write_bytes(payload)
                label_text='\n'.join(lines)
                if not label.exists() or label.read_text(encoding='utf-8')!=label_text:
                    label.write_text(label_text, encoding='utf-8')
                manifest.append(dict(source=str(image.relative_to(ROOT)), split=split,
                                     category=category, pixel_sha256=digest, boxes=len(lines)))
    for mixed in (False, True):
        cfg = {'path': str(OUT), 'names': names, 'nc': len(names)}
        for split in ('train', 'val', 'test'):
            paths = [str(OUT / 'images' / split)]
            if mixed:
                paths.insert(0, str(original / 'images' / split))
            cfg[split] = paths
        (OUT / ('mixed.yaml' if mixed else 'pcb4.yaml')).write_text(yaml.safe_dump(cfg), encoding='utf-8')
    (OUT / 'manifest.json').write_text(json.dumps(manifest, indent=2), encoding='utf-8')
    return {'images': len(manifest), 'classes': names,
            'splits': {s: sum(r['split'] == s for r in manifest) for s in ('train','val','test')}}


def train(epochs=30, device='cpu', smoke=False):
    from ultralytics import YOLO
    prepare()
    data = OUT / 'mixed.yaml'
    if smoke:
        manifest = json.loads((OUT/'manifest.json').read_text())
        rows = [r for r in manifest if r['split']=='train']
        selected = [next(r for r in rows if r['category']==c) for c in sorted({r['category'] for r in rows})]
        paths = [str(OUT/'images/train'/f"{r['category']}_{Path(r['source']).name}") for r in selected]
        paths += [str(p) for p in sorted((ROOT/'data/final_solder/images/train').glob('*'))[:6]]
        (OUT/'smoke_train.txt').write_text('\n'.join(paths), encoding='utf-8')
        cfg = yaml.safe_load(data.read_text())
        cfg['train'] = str(OUT/'smoke_train.txt')
        cfg['val'] = str(OUT/'images/val')
        data = OUT/'smoke.yaml'
        data.write_text(yaml.safe_dump(cfg), encoding='utf-8')
    return YOLO(str(ROOT / 'models/best.pt')).train(
        data=str(data), epochs=1 if smoke else epochs, imgsz=800, batch=4,
        lr0=0.001, patience=10, seed=42, workers=0, device=device,
        optimizer='AdamW', amp=True, plots=True,
        project=str(ROOT / 'runs'), name='pcb4_smoke' if smoke else 'pcb4_transfer', exist_ok=False)


def evaluate(weights, split='val', device='cpu'):
    from ultralytics import YOLO
    results = {}
    count=len(YOLO(str(weights)).names)
    for domain in ('original','pcb4'):
        results[domain] = detection_eval(weights,domain,split,device) if domain=='original' or count==14 else {'metrics':None,'reason':'Native baseline classes do not cover PCB4 labels'}
    return results


def write_json(path, data):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2, allow_nan=False), encoding='utf-8')


def audit_and_eda():
    """Read every source annotation and label, retain actual counts and visual evidence."""
    import csv
    from collections import Counter, defaultdict
    import numpy as np
    import matplotlib.pyplot as plt
    import cv2
    from PIL import ImageDraw, ImageOps
    prepare()
    folder = ROOT/'outputs/eda'
    folder.mkdir(parents=True, exist_ok=True)
    manifest = json.loads((OUT/'manifest.json').read_text())
    rows, boxrows, issues, hashes = [], [], [], defaultdict(list)
    canvas = Image.new('RGB', (1200, 800), 'white')
    for i, category in enumerate(['good','component_damage','foreign_material','miss','oxidation','scratch']):
        row = next(r for r in manifest if r['category']==category)
        image = ROOT/row['source']
        with Image.open(image) as im:
            im = im.convert('RGB')
            draw = ImageDraw.Draw(im)
            if category != 'good':
                ann = json.loads(image.with_suffix('.json').read_text(encoding='utf-8'))
                for shape in ann['shapes']:
                    a,b = shape['points']
                    draw.rectangle([min(a[0],b[0]),min(a[1],b[1]),max(a[0],b[0]),max(a[1],b[1])], outline='red', width=5)
            preview = ImageOps.contain(im,(395,365))
            canvas.paste(preview,((i%3)*400,(i//3)*400+30))
            ImageDraw.Draw(canvas).text(((i%3)*400+5,(i//3)*400+5),category,fill='black')
    canvas.save(folder/'representatives_boxes.jpg')
    for row in manifest:
        image = ROOT/row['source']
        with Image.open(image) as im:
            w,h = im.size
            hashes[hashlib.sha256(im.convert('RGB').tobytes()).hexdigest()].append(row['source'])
        label = OUT/'labels'/row['split']/(image.parent.name+'_'+image.stem+'.txt')
        boxes = [list(map(float,line.split())) for line in label.read_text().splitlines() if line.strip()]
        rows.append(dict(image_id=image.parent.name+'_'+image.name,category=row['category'],split=row['split'],width=w,height=h,boxes=len(boxes)))
        for cls,x,y,bw,bh in boxes:
            boxrows.append(dict(image_id=rows[-1]['image_id'],class_id=int(cls),cx=x,cy=y,width_px=bw*w,height_px=bh*h,area_px=bw*w*bh*h,area_at_800=bw*w*bh*h*(800/max(w,h))**2))
            if not (0<=cls<14 and 0<=x<=1 and 0<=y<=1 and 0<bw<=1 and 0<bh<=1): issues.append(rows[-1]['image_id'])
    original = {}
    original_hashes = defaultdict(list)
    for split in ('train','val','test'):
        images = sorted((ROOT/'data/final_solder/images'/split).glob('*'))
        counts=Counter(); normal=0; missing=[]
        for image in images:
            label = ROOT/'data/final_solder/labels'/split/(image.stem+'.txt')
            if not label.exists(): missing.append(image.name); continue
            lines = label.read_text().splitlines()
            normal += int(not lines)
            for line in lines:
                values=list(map(float,line.split()))
                if len(values)!=5 or not 0<=values[0]<9 or any(not 0<=v<=1 for v in values[1:]) or min(values[3:])<=0:
                    issues.append(str(label))
                counts[int(values[0])]+=1
            with Image.open(image) as im:
                original_hashes[hashlib.sha256(im.convert('RGB').tobytes()).hexdigest()].append(f'{split}/{image.name}')
        original[split]={'images':len(images),'normal':normal,'defective':len(images)-normal-len(missing),'missing_labels':missing,'class_boxes':dict(counts)}
    for name, data in [('images.csv',rows),('boxes.csv',boxrows)]:
        with (folder/name).open('w',newline='',encoding='utf-8-sig') as f:
            writer=csv.DictWriter(f,fieldnames=list(data[0]));writer.writeheader();writer.writerows(data)
    duplicates=[v for v in original_hashes.values() if len(v)>1]
    summary={'pcb4_images':len(rows),'pcb4_normal':sum(r['category']=='good' for r in rows),'pcb4_defective':sum(r['category']!='good' for r in rows),
             'category_images':dict(Counter(r['category'] for r in rows)), 'box_count_distribution':dict(Counter(r['boxes'] for r in rows)),
             'boxes':len(boxrows),'resolutions':dict(Counter(f"{r['width']}x{r['height']}" for r in rows)),
             'area_px_quantiles':np.quantile([r['area_px'] for r in boxrows],[0,.25,.5,.75,1]).tolist(),
             'boxes_under_32_squared_at_800':sum(r['area_at_800']<1024 for r in boxrows),
             'pcb4_duplicates':[v for v in hashes.values() if len(v)>1], 'original':original,
             'cross_domain_exact_duplicates':[hashes[k]+original_hashes[k] for k in hashes.keys() & original_hashes.keys()],
             'original_exact_duplicate_groups':duplicates,'label_errors':issues,
             'scratch_limitation':'Only 3 train, 1 validation, 1 test image; class AP is highly unstable.',
             'class_policy':'Keep 14 source-specific classes: similar names do not establish equivalent annotation policies.'}
    write_json(folder/'audit.json',summary)
    fig,axes=plt.subplots(2,3,figsize=(15,8))
    cats=Counter(r['category'] for r in rows)
    axes[0,0].bar(cats.keys(),cats.values());axes[0,0].tick_params(axis='x',rotation=45);axes[0,0].set_title('PCB4 category images')
    axes[0,1].hist([r['boxes'] for r in rows]);axes[0,1].set_title('Boxes per image')
    axes[0,2].hist([r['area_px'] for r in boxrows],bins=25);axes[0,2].set_title('Box area in original pixels')
    axes[1,0].hist([r['area_at_800'] for r in boxrows],bins=25);axes[1,0].set_title('Box area after letterbox to 800')
    axes[1,1].scatter([r['cx'] for r in boxrows],[r['cy'] for r in boxrows],s=12);axes[1,1].invert_yaxis();axes[1,1].set_title('Normalized defect centers')
    axes[1,2].scatter([r['width'] for r in rows],[r['height'] for r in rows]);axes[1,2].set_title('Image width / height')
    fig.tight_layout();fig.savefig(folder/'distributions.png');plt.close(fig)
    source=cv2.imread(str(ROOT/next(r['source'] for r in manifest if r['category']=='scratch')))
    gray=cv2.cvtColor(source,cv2.COLOR_BGR2GRAY)
    enhanced=cv2.createCLAHE(clipLimit=2,tileGridSize=(8,8)).apply(gray)
    cv2.imwrite(str(folder/'opencv_preprocessing_comparison.jpg'),np.concatenate([source,cv2.cvtColor(gray,cv2.COLOR_GRAY2BGR),cv2.cvtColor(enhanced,cv2.COLOR_GRAY2BGR)],axis=1))
    # Original-domain annotated examples enable a visual class-policy review.
    names=yaml.safe_load((ROOT/'data/local.yaml').read_text())['names']
    examples={}
    for label in sorted((ROOT/'data/final_solder/labels/train').glob('*.txt')):
        lines=[list(map(float,l.split())) for l in label.read_text().splitlines() if l.strip()]
        for values in lines:
            cls=int(values[0])
            if cls not in examples:examples[cls]=(label,lines)
        if len(examples)==9:break
    sheet=Image.new('RGB',(1200,1200),'white')
    for i,(cls,(label,lines)) in enumerate(sorted(examples.items())):
        candidates=list((ROOT/'data/final_solder/images/train').glob(label.stem+'.*'))
        with Image.open(candidates[0]) as im:
            im=im.convert('RGB');w,h=im.size;draw=ImageDraw.Draw(im)
            for c,x,y,bw,bh in lines:
                if int(c)==cls:draw.rectangle([(x-bw/2)*w,(y-bh/2)*h,(x+bw/2)*w,(y+bh/2)*h],outline='red',width=3)
            sheet.paste(ImageOps.contain(im,(395,360)),((i%3)*400,(i//3)*400+30))
            ImageDraw.Draw(sheet).text(((i%3)*400+5,(i//3)*400+5),names[cls],fill='black')
    sheet.save(folder/'original_class_policy_examples.jpg')
    return summary


def detection_eval(weights, domain='original', split='val', device='0'):
    """Model and dataset class dimensions must match, including old-domain candidate eval."""
    from ultralytics import YOLO
    model=YOLO(str(weights))
    cfg=yaml.safe_load((OUT/'mixed.yaml' if len(model.names)==14 else ROOT/'data/local.yaml').read_text())
    if domain=='original':
        for s in ('train','val','test'):cfg[s]=str(ROOT/'data/final_solder/images'/s)
    else:
        if len(model.names)!=14: raise ValueError('PCB4 class AP is undefined for the 9-class baseline')
        for s in ('train','val','test'):cfg[s]=str(OUT/'images'/s)
    path=OUT/f'eval_{domain}_{len(model.names)}.yaml'
    path.write_text(yaml.safe_dump(cfg),encoding='utf-8')
    result=model.val(data=str(path),split=split,imgsz=800,batch=4,device=device,workers=0,conf=.001,iou=.7,max_det=300,
                     project=str(ROOT/'runs'),name=f'{Path(weights).stem}_{domain}_{split}',plots=True)
    report={'weights':str(weights),'domain':domain,'split':split,'metrics':{k:float(v) for k,v in result.results_dict.items()},
            'evaluation_settings':{'imgsz':800,'conf':.001,'iou':.7,'max_det':300,'native_end_to_end':bool(getattr(model.model,'end2end',False))},
            'speed_ms':result.speed,'class_ap':{model.names[int(i)]:{'precision':float(result.box.p[j]),'recall':float(result.box.r[j]),'ap50':float(result.box.ap50[j]),'ap50_95':float(result.box.ap[j])} for j,i in enumerate(result.box.ap_class_index)}}
    report['classes_without_ground_truth']=[name for name in model.names.values() if name not in report['class_ap']]
    write_json(ROOT/'outputs/evaluation'/f'{Path(weights).parent.parent.name}_{Path(weights).stem}_{domain}_{split}.json',report)
    return report


def image_predictions(weights, split='val', device='0', save_examples=False, domain='pcb4'):
    import time
    from ultralytics import YOLO
    model=YOLO(str(weights));rows=[]
    manifest=json.loads((OUT/'manifest.json').read_text())
    if domain=='original':
        manifest=[]
        for image in sorted((ROOT/'data/final_solder/images'/split).glob('*')):
            label=ROOT/'data/final_solder/labels'/split/(image.stem+'.txt')
            manifest.append({'split':split,'category':'defective' if label.read_text().strip() else 'good','source':str(image)})
    for row in [r for r in manifest if r['split']==split]:
        image=Path(row['source']) if domain=='original' else OUT/'images'/split/f"{row['category']}_{Path(row['source']).name}"
        start=time.perf_counter()
        result=model.predict(str(image),imgsz=800,conf=0.001,iou=0.45,max_det=300,device=device,verbose=False)[0]
        detections=[{'class_id':int(b.cls.item()),'label':model.names[int(b.cls.item())],'confidence':float(b.conf.item()),'bbox_xyxy':b.xyxy[0].cpu().tolist()} for b in result.boxes]
        rows.append({'image_id':image.name,'path':str(image),'category':row['category'],'split':split,
                     'y_true':int(row['category']!='good'),'defect_score':max((d['confidence'] for d in detections),default=0.0),
                     'inference_ms':(time.perf_counter()-start)*1000,'detections':detections})
    return rows


def select_model(candidate, baseline_report, device='0'):
    """Predeclared gate: old-domain mAP50-95 drop <= .05 and PCB4 image F1 improves."""
    import shutil
    original=detection_eval(candidate,'original','val',device)
    pcb4=detection_eval(candidate,'pcb4','val',device)
    base_rows=image_predictions(ROOT/'models/best.pt','val',device)
    rows=image_predictions(candidate,'val',device)
    bt=choose_threshold(base_rows);ct=choose_threshold(rows)
    bm=classification_metrics(base_rows,bt);cm=classification_metrics(rows,ct)
    delta=original['metrics']['metrics/mAP50-95(B)']-baseline_report['metrics']['metrics/mAP50-95(B)']
    accept=delta>=-.05 and cm['f1']>bm['f1']
    selected=ROOT/'models/pcb_yolo_final.pt' if accept else ROOT/'models/best.pt'
    if accept:
        if selected.exists():
            if hashlib.sha256(selected.read_bytes()).digest()!=hashlib.sha256(Path(candidate).read_bytes()).digest():
                raise FileExistsError('Preserve existing final model; archive explicitly before replacing')
        else:
            shutil.copy2(candidate,selected)
    report={'candidate':str(candidate),'selected':str(selected),'accepted_finetune':accept,
            'rule':'original val mAP50-95 drop <= 0.05 absolute AND PCB4 val image F1 > baseline',
            'original_map_delta':delta,'baseline_image_val':bm,'candidate_image_val':cm,
            'baseline_threshold':bt,'candidate_threshold':ct,'original_validation':original,'pcb4_validation':pcb4}
    write_json(ROOT/'outputs/integration/model_selection.json',report)
    write_json(ROOT/'outputs/integration/validation_predictions.json',{'baseline':base_rows,'candidate':rows})
    return selected, ct if accept else bt, rows if accept else base_rows, report


def export_integration(weights, threshold, detection_report, validation_rows, baseline_weights=None, device='0'):
    """Run held-out test once after selection; export team files and actual portfolio plots."""
    import csv
    import shutil
    import numpy as np
    import matplotlib.pyplot as plt
    import ultralytics
    import torch, torchvision, numpy, cv2
    from ultralytics import YOLO
    folder=ROOT/'outputs/integration';folder.mkdir(parents=True,exist_ok=True)
    rows=image_predictions(weights,'test',device)
    if len({r['image_id'] for r in rows})!=len(rows):
        raise ValueError('Duplicate final-test image IDs; refusing integration export')
    version=Path(weights).stem+'-'+hashlib.sha256(Path(weights).read_bytes()).hexdigest()[:12]
    metrics=classification_metrics(rows,threshold)
    metrics.update(dataset_name='PCB4 zhaolutuan/0422 pinned custom split',task_type='image_binary_classification_and_object_detection',
                   train_count=120,validation_count=40,test_count=len(rows),threshold=threshold,
                   count_scope='PCB4 benchmark split; mixed training run used 3836 original + 120 PCB4 images',
                   mixed_training_unique_images=3956,mixed_training_normal=404,mixed_training_defective=3552,
                   mAP50=detection_report['metrics'].get('metrics/mAP50(B)'),mAP50_95=detection_report['metrics'].get('metrics/mAP50-95(B)'),
                   object_detection=detection_report,score_is_probability=False,
                   simulation_policy='NG is removed before downstream assembly; no automatic REVIEW in in-domain evaluation',
                   sample_uncertainty='20 defective and 20 normal test images; one outcome changes recall or FPR by 5 percentage points')
    # Wilson interval for the simulated reduction (recall), not a factory defect-rate estimate.
    n=metrics['TP']+metrics['FN'];p=metrics['recall'];z=1.96
    center=(p+z*z/(2*n))/(1+z*z/n);half=z*((p*(1-p)/n+z*z/(4*n*n))**.5)/(1+z*z/n)
    metrics['defect_inflow_reduction_95pct_wilson_percent']=[max(0.0,100*(center-half)),min(100.0,100*(center+half))]
    metrics['defect_inflow_reduction_unit']='percent'
    chosen_path=Path(weights)
    original_reports={}
    for label,path in [('selected',ROOT/'outputs/evaluation'/f'{chosen_path.parent.parent.name}_{chosen_path.stem}_original_test.json'),('baseline',ROOT/'outputs/evaluation'/f'{ROOT.name}_best_original_test.json')]:
        if path.exists():original_reports[label]=json.loads(path.read_text(encoding='utf-8'))
    metrics['original_domain_test_comparison']=original_reports
    fields=['image_id','part_type','split','y_true','defect_score','threshold','y_pred','decision','model_version']
    with (folder/'pcb_predictions.csv').open('w',newline='',encoding='utf-8-sig') as f:
        writer=csv.DictWriter(f,fieldnames=fields);writer.writeheader()
        for row in rows:
            pred=int(row['defect_score']>=threshold)
            writer.writerow({k:v for k,v in dict(row,part_type='PCB',threshold=threshold,y_pred=pred,decision='NG' if pred else 'OK',model_version=version).items() if k in fields})
    write_json(folder/'pcb_detections.json',rows)
    write_json(folder/'pcb_metrics.json',metrics)
    model=YOLO(str(weights))
    config={'model_name':'FoldedVision AI PCB YOLO','model_version':version,'model_path':str(Path(weights).resolve()),
            'framework':'Ultralytics/PyTorch','ultralytics_version':ultralytics.__version__,'input_size':800,
            'runtime_versions':{'torch':torch.__version__,'torchvision':torchvision.__version__,'numpy':numpy.__version__,'opencv':cv2.__version__},
            'weights_sha256':hashlib.sha256(Path(weights).read_bytes()).hexdigest(),
            'color_mode':'RGB','channel_order':'RGB CHW inside model; OpenCV input BGR is converted by predictor',
            'normalization':'uint8 0..255 -> float 0..1; no ImageNet mean/std',
            'preprocessing':'Ultralytics letterbox, no CLAHE in evaluated pipeline',
            'label_mapping':model.names,'image_label_mapping':{0:'normal',1:'defective'},'original_class_ids':{i:model.names[i] for i in range(min(9,len(model.names)))},
            'positive_class':1,'threshold':threshold,'confidence_candidate_floor':0.001,
            'threshold_selection':'max validation image F1, tie: fewer FP then higher threshold',
            'output_type':'OK/NG/REVIEW plus bounding boxes','nms':{'iou':0.45,'agnostic':False,'max_det':300,'native_end_to_end':bool(getattr(model.model,'end2end',False)),'end_to_end_model':'Ultralytics applies architecture-native postprocessing; iou NMS may be bypassed by end-to-end head'},
            'bbox_format':'xyxy original image pixels','defect_score':'maximum confidence over all predicted defect boxes; zero if none',
            'dataset_source':['ParsaVictor/pcb-solder-defect-detection','zhaolutuan/0422@456f0c91ba9fcc7001ee4143957bc37ac27e12e0'],
            'limitations':['Public-data PoC, not Jahwa actuator production validation','Confidence is not calibrated defect probability','Scratch: only one test image','Similar physical boards may cross splits','Boxes are not segmentation masks','REVIEW requires human/out-of-domain routing; no calibrated OOD detector']}
    config['evaluation_scope']='PCB4 adaptation PoC; original-domain retention gate used validation, not test'
    if 'baseline' in original_reports and 'selected' in original_reports:
        before=original_reports['baseline']['metrics'];after=original_reports['selected']['metrics']
        config['original_test_tradeoff']={'baseline_box_recall':before['metrics/recall(B)'],'selected_box_recall':after['metrics/recall(B)'],
                                         'baseline_map50_95':before['metrics/mAP50-95(B)'],'selected_map50_95':after['metrics/mAP50-95(B)']}
        if after['metrics/recall(B)']<before['metrics/recall(B)']:
            config['limitations'].append('Original-domain held-out box recall decreased; do not claim full retention or universal replacement of baseline')
    write_json(folder/'pcb_model_config.json',config)
    fig,ax=plt.subplots(figsize=(8,4));ax.bar(['Before: defective','Detected TP','Remaining FN','Normal rejected FP'],[n,metrics['TP'],metrics['FN'],metrics['FP']]);ax.set_ylabel('Test images');fig.tight_layout();fig.savefig(folder/'defect_inflow.png');plt.close(fig)
    ts=np.linspace(.001,1,101);values=[classification_metrics(validation_rows,float(t)) for t in ts]
    fig,ax=plt.subplots();ax.plot(ts,[m['precision'] for m in values],label='Precision');ax.plot(ts,[m['recall'] for m in values],label='Recall');ax.axvline(threshold,ls='--');ax.legend();ax.set_xlabel('Validation threshold');fig.savefig(folder/'threshold_precision_recall.png');plt.close(fig)
    for row in rows:
        pred=int(row['defect_score']>=threshold);kind='FP' if pred and not row['y_true'] else 'FN' if not pred and row['y_true'] else 'correct'
        directory=folder/'examples'/kind;directory.mkdir(parents=True,exist_ok=True)
        result=model.predict(row['path'],imgsz=800,conf=threshold,iou=.45,max_det=300,device=device,verbose=False)[0]
        result.save(filename=str(directory/row['image_id']))
        if kind!='correct':
            from PIL import ImageOps
            with Image.open(row['path']) as source:gt=source.convert('RGB')
            w,h=gt.size;draw=ImageDraw.Draw(gt)
            label=OUT/'labels/test'/(Path(row['image_id']).stem+'.txt')
            for line in label.read_text().splitlines():
                cls,x,y,bw,bh=map(float,line.split())
                draw.rectangle([(x-bw/2)*w,(y-bh/2)*h,(x+bw/2)*w,(y+bh/2)*h],outline='lime',width=4)
                draw.text(((x-bw/2)*w,(y-bh/2)*h),model.names[int(cls)] if int(cls) in model.names else 'PCB4 defect',fill='lime')
            pair=Image.new('RGB',(1600,700),'white')
            pair.paste(ImageOps.contain(gt,(800,650)),(0,40))
            with Image.open(directory/row['image_id']) as predicted:pair.paste(ImageOps.contain(predicted,(800,650)),(800,40))
            ImageDraw.Draw(pair).text((10,10),f"{kind}: ground truth (green) | predictions; score={row['defect_score']:.4f}, threshold={threshold:.4f}",fill='black')
            pair.save(directory/(Path(row['image_id']).stem+'_ground_truth_comparison.jpg'))
    if baseline_weights:
        baseval=image_predictions(baseline_weights,'val',device);bt=choose_threshold(baseval)
        basetest=image_predictions(baseline_weights,'test',device)
        write_json(folder/'baseline_test_detections.json',basetest)
        write_json(folder/'baseline_image_comparison.json',{'baseline_threshold':bt,'baseline':classification_metrics(basetest,bt),'selected_threshold':threshold,'selected':classification_metrics(rows,threshold),'same_test_images':True,'score_rule':'max confidence over all native classes; val-selected threshold per model'})
    return metrics


def portfolio_summary(baseline_report, selection, candidate):
    import csv
    import matplotlib.pyplot as plt
    import numpy as np
    folder=ROOT/'outputs/integration'
    cached=ROOT/'outputs/evaluation'/f'{ROOT.name}_best_original_val.json'
    if cached.exists():
        detailed=json.loads(cached.read_text(encoding='utf-8'))
        if detailed['metrics']==baseline_report['metrics']:
            baseline_report={**baseline_report,'class_ap':detailed['class_ap']}
    reports=[('Baseline original val',baseline_report),('Candidate original val',selection['original_validation']),('Candidate PCB4 val',selection['pcb4_validation'])]
    heldout=json.loads((folder/'pcb_metrics.json').read_text(encoding='utf-8'))
    if 'class_ap' in heldout['object_detection']:
        reports.append(('Selected PCB4 test',heldout['object_detection']))
    for name,report in heldout.get('original_domain_test_comparison',{}).items():
        reports.append((name+' original test',report))
    table=[]
    for name,report in reports:
        for label,values in report['class_ap'].items():
            table.append({'evaluation':name,'class':label,**values})
    fields=sorted({key for row in table for key in row})
    with (folder/'class_ap.csv').open('w',newline='',encoding='utf-8-sig') as stream:
        writer=csv.DictWriter(stream,fieldnames=fields);writer.writeheader();writer.writerows(table)
    fig,ax=plt.subplots(figsize=(8,5));x=np.arange(2)
    for i,(label,report) in enumerate(reports[:2]):
        values=[report['metrics']['metrics/mAP50(B)'],report['metrics']['metrics/mAP50-95(B)']]
        ax.bar(x+i*.3,values,.3,label=label)
    ax.set_xticks(x+.15,['mAP50','mAP50-95']);ax.set_ylim(0,1);ax.legend();fig.tight_layout();fig.savefig(folder/'original_domain_map_comparison.png');plt.close(fig)
    metrics=json.loads((folder/'pcb_metrics.json').read_text(encoding='utf-8'))
    comparison=json.loads((folder/'baseline_image_comparison.json').read_text(encoding='utf-8'))
    fig,ax=plt.subplots();x=np.arange(3)
    for i,(label,values) in enumerate([('Baseline',comparison['baseline']),('Selected',comparison['selected'])]):
        ax.bar(x+i*.3,[values[k] for k in ('precision','recall','f1')],.3,label=label)
    ax.set_xticks(x+.15,['Precision','Recall','F1']);ax.set_ylim(0,1);ax.legend();fig.tight_layout();fig.savefig(folder/'same_test_image_comparison.png');plt.close(fig)
    run=Path(candidate).parent.parent
    import shutil
    if (run/'results.png').exists():shutil.copy2(run/'results.png',folder/'finetuning_curves.png')
    return {'selected':selection['selected'],'metrics':metrics,'baseline_comparison':comparison}


def write_final_report(candidate, baseline_report):
    import csv
    folder=ROOT/'outputs/integration'
    selection=json.loads((folder/'model_selection.json').read_text(encoding='utf-8'))
    metrics=json.loads((folder/'pcb_metrics.json').read_text(encoding='utf-8'))
    comparison=json.loads((folder/'baseline_image_comparison.json').read_text(encoding='utf-8'))
    original=json.loads((folder/'selected_original_image_metrics.json').read_text(encoding='utf-8'))
    original_images=json.loads((folder/'original_image_test_comparison.json').read_text(encoding='utf-8'))
    config=json.loads((folder/'pcb_model_config.json').read_text(encoding='utf-8'))
    ui_path=folder/'ui_verification.json'
    ui_status=json.loads(ui_path.read_text(encoding='utf-8-sig'))['status'] if ui_path.exists() else 'not_recorded'
    ui_detail='브라우저 연결 호스트를 사용할 수 없었고, 로그인된 Google Drive 창 선택은 비공개 정보 접근 우려로 자동 승인 검토에서 거절됐다. 그 창의 내용을 읽지 않았으며 전용 로컬 검사 창을 기다리고 있다. HTTP 검증을 GUI 시각 검증 완료로 표시하지 않는다.'
    if ui_status.startswith('passed'):
        ui_detail='전용 로컬 검사 창에서 실제 이미지 업로드와 결과 표시를 관찰했다. 세부 검증 기록을 참조한다.'
    inference_ms=metrics.get('object_detection',{}).get('speed_ms',{}).get('inference')
    inference_text='평가 불가' if inference_ms is None else f'{inference_ms:.2f}ms'
    chosen_path=Path(selection['selected'])
    original_test=json.loads((ROOT/'outputs/evaluation'/f'{chosen_path.parent.parent.name}_{chosen_path.stem}_original_test.json').read_text(encoding='utf-8'))['metrics']
    baseline_test=json.loads((ROOT/'outputs/evaluation'/f'{ROOT.name}_best_original_test.json').read_text(encoding='utf-8'))['metrics']
    run=Path(candidate).parent.parent
    with (run/'results.csv').open(encoding='utf-8') as stream: epochs=list(csv.DictReader(stream))
    def pct(value):return '평가 불가' if value is None else f'{value*100:.2f}%'
    bm=baseline_report['metrics'];cm=selection['original_validation']['metrics'];pm=selection['pcb4_validation']['metrics']
    text=f'''# FoldedVision AI PCB — 실제 실행 결과 보고서

## 실제 학습 및 데이터

정식 학습: {len(epochs)}에포크, 고유 학습 사진 3,956장(원본3,836 + PCB4 120). 정상404 / 불량3,552. epoch 반복은 고유 이미지 증가로 집계하지 않았다.
Smoke Test는 원본6 + PCB4 유형별6 = 12장, 1에포크로 파이프라인만 검증했다.
PCB4 전체는 정상100/불량100, train120/val40/test40이다. test는 정상20/불량20이다. 결함 박스는 전체142개다.

추가 학습 후보 클래스: 기존 insufficient_solder, excess_solder, solder_bridge, solder_void, missing_component, shifted_component, burn, physical_damage, oxidation 및 신규 pcb4_component_damage, pcb4_foreign_material, pcb4_miss, pcb4_oxidation, pcb4_scratch.
동등한 어노테이션 정책이 확인되지 않아 의미가 비슷한 이름을 자동 통합하지 않았다. 클래스 통합 ablation은 수행하지 않았다.

## 객체 검출 성능

| validation 평가 | Precision | Recall | mAP50 | mAP50-95 |
|---|---:|---:|---:|---:|
| 기존 모델 / 원본 PCB | {pct(bm['metrics/precision(B)'])} | {pct(bm['metrics/recall(B)'])} | {pct(bm['metrics/mAP50(B)'])} | {pct(bm['metrics/mAP50-95(B)'])} |
| 추가 학습 후보 / 원본 PCB | {pct(cm['metrics/precision(B)'])} | {pct(cm['metrics/recall(B)'])} | {pct(cm['metrics/mAP50(B)'])} | {pct(cm['metrics/mAP50-95(B)'])} |
| 추가 학습 후보 / PCB4 | {pct(pm['metrics/precision(B)'])} | {pct(pm['metrics/recall(B)'])} | {pct(pm['metrics/mAP50(B)'])} | {pct(pm['metrics/mAP50-95(B)'])} |

| 원본 PCB test 평가 | Precision | Recall | mAP50 | mAP50-95 |
|---|---:|---:|---:|---:|
| Baseline | {pct(baseline_test['metrics/precision(B)'])} | {pct(baseline_test['metrics/recall(B)'])} | {pct(baseline_test['metrics/mAP50(B)'])} | {pct(baseline_test['metrics/mAP50-95(B)'])} |
| 선정 모델 | {pct(original_test['metrics/precision(B)'])} | {pct(original_test['metrics/recall(B)'])} | {pct(original_test['metrics/mAP50(B)'])} | {pct(original_test['metrics/mAP50-95(B)'])} |

선정 모델 PCB4 test mAP50: {pct(metrics['mAP50'])}, mAP50-95: {pct(metrics['mAP50_95'])}.
해당 PCB4 테스트 평가의 이미지당 순수 신경망 추론 시간은 {inference_text}다(입출력/모델 초기 로딩 제외). 실서비스 요청 시간은 deployment_http_verification.json의 실제 기록을 따르며 cold start와 구분한다.
기존9클래스 모델은 신규5클래스를 출력하지 못하므로 PCB4 클래스 AP의 직접 전후 개선율은 주장하지 않는다.
원본 validation/test에는 oxidation 정답이 없어 해당 클래스 보존은 검증할 수 없다. 클래스별 결과는 outputs/integration/class_ap.csv에 있다.
원본 test에서 박스 재현율과 mAP50-95가 낮아졌으므로 기존 객체 검출 성능이 완전히 유지됐다고 결론낼 수 없다. 이번 모델은 PCB4 적응 PoC 후보이며 범용 PCB 검사기의 무조건적인 대체 모델이 아니다. 테스트 결과로 선정 규칙이나 임계값을 다시 조정하지 않았다.

## 동일 PCB4 test의 이미지 단위 비교

| 모델 | Precision | Recall | F1 | FP | FN |
|---|---:|---:|---:|---:|---:|
| Baseline | {pct(comparison['baseline']['precision'])} | {pct(comparison['baseline']['recall'])} | {pct(comparison['baseline']['f1'])} | {comparison['baseline']['FP']} | {comparison['baseline']['FN']} |
| 선정 모델 | {pct(metrics['precision'])} | {pct(metrics['recall'])} | {pct(metrics['f1'])} | {metrics['FP']} | {metrics['FN']} |

선정 모델 TP={metrics['TP']}, TN={metrics['TN']}, Accuracy={pct(metrics['accuracy'])}, ROC-AUC={metrics['roc_auc']}, 이미지 Average Precision={metrics['average_precision']}, 정상 오검출률={pct(metrics['false_positive_rate'])}.
각 모델은 같은 validation40장에서 자기 임계값을 정한 뒤 같은 test40장을 평가했다. 선정 모델 임계값은 {metrics['threshold']:.8f}다. 최대 결함 confidence는 확률이 아니다.
이미지를 NG로 맞힌 것만으로 결함 종류와 위치까지 맞혔다고 해석할 수 없다. 종류·위치 성능은 객체 검출 mAP 및 클래스별 AP로 별도 판단한다.

## 모델 선정과 기존 성능 유지

최종 사용 가중치: `{selection['selected']}`.
실제 선정 모델의 클래스 목록: {list(config['label_mapping'].values())}.
추가 학습 후보 채택 여부: {selection['accepted_finetune']}.
사전 규칙: 원본 val mAP50-95 하락 ≤0.05, PCB4 val 이미지 F1 개선. 원본 mAP50-95 변화는 {selection['original_map_delta']:+.6f}다.
원본 이미지 단위 판정은 PCB4에서 정한 운영 임계값 적용 시 test recall={pct(original['test']['recall'])}, FPR={pct(original['test']['false_positive_rate'])}다. 객체 mAP 유지와 이미지 판정 유지가 같은 의미는 아니다.
동일 원본 test에서 각 모델의 PCB4 val 임계값을 적용한 Baseline 이미지 recall={pct(original_images['baseline']['recall'])}, FPR={pct(original_images['baseline']['false_positive_rate'])}, F1={pct(original_images['baseline']['f1'])}; 선정 모델 이미지 F1={pct(original_images['selected']['f1'])}다.
기존 models/best.pt는 보존했다. 후보가 탈락하면 최종 파일을 새로 생성한 것처럼 표시하지 않는다.

## 사전 검사 효과 시뮬레이션

PCB4 test 검사 {metrics['test_count']}장 중 실제 불량 {metrics['TP']+metrics['FN']}장, 검출 실제 불량 {metrics['TP']}장, 잔존 불량 {metrics['FN']}장, 정상 오분리 {metrics['FP']}장.
NG를 후속 조립 전 분리할 때 불량 유입 감소율은 {metrics['defect_inflow_reduction']:.2f}%다. Wilson95% 구간(%)은 {metrics['defect_inflow_reduction_95pct_wilson_percent']}이다.
이는 공개 데이터의 조건부 시뮬레이션이며 실제 자화전자 생산 불량률 감소 실적이 아니다. test 불량 한 장이 재현율5%p에 해당한다. 자동 이진 평가에는 REVIEW가 없으며 현장 REVIEW는 보류·수동 재검 정책이 필요하다.

## 산출물과 재실행

- PCB_YOLO.ipynb: Baseline 검증, 실제 검사, 정답/예측 비교, 원본 이미지 판정.
- PCB_VisA.ipynb: EDA, Smoke Test, 정식 학습, 모델 선정, test, 팀 통합 산출물과 HTTP 검증.
- `{run}`: args.yaml, results.csv, 학습 곡선 및 best/last 체크포인트.
- outputs/integration/pcb_predictions.csv: 실제 test40장 이미지 판정.
- outputs/integration/pcb_metrics.json, pcb_model_config.json: 실제 모델과 평가/전처리/클래스 규격.
- outputs/integration/pcb_detections.json: 위치 검출과 confidence.
- outputs/eda/: 클래스·박스·해상도·위치 분포, GT 시각화, OpenCV 비교.
- outputs/integration/examples/: 실제 FP/FN 및 정상 판정 사례. 오류가 없는 유형은 사례를 임의 생성하지 않음.
- TEAM_INTEGRATION.md: Lens/Ring 전달 규약. 각 프레임워크의 원래 모델 로더를 사용.

## 미완료 및 한계

실제 액추에이터 PCB 현장 데이터 검증, 촬영 개체/세션 단위 분리, scratch 데이터 보강, 클래스 통합/학습률/해상도/샘플링별 ablation은 수행하지 않았다.
정확한 중복은 없었지만 유사 사진 누출은 배제하지 못한다. scratch는 train3/val1/test1이라 클래스 성능이 불안정하다.
자동 OOD 검출기는 없으며 입력 오류와 조건 이탈을 OK로 처리하면 안 된다. Bounding Box는 정밀 마스크가 아니다.
팀의 개별 부품 테스트만으로 완제품 단위 효과를 주장할 수 없다. 실제 제품ID 연결 또는 명시적 조합 가정이 필요하다.
Lens/Ring 실제 가중치는 제공되지 않아 세 부품 실모델의 동시 실행은 검증하지 않았다. 통합 환경의 패키지 호환성과 GPU 메모리 사용은 별도 확인이 필요하다.
실제 모델 API의 경로/PIL/OpenCV 입력, 정상/불량 2종×Baseline/최종 2모드의 실제 HTTP 업로드 4건과 잘못된 입력의 REVIEW 응답을 검증했다. 독립 app.py 서버에서도 정상/불량 2건 업로드와 주석 JPEG/실제 모델 버전을 확인했다.
브라우저 화면에서 클릭·업로드한 시각 검증 상태: {ui_status}. {ui_detail}
세부 증거는 outputs/integration/http_verification.json, api_verification.json, deployment_http_verification.json, ui_verification.json에 있다.
'''
    (ROOT/'FINAL_REPORT.md').write_text(text,encoding='utf-8')
    (ROOT/'PROJECT_STATUS.md').write_text('# 현재 상태\n\n30에포크 실제 학습·평가, 팀 결과 파일 생성, 모델 API와 HTTP 업로드 검증 완료. 최종 수치와 한계는 [FINAL_REPORT.md](FINAL_REPORT.md)를 참조하세요.\n\n선정 모델: '+selection['selected']+'\n\n브라우저 시각 검증 상태: '+ui_status+' (연결 호스트 불가; 전용 PCB 검사 창 필요). 원본 test 박스 재현율 하락과 scratch 표본 부족은 최종 보고서에 명시했습니다.\n',encoding='utf-8')
    return text


def classification_metrics(rows, threshold):
    import numpy as np
    from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, roc_auc_score, average_precision_score
    y=np.array([r['y_true'] for r in rows]);scores=np.array([r['defect_score'] for r in rows]);p=(scores>=threshold).astype(int)
    tp=int(((y==1)&(p==1)).sum());fp=int(((y==0)&(p==1)).sum());tn=int(((y==0)&(p==0)).sum());fn=int(((y==1)&(p==0)).sum())
    return {'TP':tp,'FP':fp,'TN':tn,'FN':fn,'accuracy':float(accuracy_score(y,p)),
            'precision':float(precision_score(y,p,zero_division=0)),'recall':float(recall_score(y,p,zero_division=0)),
            'f1':float(f1_score(y,p,zero_division=0)),'roc_auc':float(roc_auc_score(y,scores)) if len(set(y))==2 else None,
            'average_precision':float(average_precision_score(y,scores)) if y.sum() else None,
            'false_positive_rate':fp/(fp+tn) if fp+tn else None,
            'defect_inflow_reduction':100*tp/(tp+fn) if tp+fn else None}


def choose_threshold(rows):
    import numpy as np
    values=sorted({r['defect_score'] for r in rows})
    thresholds=[0.001]+[v for v in values if v>=0.001]+[float(np.nextafter(max(values),float('inf')))]
    # Defined before test: maximize validation F1, then minimize FP, then higher threshold.
    return max(thresholds,key=lambda t:(classification_metrics(rows,t)['f1'],-classification_metrics(rows,t)['FP'],t))


if __name__ == '__main__':
    import argparse
    import torch
    parser = argparse.ArgumentParser()
    parser.add_argument('action', choices=['prepare', 'train', 'evaluate'])
    parser.add_argument('--epochs', type=int, default=30)
    parser.add_argument('--device', default='0' if torch.cuda.is_available() else 'cpu')
    parser.add_argument('--weights', type=Path)
    parser.add_argument('--split', choices=['val', 'test'], default='val')
    args = parser.parse_args()
    if args.action == 'prepare':
        print(prepare())
    elif args.action == 'train':
        train(args.epochs, args.device)
    else:
        if args.weights is None:
            parser.error('evaluate requires --weights')
        print(evaluate(args.weights, args.split, args.device))
