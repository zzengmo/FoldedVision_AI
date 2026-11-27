import {AppError,text,integer,scope,lotInput,decisionInput,csv,calculateScenario,today} from './domain.mjs';

const now=()=>new Date().toISOString();
const id=()=>crypto.randomUUID();
const shortCode=(prefix)=>`${prefix}-${today().replaceAll('-','').slice(2)}-${id().slice(0,5).toUpperCase()}`;
const json=(data,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
const first=(env,sql,...args)=>env.DB.prepare(sql).bind(...args).first();
const all=async(env,sql,...args)=>(await env.DB.prepare(sql).bind(...args).all()).results;
const run=(env,sql,...args)=>env.DB.prepare(sql).bind(...args).run();
const parse=(value,fallback={})=>{try{return JSON.parse(value??'null')??fallback;}catch{return fallback;}};
const isWriter=u=>['admin','inspector'].includes(u.role);
function requireWriter(u){if(!isWriter(u))throw new AppError('등록·판정 권한이 필요합니다.',403);}
function requireAdmin(u){if(u.role!=='admin')throw new AppError('관리자 권한이 필요합니다.',403);}
function logStatement(env,user,entity,space,action,detail){return env.DB.prepare('INSERT INTO audit (id,entity_id,scope,action,actor_id,actor_name,detail,created_at) VALUES (?,?,?,?,?,?,?,?)').bind(id(),entity,space,action,user.id,user.name,JSON.stringify(detail),now());}
function event(env,user,entity,space,action,detail){return logStatement(env,user,entity,space,action,detail).run();}
function paging(url){const page=integer(url.searchParams.get('page')||1,'페이지',1,1000000);const limit=integer(url.searchParams.get('limit')||20,'페이지 크기',1,100);return {page,limit,offset:(page-1)*limit};}

async function identity(request,env){
  let userId=request.headers.get('oai-authenticated-user-id');
  let email=request.headers.get('oai-authenticated-user-email')||'';
  let name=request.headers.get('oai-authenticated-user-full-name')||email;
  if(request.headers.get('oai-authenticated-user-full-name-encoding')==='percent-encoded-utf-8'){try{name=decodeURIComponent(name);}catch{}}
  if(env.LOCAL_PREVIEW==='true'&&['127.0.0.1','localhost'].includes(new URL(request.url).hostname)){
    userId='local-admin';name='로컬 관리자';email='';
  }
  if(!userId)throw new AppError('로그인이 필요합니다.',401);
  let user=await first(env,'SELECT * FROM users WHERE id=?',userId);
  if(!user){
    const timestamp=now();
    await env.DB.batch([
      env.DB.prepare('INSERT OR IGNORE INTO app_config (key,value) VALUES (?,?)').bind('owner_user_id',userId),
      env.DB.prepare("INSERT OR IGNORE INTO users (id,name,email,role,created_at) VALUES (?,?,?,CASE WHEN (SELECT value FROM app_config WHERE key='owner_user_id')=? THEN 'admin' ELSE 'inspector' END,?)").bind(userId,name||'검사 담당자',email,userId,timestamp),
    ]);
    user=await first(env,'SELECT * FROM users WHERE id=?',userId);
  }
  return user;
}

const LOT_STATS=`SELECT l.*,count(i.id) AS inspected_count,
  sum(CASE WHEN i.final_status IN ('OK','NG') THEN 1 ELSE 0 END) AS completed_count,
  sum(CASE WHEN i.final_status='NG' THEN 1 ELSE 0 END) AS ng_count,
  sum(CASE WHEN i.final_status='REVIEW' THEN 1 ELSE 0 END) AS review_count
  FROM lots l LEFT JOIN inspections i ON i.lot_id=l.id`;
const INSPECTION_SELECT=`SELECT i.*,l.code AS lot_code,l.supplier,l.part_type,l.part_number,l.scope,l.quantity,
  (SELECT p.id FROM photos p WHERE p.inspection_id=i.id ORDER BY p.created_at LIMIT 1) AS cover_photo_id,
  (SELECT count(*) FROM photos p WHERE p.inspection_id=i.id) AS photo_count,
  u.name AS creator_name,d.name AS decider_name
  FROM inspections i JOIN lots l ON i.lot_id=l.id LEFT JOIN users u ON u.id=i.created_by LEFT JOIN users d ON d.id=i.decided_by`;
function itemPayload(row){if(!row)return null;return {...row,ai_payload:parse(row.ai_payload,null),cover_url:row.cover_photo_id?`/api/photos/${row.cover_photo_id}`:null};}
async function getInspection(env,inspectionId){const row=await first(env,`${INSPECTION_SELECT} WHERE i.id=?`,inspectionId);if(!row)throw new AppError('검사 기록을 찾을 수 없습니다.',404);return row;}

async function modelStatus(env){
  if(!env.INFERENCE_URL)return {ring:{ready:false,message:'추론 서버 연결 대기'},pcb:{ready:false,message:'추론 서버 연결 대기'},lens:{ready:false,message:'최신 가중치 전달 대기'}};
  try{const r=await fetch(`${env.INFERENCE_URL}/health`,{signal:AbortSignal.timeout(2500),headers:env.INFERENCE_TOKEN?{Authorization:`Bearer ${env.INFERENCE_TOKEN}`}:{}});if(r.ok)return (await r.json()).models;}
  catch{}
  return {ring:{ready:false,message:'추론 서버 응답 대기'},pcb:{ready:false,message:'실행 환경 준비 필요'},lens:{ready:false,message:'최신 가중치 전달 대기'}};
}

function inspectionFilters(url,exporting=false){
  const clauses=['l.scope=?'],args=[scope(url.searchParams.get('scope'))];
  const q=url.searchParams.get('q')?.trim();if(q){clauses.push('(i.code LIKE ? OR i.item_ref LIKE ? OR l.code LIKE ? OR l.supplier LIKE ?)');args.push(...Array(4).fill('%'+q.slice(0,100)+'%'));}
  const status=url.searchParams.get('status');
  if(status==='queue'){clauses.push("i.final_status IN ('PENDING','REVIEW')");}
  else if(['OK','NG','REVIEW','PENDING'].includes(status)){clauses.push('i.final_status=?');args.push(status);}
  const part=url.searchParams.get('part');if(['ring','lens','pcb'].includes(part)){clauses.push('l.part_type=?');args.push(part);}
  const lot=url.searchParams.get('lot');if(lot){clauses.push('i.lot_id=?');args.push(lot);}
  for(const [param,operator] of [['from','>='],['to','<=']]){const value=url.searchParams.get(param);if(value&&/^\d{4}-\d{2}-\d{2}$/.test(value)){clauses.push(`date(i.created_at,'+9 hours') ${operator} ?`);args.push(value);}}
  return {where:clauses.join(' AND '),args};
}

async function summary(env,url){
  const s=scope(url.searchParams.get('scope')),day=today();
  const base=await first(env,`SELECT count(*) total,
    sum(CASE WHEN date(i.created_at,'+9 hours')=? THEN 1 ELSE 0 END) today,
    sum(CASE WHEN i.final_status='PENDING' THEN 1 ELSE 0 END) pending,
    sum(CASE WHEN i.final_status='REVIEW' THEN 1 ELSE 0 END) review,
    sum(CASE WHEN i.final_status='NG' THEN 1 ELSE 0 END) ng,
    sum(CASE WHEN i.final_status='OK' THEN 1 ELSE 0 END) ok,
    avg(CASE WHEN i.decided_at IS NOT NULL THEN (julianday(i.decided_at)-julianday(i.created_at))*1440 END) average_minutes
    FROM inspections i JOIN lots l ON i.lot_id=l.id WHERE l.scope=?`,day,s);
  const lots=await first(env,'SELECT count(*) count FROM lots WHERE scope=?',s);
  const daily=await all(env,`SELECT date(i.created_at,'+9 hours') day,count(*) total,
    sum(CASE WHEN i.final_status='NG' THEN 1 ELSE 0 END) ng FROM inspections i JOIN lots l ON i.lot_id=l.id
    WHERE l.scope=? AND i.created_at>=datetime('now','-13 days') GROUP BY day ORDER BY day`,s);
  const suppliers=await all(env,`SELECT l.supplier,count(*) total,sum(CASE WHEN i.final_status='NG' THEN 1 ELSE 0 END) ng,
    sum(CASE WHEN i.final_status IN ('OK','NG') THEN 1 ELSE 0 END) completed FROM inspections i JOIN lots l ON i.lot_id=l.id WHERE l.scope=? GROUP BY l.supplier ORDER BY ng DESC,total DESC LIMIT 10`,s);
  const parts=await all(env,`SELECT l.part_type,count(*) total,sum(CASE WHEN i.final_status='NG' THEN 1 ELSE 0 END) ng,
    sum(CASE WHEN i.final_status='OK' THEN 1 ELSE 0 END) ok FROM inspections i JOIN lots l ON i.lot_id=l.id WHERE l.scope=? GROUP BY l.part_type`,s);
  const recent=(await all(env,`${INSPECTION_SELECT} WHERE l.scope=? ORDER BY i.created_at DESC LIMIT 6`,s)).map(itemPayload);
  const activity=await all(env,'SELECT * FROM audit WHERE scope=? ORDER BY created_at DESC LIMIT 8',s);
  const defects=await all(env,`SELECT coalesce(nullif(i.final_type,''),'미분류') defect_type,count(*) count FROM inspections i JOIN lots l ON i.lot_id=l.id WHERE l.scope=? AND i.final_status='NG' GROUP BY defect_type ORDER BY count DESC`,s);
  return json({stats:{...base,lot_count:lots.count},daily,suppliers,parts,defects,recent,activity,today:day});
}

async function multipartWithinLimit(request,maxBytes){
  const type=request.headers.get('content-type')||'';
  if(!type.startsWith('multipart/form-data;')||!request.body)throw new AppError('사진과 검사 정보를 함께 등록해 주세요.');
  const reader=request.body.getReader(),chunks=[];let length=0;
  while(true){const {done,value}=await reader.read();if(done)break;length+=value.byteLength;if(length>maxBytes){await reader.cancel();throw new AppError('업로드 전체 크기는 20MB 이하여야 합니다.',413);}chunks.push(value);}
  const bytes=new Uint8Array(length);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength;}chunks.length=0;
  try{return await new Response(bytes,{headers:{'Content-Type':type}}).formData();}catch{throw new AppError('사진 업로드 형식을 확인해 주세요.');}
}
async function createInspection(request,env,user){
  requireWriter(user);
  const contentLength=Number(request.headers.get('content-length')||0);if(contentLength>22*1024*1024)throw new AppError('업로드 전체 크기는 20MB 이하여야 합니다.',413);
  const form=await multipartWithinLimit(request,22*1024*1024);
  const lot=await first(env,'SELECT * FROM lots WHERE id=?',text(form.get('lot_id'),'LOT',100));if(!lot)throw new AppError('먼저 입고 LOT를 등록해 주세요.');
  const itemRef=text(form.get('item_ref'),'부품 식별번호',100),note=text(form.get('note'),'검사 메모',1000,false);
  const files=form.getAll('files').filter(f=>f&&typeof f.arrayBuffer==='function');
  if(!files.length||files.length>5)throw new AppError('사진을 1~5장 등록해 주세요.');
  if(files.reduce((total,f)=>total+f.size,0)>20*1024*1024)throw new AppError('한 번에 등록할 사진의 전체 크기는 20MB 이하여야 합니다.',413);
  if(files.some(f=>f.size>8*1024*1024||!['image/jpeg','image/png','image/webp'].includes(f.type)))throw new AppError('사진은 장당 8MB 이하의 JPG·PNG·WebP 파일만 가능합니다.');
  if(!env.BUCKET)throw new AppError('사진 저장소가 준비되지 않았습니다. 잠시 후 다시 시도해 주세요.',503);
  const inspectionId=id(),timestamp=now(),code=shortCode('FV'),stored=[];
  try{
    for(const f of files){
      const bytes=new Uint8Array(await f.arrayBuffer());
      const jpeg=bytes[0]===255&&bytes[1]===216&&bytes[2]===255;
      const png=bytes[0]===137&&bytes[1]===80&&bytes[2]===78&&bytes[3]===71;
      const webp=String.fromCharCode(...bytes.slice(0,4))==='RIFF'&&String.fromCharCode(...bytes.slice(8,12))==='WEBP';
      if(!((f.type==='image/jpeg'&&jpeg)||(f.type==='image/png'&&png)||(f.type==='image/webp'&&webp)))throw new AppError('사진 형식과 파일 내용이 일치하지 않습니다.');
      const photoId=id(),key=`inspections/${inspectionId}/${photoId}`;
      await env.BUCKET.put(key,bytes,{httpMetadata:{contentType:f.type}});
      stored.push({id:photoId,key,name:f.name.slice(0,160),mime:f.type,bytes:bytes.length});
    }
    const inserted=await run(env,`INSERT INTO inspections (id,code,lot_id,item_ref,note,ai_status,final_status,revision,created_by,created_at,updated_at)
      SELECT ?,?,?,?,?,'NOT_RUN','PENDING',0,?,?,? WHERE (SELECT count(*) FROM inspections WHERE lot_id=?) < ?`,inspectionId,code,lot.id,itemRef,note,user.id,timestamp,timestamp,lot.id,lot.quantity);
    if(!inserted.meta.changes)throw new AppError('등록된 검사 건수가 입고 수량에 도달했습니다. LOT 수량을 확인해 주세요.');
    await env.DB.batch([
      ...stored.map(p=>env.DB.prepare('INSERT INTO photos (id,inspection_id,object_key,name,mime,bytes,created_at) VALUES (?,?,?,?,?,?,?)').bind(p.id,inspectionId,p.key,p.name,p.mime,p.bytes,timestamp)),
      logStatement(env,user,inspectionId,lot.scope,'REGISTER',{code,item_ref:itemRef,photo_count:stored.length}),
    ]);
    return json(itemPayload(await getInspection(env,inspectionId)),201);
  }catch(e){
    await Promise.allSettled(stored.map(p=>env.BUCKET.delete(p.key)));
    await run(env,'DELETE FROM photos WHERE inspection_id=?',inspectionId);
    await run(env,'DELETE FROM inspections WHERE id=?',inspectionId);
    if(String(e.message).includes('UNIQUE'))throw new AppError('이 LOT에 같은 부품 식별번호가 이미 등록되어 있습니다.',409);
    throw e;
  }
}

async function analyze(env,user,inspectionId){
  requireWriter(user);const record=await getInspection(env,inspectionId);
  const cutoff=new Date(Date.now()-10*60*1000).toISOString();
  if(record.ai_status==='RUNNING'&&record.analysis_started_at&&record.analysis_started_at>cutoff)throw new AppError('이미 분석 중입니다. 잠시 후 새로고침해 주세요.',409);
  const models=await modelStatus(env);
  if(!models[record.part_type]?.ready){
    await run(env,"UPDATE inspections SET ai_status='UNAVAILABLE',updated_at=? WHERE id=?",now(),inspectionId);
    return json({available:false,message:models[record.part_type]?.message||'모델 연결 대기',inspection:itemPayload(await getInspection(env,inspectionId))});
  }
  const token=id(),started=now();
  const claim=await run(env,"UPDATE inspections SET ai_status='RUNNING',updated_at=?,analysis_token=?,analysis_started_at=? WHERE id=? AND (ai_status<>'RUNNING' OR analysis_started_at IS NULL OR analysis_started_at<=?)",started,token,started,inspectionId,cutoff);
  if(!claim.meta.changes)throw new AppError('다른 요청에서 분석 중입니다.',409);
  try{
    const photos=await all(env,'SELECT * FROM photos WHERE inspection_id=? ORDER BY created_at',inspectionId);
    const results=[];
    for(const photo of photos){
      let bytes;
      if(photo.object_key.startsWith('asset:')){const r=await env.STATIC(photo.object_key.slice(6));bytes=await r.arrayBuffer();}
      else{const object=await env.BUCKET.get(photo.object_key);if(!object)throw new AppError('원본 사진을 찾을 수 없습니다.');bytes=await object.arrayBuffer();}
      const form=new FormData();form.append('part_type',record.part_type);form.append('image',new Blob([bytes],{type:photo.mime}),photo.name);
      const response=await fetch(`${env.INFERENCE_URL}/predict`,{method:'POST',body:form,headers:env.INFERENCE_TOKEN?{Authorization:`Bearer ${env.INFERENCE_TOKEN}`}:{},signal:AbortSignal.timeout(90000)});
      const result=await response.json();if(!response.ok)throw new AppError(result.detail||'추론 서버가 분석을 완료하지 못했습니다.',502);
      if(record.part_type==='ring'&&result.status!=='REVIEW')throw new AppError('Ring 모델의 판정 규격을 확인해 주세요.',502);
      results.push({...result,photo_id:photo.id});
    }
    const best=results.find(r=>r.status==='NG')||results[0];
    const completed=await env.DB.batch([
      env.DB.prepare('UPDATE inspections SET ai_status=?,ai_type=?,ai_score=?,ai_model=?,ai_payload=?,updated_at=?,analysis_started_at=NULL WHERE id=? AND analysis_token=?').bind(best.status||'REVIEW',best.defect_type||null,best.type_confidence??best.defect_score??null,best.model_version||'unknown',JSON.stringify({results}),now(),inspectionId,token),
      env.DB.prepare('INSERT INTO audit (id,entity_id,scope,action,actor_id,actor_name,detail,created_at) SELECT ?,?,?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM inspections WHERE id=? AND analysis_token=?)').bind(id(),inspectionId,record.scope,'ANALYZE',user.id,user.name,JSON.stringify({model:best.model_version,status:best.status,photos:results.length,results,previous:{model:record.ai_model,type:record.ai_type,score:record.ai_score,payload:parse(record.ai_payload,null)}}),now(),inspectionId,token),
    ]);
    if(!completed[0].meta.changes)return json({available:false,message:'더 최근에 시작한 분석 결과를 확인해 주세요.',inspection:itemPayload(await getInspection(env,inspectionId))});
    return json({available:true,inspection:itemPayload(await getInspection(env,inspectionId))});
  }catch(e){
    await env.DB.batch([
      env.DB.prepare("UPDATE inspections SET ai_status='ERROR',updated_at=?,analysis_started_at=NULL WHERE id=? AND analysis_token=?").bind(now(),inspectionId,token),
      env.DB.prepare('INSERT INTO audit (id,entity_id,scope,action,actor_id,actor_name,detail,created_at) SELECT ?,?,?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM inspections WHERE id=? AND analysis_token=?)').bind(id(),inspectionId,record.scope,'ANALYZE_ERROR',user.id,user.name,JSON.stringify({message:String(e.message).slice(0,300)}),now(),inspectionId,token),
    ]);
    throw new AppError('분석을 완료하지 못했습니다. 사진과 모델 연결 상태를 확인해 주세요.',502);
  }
}

async function seedExamples(env,user){
  requireWriter(user);
  if((await first(env,"SELECT count(*) count FROM lots WHERE scope='sample'")).count)return json({message:'예시 작업공간이 이미 준비되어 있습니다.'});
  const timestamp=now();const day=today();
  const records=[
    {part:'ring',supplier:'예시 공급사 A',ref:'R-SAMPLE-001',image:'/evidence/ring-success-original.webp',type:'오염',score:.645,final:'NG',ai:'REVIEW',note:'VISION Ring 정답이 오염인 저장 평가 사진입니다.'},
    {part:'ring',supplier:'예시 공급사 A',ref:'R-SAMPLE-002',image:'/evidence/ring-failure-original.webp',type:'스크래치',score:.699,final:'REVIEW',ai:'REVIEW',note:'실제 정답은 표면 미가공이며 기준 CNN이 혼동한 저장 사례입니다.'},
    {part:'pcb',supplier:'예시 공급사 B',ref:'P-SAMPLE-001',image:'/evidence/quality/pcb-normal.webp',type:null,score:null,final:'PENDING',ai:'UNAVAILABLE',note:'별도 PCB1–3 사진 분류 실험의 참고 이미지입니다. PCB4 운영 추론 결과로 사용하지 않습니다.'},
    {part:'lens',supplier:'예시 공급사 C',ref:'L-SAMPLE-001',image:'/evidence/lens-success-original.webp',type:null,score:null,final:'PENDING',ai:'UNAVAILABLE',note:'VISION Lens 참고 사진입니다. 최신 모델 연결 전 담당자가 확인하는 예시입니다.'},
  ];
  const statements=[];
  const lotIds={};
  for(const part of ['ring','pcb','lens']){
    const lotId=id();lotIds[part]=lotId;
    statements.push(env.DB.prepare('INSERT INTO lots (id,code,scope,supplier,part_type,part_number,quantity,received_date,note,created_by,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)').bind(lotId,`SAMPLE-${part.toUpperCase()}`,'sample',records.find(r=>r.part===part).supplier,part,`${part.toUpperCase()}-DEMO`,10,day,'업무 동작을 확인하는 예시 LOT · 실제 입고 실적에 포함되지 않습니다.',user.id,timestamp));
  }
  for(const item of records){
    const recordId=id(),photoId=id(),code=shortCode('EX');
    statements.push(env.DB.prepare('INSERT INTO inspections (id,code,lot_id,item_ref,note,ai_status,ai_type,ai_score,ai_model,ai_payload,final_status,final_note,decided_by,decided_at,revision,created_by,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)').bind(recordId,code,lotIds[item.part],item.ref,item.note,item.ai,item.type,item.score,item.part==='ring'?'ring_cnn_baseline · 저장 평가':null,JSON.stringify({saved_example:true,source:item.note}),item.final,item.final==='NG'?'정답 자료를 참고한 예시 판정':'',item.final==='NG'?user.id:null,item.final==='NG'?timestamp:null,0,user.id,timestamp,timestamp));
    statements.push(env.DB.prepare('INSERT INTO photos (id,inspection_id,object_key,name,mime,bytes,created_at) VALUES (?,?,?,?,?,?,?)').bind(photoId,recordId,'asset:'+item.image,item.ref+'.webp','image/webp',0,timestamp));
    statements.push(logStatement(env,user,recordId,'sample','REGISTER',{code,item_ref:item.ref,example:true}));
  }
  await env.DB.batch(statements);return json({message:'저장 평가 사진으로 예시 작업공간을 준비했습니다.'},201);
}

export async function api(request,env){
  const url=new URL(request.url),path=url.pathname,method=request.method;
  try{
    if(!env.DB)throw new AppError('검사 데이터베이스가 준비되지 않았습니다.',503);
    if(!['GET','HEAD'].includes(method)){
      const origin=request.headers.get('origin');
      const allowedOrigins=[url.origin,...(env.LOCAL_PREVIEW==='true'?['http://127.0.0.1:5173','http://localhost:5173']:[])];
      if(origin&&!allowedOrigins.includes(origin))throw new AppError('이 페이지에서 다시 요청해 주세요.',403);
    }
    const user=await identity(request,env);
    if(path==='/api/session')return json({user,mode:env.LOCAL_PREVIEW==='true'?'local':'hosted',storage:'server',models:await modelStatus(env)});
    if(path==='/api/summary')return await summary(env,url);
    if(path==='/api/lots'&&method==='GET'){
      const s=scope(url.searchParams.get('scope')),q=(url.searchParams.get('q')||'').slice(0,100),part=url.searchParams.get('part');
      const args=[s],where=['l.scope=?'];if(q){where.push('(l.code LIKE ? OR l.supplier LIKE ? OR l.part_number LIKE ?)');args.push(...Array(3).fill('%'+q+'%'));}
      if(['ring','lens','pcb'].includes(part)){where.push('l.part_type=?');args.push(part);}
      const rows=await all(env,`${LOT_STATS} WHERE ${where.join(' AND ')} GROUP BY l.id ORDER BY l.created_at DESC LIMIT 500`,...args);
      return json({items:rows});
    }
    if(path==='/api/lots'&&method==='POST'){
      requireWriter(user);const data=lotInput(await request.json()),lotId=id();
      try{await env.DB.batch([
        env.DB.prepare('INSERT INTO lots (id,code,scope,supplier,part_type,part_number,quantity,received_date,note,created_by,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)').bind(lotId,data.code,data.scope,data.supplier,data.part_type,data.part_number,data.quantity,data.received_date,data.note,user.id,now()),
        logStatement(env,user,lotId,data.scope,'LOT_CREATE',{code:data.code,quantity:data.quantity}),
      ]);}catch(e){if(String(e.message).includes('UNIQUE'))throw new AppError('같은 LOT 번호가 이미 있습니다.',409);throw e;}
      return json(await first(env,'SELECT * FROM lots WHERE id=?',lotId),201);
    }
    if(path==='/api/inspections'&&method==='GET'){
      const {where,args}=inspectionFilters(url),{page,limit,offset}=paging(url);
      const count=await first(env,`SELECT count(*) total FROM inspections i JOIN lots l ON i.lot_id=l.id WHERE ${where}`,...args);
      const items=await all(env,`${INSPECTION_SELECT} WHERE ${where} ORDER BY i.created_at DESC LIMIT ? OFFSET ?`,...args,limit,offset);
      return json({items:items.map(itemPayload),total:count.total,page,limit});
    }
    if(path==='/api/inspections'&&method==='POST')return await createInspection(request,env,user);
    if(path==='/api/export'&&method==='GET'){
      const {where,args}=inspectionFilters(url);const rows=await all(env,`${INSPECTION_SELECT} WHERE ${where} ORDER BY i.created_at DESC LIMIT 10001`,...args);
      if(rows.length>10000)throw new AppError('내보낼 기록이 10,000건을 넘습니다. 기간이나 LOT를 선택해 주세요.');
      const table=[['검사번호','등록시각(UTC)','LOT','공급사','부품','품번','부품 식별번호','AI 제안','AI 유형','AI 점수','모델 버전','최종 판정','확정 결함 유형','판정 사유','판정자','판정시각(UTC)'],...rows.map(r=>[r.code,r.created_at,r.lot_code,r.supplier,r.part_type,r.part_number,r.item_ref,r.ai_status,r.ai_type,r.ai_score,r.ai_model,r.final_status,r.final_type,r.final_note,r.decider_name,r.decided_at])];
      return new Response(csv(table),{headers:{'Content-Type':'text/csv; charset=utf-8','Content-Disposition':`attachment; filename="foldedvision-${today()}.csv"`,'Cache-Control':'no-store'}});
    }
    const detail=path.match(/^\/api\/inspections\/([^/]+)$/);
    if(detail&&method==='GET'){
      const row=await getInspection(env,detail[1]);const photos=await all(env,'SELECT id,name,mime,bytes,created_at FROM photos WHERE inspection_id=? ORDER BY created_at',row.id);
      const activity=await all(env,'SELECT * FROM audit WHERE entity_id=? ORDER BY created_at DESC LIMIT 100',row.id);
      return json({...itemPayload(row),photos:photos.map(p=>({...p,url:'/api/photos/'+p.id})),activity});
    }
    const decision=path.match(/^\/api\/inspections\/([^/]+)\/decision$/);
    if(decision&&method==='POST'){
      requireWriter(user);const record=await getInspection(env,decision[1]),data=decisionInput(await request.json(),record),token=id(),timestamp=now();
      const results=await env.DB.batch([
        env.DB.prepare('UPDATE inspections SET final_status=?,final_note=?,final_type=?,decided_by=?,decided_at=?,updated_at=?,revision=revision+1,decision_token=? WHERE id=? AND revision=?').bind(data.status,data.note,data.final_type,user.id,timestamp,timestamp,token,record.id,data.revision),
        env.DB.prepare('INSERT INTO audit (id,entity_id,scope,action,actor_id,actor_name,detail,created_at) SELECT ?,?,?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM inspections WHERE id=? AND decision_token=?)').bind(id(),record.id,record.scope,'DECISION',user.id,user.name,JSON.stringify({from:record.final_status,to:data.status,note:data.note,defect_type:data.final_type}),timestamp,record.id,token),
      ]);
      if(!results[0].meta.changes)throw new AppError('다른 담당자가 먼저 수정했습니다. 최신 기록을 다시 확인해 주세요.',409);
      return json(itemPayload(await getInspection(env,record.id)));
    }
    const analysis=path.match(/^\/api\/inspections\/([^/]+)\/analyze$/);
    if(analysis&&method==='POST')return await analyze(env,user,analysis[1]);
    const photo=path.match(/^\/api\/photos\/([^/]+)$/);
    if(photo&&method==='GET'){
      const file=await first(env,'SELECT * FROM photos WHERE id=?',photo[1]);if(!file)throw new AppError('사진을 찾을 수 없습니다.',404);
      if(file.object_key.startsWith('asset:'))return env.STATIC(file.object_key.slice(6));
      const object=await env.BUCKET.get(file.object_key);if(!object)throw new AppError('원본 사진을 찾을 수 없습니다.',404);
      return new Response(object.body,{headers:{'Content-Type':file.mime,'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});
    }
    if(path==='/api/examples'&&method==='POST')return await seedExamples(env,user);
    if(path==='/api/scenarios'&&method==='GET')return json({items:(await all(env,'SELECT * FROM scenarios ORDER BY created_at DESC LIMIT 50')).map(r=>({...r,params:parse(r.params),result:parse(r.result)}))});
    if(path==='/api/scenarios'&&method==='POST'){
      requireWriter(user);const body=await request.json(),name=text(body.name,'시나리오 이름',100),result=calculateScenario(body.params),scenarioId=id();
      await env.DB.batch([env.DB.prepare('INSERT INTO scenarios (id,name,params,result,created_by,created_at) VALUES (?,?,?,?,?,?)').bind(scenarioId,name,JSON.stringify(body.params),JSON.stringify(result),user.id,now()),logStatement(env,user,scenarioId,'live','SCENARIO_SAVE',{name})]);
      return json({id:scenarioId,name,result},201);
    }
    if(path==='/api/users'&&method==='GET'){requireAdmin(user);return json({items:await all(env,'SELECT * FROM users ORDER BY created_at')});}
    const member=path.match(/^\/api\/users\/([^/]+)$/);
    if(member&&method==='PATCH'){
      requireAdmin(user);const body=await request.json();if(!['admin','inspector','viewer'].includes(body.role))throw new AppError('역할을 확인해 주세요.');
      if(member[1]===user.id&&body.role!=='admin')throw new AppError('본인의 관리자 권한은 여기서 해제할 수 없습니다.');
      const changed=await run(env,'UPDATE users SET role=? WHERE id=?',body.role,member[1]);if(!changed.meta.changes)throw new AppError('사용자를 찾을 수 없습니다.',404);
      await event(env,user,member[1],'live','ROLE_CHANGE',{role:body.role});return json({ok:true});
    }
    if(path==='/api/audit'&&method==='GET')return json({items:await all(env,'SELECT * FROM audit WHERE scope=? ORDER BY created_at DESC LIMIT 100',scope(url.searchParams.get('scope')))});
    throw new AppError('요청한 기능을 찾을 수 없습니다.',404);
  }catch(error){
    if(error instanceof AppError)return json({error:error.message},error.status);
    console.error('FoldedVision API error:',error.message);
    return json({error:'처리를 완료하지 못했습니다. 잠시 후 다시 시도해 주세요.'},500);
  }
}
