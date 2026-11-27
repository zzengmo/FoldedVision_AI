export const PARTS = { ring: 'Ring', lens: 'Lens', pcb: 'PCB' };
export const FINAL = { PENDING:'판정 대기', REVIEW:'재검', OK:'정상', NG:'불량' };
export class AppError extends Error { constructor(message,status=400){super(message);this.status=status;} }
export function text(value,label,max=160,required=true){
  if(typeof value!=='string') {if(!required&&value==null)return '';throw new AppError(`${label}을(를) 입력해 주세요.`);}
  const t=value.trim();if((required&&!t)||t.length>max)throw new AppError(`${label}은(는) ${required?'1':'0'}~${max}자로 입력해 주세요.`);return t;
}
export function integer(value,label,min=1,max=1000000000){const n=Number(value);if(!Number.isSafeInteger(n)||n<min||n>max)throw new AppError(`${label}의 범위를 확인해 주세요 (${min.toLocaleString()}~${max.toLocaleString()}).`);return n;}
export function scope(value){if(value==null||value==='live')return 'live';if(value==='sample')return 'sample';throw new AppError('작업공간을 확인해 주세요.');}
export function lotInput(body){
  if(!PARTS[body.part_type])throw new AppError('검사 부품을 선택해 주세요.');
  const received=text(body.received_date,'입고일',10);
  const timestamp=Date.parse(received+'T00:00:00Z');
  if(!/^\d{4}-\d{2}-\d{2}$/.test(received)||!Number.isFinite(timestamp)||new Date(timestamp).toISOString().slice(0,10)!==received)throw new AppError('입고일을 확인해 주세요.');
  return {code:text(body.code,'LOT 번호',60),supplier:text(body.supplier,'공급사',100),part_type:body.part_type,
    part_number:text(body.part_number,'품번',80),quantity:integer(body.quantity,'입고 수량'),received_date:received,note:text(body.note,'메모',1000,false),scope:scope(body.scope)};
}
export function decisionInput(body,record){
  if(!['OK','NG','REVIEW'].includes(body.status))throw new AppError('판정은 정상·불량·재검 중에서 선택해 주세요.');
  const revision=integer(body.revision,'기록 버전',0,1000000);
  const note=text(body.note,'판정 사유',1000,false);
  if(body.status!=='OK'&&note.length<5)throw new AppError('불량·재검 판정 사유를 5자 이상 입력해 주세요.');
  if(record.final_status!=='PENDING'&&note.length<5)throw new AppError('기존 판정을 변경하는 이유를 5자 이상 입력해 주세요.');
  if(record.ai_status==='NG'&&body.status==='OK'&&note.length<5)throw new AppError('AI 제안과 다르게 정상으로 확정하는 이유를 입력해 주세요.');
  const final_type=text(body.final_type,'확정 결함 유형',80,false);
  if(body.status==='NG'&&!final_type)throw new AppError('담당자가 확인한 결함 유형을 입력해 주세요.');
  return {status:body.status,note,revision,final_type:body.status==='NG'?final_type:null};
}
export function csvCell(value){const s=String(value??'');const safe=/^[\s]*[=+\-@\t\r]/.test(s)?"'"+s:s;return '"'+safe.replaceAll('"','""')+'"';}
export function csv(rows){return '\ufeff'+rows.map(row=>row.map(csvCell).join(',')).join('\r\n');}
export function calculateScenario(input){
  const annual=integer(input.annual,'연간 부품별 생산량');
  const ppm=Number(input.ppm),unit=integer(input.unit_cost,'불량 1개당 손실',0,10000000);
  if(!Number.isFinite(ppm)||ppm<0||ppm>1000000)throw new AppError('불량률은 0~1,000,000 ppm 범위로 입력해 주세요.');
  const rates=input.rates;
  if(!rates||!['lens','ring','pcb'].every(k=>Number.isFinite(Number(rates[k]))&&Number(rates[k])>=0&&Number(rates[k])<=100))throw new AppError('각 적용 비율은 0~100%로 입력해 주세요.');
  if(Number(rates.ring)>0&&!input.ring_assumption)throw new AppError('Ring 유형 분류율을 차단율로 가정하는 조건을 확인해 주세요.');
  const initial=Math.round(annual*ppm/1000000);
  const parts=['lens','ring','pcb'].map(part=>{const remaining=Math.round(initial*(1-Number(rates[part])/100));return {part,initial,remaining,reduced:initial-remaining,rate:Number(rates[part])};});
  const before=initial*3*unit,after=parts.reduce((n,p)=>n+p.remaining,0)*unit;
  if(!Number.isSafeInteger(before)||!Number.isSafeInteger(after))throw new AppError('계산 가능한 금액 범위를 초과했습니다. 생산량이나 단가를 줄여 주세요.');
  return {annual,ppm,unit_cost:unit,initial,parts,before,after,saved:before-after,projection_100m:Math.round((before-after)*100000000/annual)};
}
export const DEFAULT_SCENARIO={annual:30000000,ppm:25,unit_cost:13000,rates:{lens:202/215*100,ring:39/42*100,pcb:100},ring_assumption:true};
export function today(){return new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Seoul'}).format(new Date());}
