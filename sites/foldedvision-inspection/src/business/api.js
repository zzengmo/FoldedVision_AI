export async function request(path,options={}){
  const {body,...rest}=options;
  const response=await fetch('/api'+path,{...rest,headers:body instanceof FormData?rest.headers:{'Content-Type':'application/json',...rest.headers},body:body instanceof FormData?body:body===undefined?undefined:JSON.stringify(body)});
  if(!response.ok){let data;try{data=await response.json();}catch{}const e=new Error(data?.error||'서버에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.');e.status=response.status;throw e;}
  return response.json();
}
export const number=n=>Number(n||0).toLocaleString('ko-KR');
export const money=n=>number(n)+'원';
export const dateTime=value=>value?new Intl.DateTimeFormat('ko-KR',{timeZone:'Asia/Seoul',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date(value)):'—';
export const dateOnly=value=>value?new Intl.DateTimeFormat('ko-KR',{timeZone:'Asia/Seoul',year:'numeric',month:'long',day:'numeric',weekday:'short'}).format(new Date(value)):'';
export const PARTS={ring:'Ring',lens:'Lens',pcb:'PCB'};
export const STATUSES={OK:'정상',NG:'불량',REVIEW:'재검',PENDING:'판정 대기',NOT_RUN:'분석 전',UNAVAILABLE:'연결 대기',ERROR:'분석 실패',RUNNING:'분석 중'};
export function navigate(route,params={}){const search=new URLSearchParams(Object.entries(params).filter(([,v])=>v!=null&&v!==''));location.hash=route+(search.size?'?'+search:'');}
export async function download(url,filename){const r=await fetch(url);if(!r.ok){const e=await r.json();throw new Error(e.error||'내보내기에 실패했습니다.');}const blob=await r.blob();const href=URL.createObjectURL(blob);const a=document.createElement('a');a.href=href;a.download=filename;a.click();setTimeout(()=>URL.revokeObjectURL(href),1000);}
