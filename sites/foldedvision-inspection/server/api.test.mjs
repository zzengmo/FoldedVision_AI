import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {localBindings} from '../scripts/local-store.mjs';
import {api} from './api.mjs';

test('persistent inspection lifecycle, authorization, concurrency and export',async()=>{
  const root=fileURLToPath(new URL('../',import.meta.url));await mkdir(path.join(root,'.qa'),{recursive:true});
  const state=await mkdtemp(path.join(root,'.qa/api-test-'));
  let store=await localBindings(root,state);let env={...store,LOCAL_PREVIEW:'true'};
  const call=(route,options={})=>api(new Request('http://127.0.0.1:4173/api'+route,options),env);
  const post=(route,body)=>call(route,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
  try{
    const unauth=await api(new Request('https://example.invalid/api/session'),{DB:store.DB});assert.equal(unauth.status,401);
    assert.equal((await post('/lots',{code:'BAD'})).status,400);
    const csrf=await call('/lots',{method:'POST',headers:{Origin:'https://other.invalid','Content-Type':'application/json'},body:'{}'});assert.equal(csrf.status,403);
    const session=await (await call('/session')).json();assert.equal(session.user.role,'admin');
    const result=await post('/lots',{code:'API-TEST',supplier:'=SUM(A1)',part_type:'ring',part_number:'R-01',quantity:1,received_date:'2026-11-27',scope:'sample'});
    assert.equal(result.status,201);const lot=await result.json();
    const bytes=await readFile(path.join(root,'public/evidence/ring-success-original.webp'));
    async function upload(item='PART-1',bad=false){const f=new FormData();f.set('lot_id',lot.id);f.set('item_ref',item);f.append('files',new Blob([bad?'not an image':bytes],{type:'image/webp'}),'ring.webp');return call('/inspections',{method:'POST',body:f});}
    assert.equal((await upload('BAD-PHOTO',true)).status,400);
    const uploaded=await upload();assert.equal(uploaded.status,201);const inspection=await uploaded.json();
    assert.equal((await upload('PART-2')).status,400);
    const detail=await (await call('/inspections/'+inspection.id)).json();assert.equal(detail.photos.length,1);
    const photo=await call('/photos/'+detail.photos[0].id);assert.equal(photo.status,200);assert.deepEqual(new Uint8Array(await photo.arrayBuffer()),new Uint8Array(bytes));
    const analysis=await post('/inspections/'+inspection.id+'/analyze',{});assert.equal(analysis.status,200);assert.equal((await analysis.json()).available,false);
    assert.equal((await post('/inspections/'+inspection.id+'/decision',{status:'NG',revision:0,note:''})).status,400);
    const approved=await post('/inspections/'+inspection.id+'/decision',{status:'NG',revision:0,final_type:'표면 미가공',note:'표면 결함을 확인했습니다.'});assert.equal(approved.status,200);
    const stale=await post('/inspections/'+inspection.id+'/decision',{status:'OK',revision:0,note:'동시에 정상으로 변경 요청'});assert.equal(stale.status,409);
    const after=await (await call('/inspections/'+inspection.id)).json();assert.equal(after.final_status,'NG');assert.equal(after.activity.filter(a=>a.action==='DECISION').length,1);
    const corrected=await post('/inspections/'+inspection.id+'/decision',{status:'REVIEW',revision:1,note:'추가 확대 사진을 확인할 필요가 있습니다.'});assert.equal(corrected.status,200);
    const exported=await (await call('/export?scope=sample')).text();assert.ok(exported.includes("'=SUM(A1)"));assert.ok(exported.includes('표면')||exported.includes('추가 확대'));
    const live=await (await call('/summary?scope=live')).json();assert.equal(live.stats.total,0);
    const sample=await (await call('/summary?scope=sample')).json();assert.equal(sample.stats.total,1);assert.equal(sample.stats.review,1);
    const originalFetch=globalThis.fetch;let score=.8;
    env.INFERENCE_URL='https://inference.invalid';
    globalThis.fetch=async url=>new Response(JSON.stringify(String(url).endsWith('/health')?{models:{ring:{ready:true}}}:{status:'REVIEW',defect_type:'표면 미가공',type_confidence:score,model_version:'test-model',scores:{'표면 미가공':score}}),{headers:{'Content-Type':'application/json'}});
    try{
      assert.equal((await post('/inspections/'+inspection.id+'/analyze',{})).status,200);
      score=.9;
      await store.DB.prepare("UPDATE inspections SET ai_status='RUNNING',analysis_started_at=?,analysis_token='interrupted-job' WHERE id=?").bind(new Date(Date.now()-11*60*1000).toISOString(),inspection.id).run();
      assert.equal((await post('/inspections/'+inspection.id+'/analyze',{})).status,200);
      const rerun=await (await call('/inspections/'+inspection.id)).json();
      assert.equal(rerun.ai_score,.9);assert.equal(rerun.final_status,'REVIEW');
      const history=rerun.activity.filter(a=>a.action==='ANALYZE').map(a=>JSON.parse(a.detail));
      assert.equal(history.length,2);assert.ok(history.some(h=>h.results[0].type_confidence===.8));
      assert.ok(history.some(h=>h.previous.score===.8));
      await store.DB.prepare("UPDATE inspections SET ai_status='RUNNING',analysis_started_at=? WHERE id=?").bind(new Date().toISOString(),inspection.id).run();
      assert.equal((await post('/inspections/'+inspection.id+'/analyze',{})).status,409);
    }finally{globalThis.fetch=originalFetch;delete env.INFERENCE_URL;}
    const chunk=new Uint8Array(1024*1024);
    const stream=new ReadableStream({start(controller){for(let i=0;i<23;i++)controller.enqueue(chunk);controller.close();}});
    const tooLarge=await call('/inspections',{method:'POST',headers:{'Content-Type':'multipart/form-data; boundary=test'},body:stream,duplex:'half'});
    assert.equal(tooLarge.status,413);
    await store.DB.prepare("UPDATE users SET role='viewer' WHERE id='local-admin'").run();
    assert.equal((await post('/lots',{})).status,403);
    assert.equal((await post('/inspections/'+inspection.id+'/decision',{status:'OK',revision:2,note:'권한 없는 변경 요청입니다.'})).status,403);
    store.close();store=await localBindings(root,state);env={...store,LOCAL_PREVIEW:'true'};
    const persisted=await (await call('/inspections/'+inspection.id)).json();assert.equal(persisted.final_status,'REVIEW');assert.equal(persisted.photos.length,1);assert.equal(persisted.activity.filter(a=>a.action==='DECISION').length,2);
  }finally{store.close();}
});
