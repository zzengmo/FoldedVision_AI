import test from 'node:test';
import assert from 'node:assert/strict';
import {calculateScenario,DEFAULT_SCENARIO,decisionInput,lotInput,csvCell} from './domain.mjs';
test('confirmed 3-part scenario uses per-part rounding and the confirmed 13,000 won unit loss',()=>{
  const r=calculateScenario(DEFAULT_SCENARIO);assert.equal(r.initial,750);assert.deepEqual(r.parts.map(x=>x.remaining),[45,54,0]);
  assert.equal(r.before,29250000);assert.equal(r.after,1287000);assert.equal(r.saved,27963000);assert.equal(r.projection_100m,93210000);
});
test('classification accuracy cannot silently become Ring interception',()=>{
  assert.throws(()=>calculateScenario({...DEFAULT_SCENARIO,ring_assumption:false}),/Ring/);
  assert.throws(()=>calculateScenario({...DEFAULT_SCENARIO,rates:{lens:105,ring:0,pcb:100}}),/0~100/);
});
test('decision corrections and NG/REVIEW need an accountable reason',()=>{
  assert.throws(()=>decisionInput({status:'OK',revision:1,note:''},{final_status:'NG',ai_status:'NG'}),/이유/);
  assert.throws(()=>decisionInput({status:'REVIEW',revision:0,note:''},{final_status:'PENDING'}),/사유/);
  assert.equal(decisionInput({status:'OK',revision:1,note:'확대 사진으로 정상 확인'},{final_status:'NG',ai_status:'NG'}).status,'OK');
});
test('invalid date and impossible received quantities are rejected',()=>{
  const good={code:'LOT-001',supplier:'공급사',part_type:'ring',part_number:'R-01',quantity:2,received_date:'2026-11-27'};
  assert.equal(lotInput(good).quantity,2);assert.throws(()=>lotInput({...good,quantity:0}));assert.throws(()=>lotInput({...good,received_date:'2026-02-30'}));assert.throws(()=>lotInput({...good,received_date:'2026-99-99'}),e=>e.status===400);
});
test('spreadsheet export neutralizes formulas while preserving quoted text',()=>{
  assert.equal(csvCell('=SUM(A1)'),`"'=SUM(A1)"`);assert.equal(csvCell('업체 "A"'),'"업체 ""A"""');
});
