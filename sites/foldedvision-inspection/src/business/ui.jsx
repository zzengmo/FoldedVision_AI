import React,{useEffect,useRef} from 'react';
import {Check,AlertTriangle,Clock3,LoaderCircle,X,Inbox,Search} from 'lucide-react';
import {STATUSES} from './api.js';
export function Badge({status,children}){const Icon=status==='OK'?Check:['NG','ERROR'].includes(status)?AlertTriangle:status==='RUNNING'?LoaderCircle:Clock3;return <span className={'status status-'+status.toLowerCase()}><Icon size={13}/>{children||STATUSES[status]||status}</span>;}
export function Button({children,variant='primary',className='',busy=false,icon:Icon,...props}){return <button {...props} disabled={busy||props.disabled} className={`op-button ${variant} ${className}`}>{busy?<LoaderCircle size={17} className="spin"/>:Icon&&<Icon size={17}/>}<span>{children}</span></button>;}
export function Field({label,hint,children,required}){return <label className="field"><span className="field-label">{label}{required&&<b aria-label="필수"> *</b>}</span>{children}{hint&&<small>{hint}</small>}</label>;}
export function Empty({title='등록된 기록이 없습니다',description,action,icon:Icon=Inbox,compact=false}){return <div className={'empty-state'+(compact?' compact':'')}><span className="empty-icon"><Icon size={27} strokeWidth={1.5}/></span><h3>{title}</h3>{description&&<p>{description}</p>}{action}</div>;}
export function SearchField({value,onChange,placeholder='검색',...props}){return <div className="search-field"><Search size={17}/><input {...props} aria-label={placeholder} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder}/>{value&&<button type="button" onClick={()=>onChange('')} aria-label="검색어 지우기"><X size={15}/></button>}</div>;}
export function ErrorBox({message,onRetry}){return <div className="error-box" role="alert"><AlertTriangle size={19}/><span>{message}</span>{onRetry&&<Button variant="ghost" onClick={onRetry}>다시 시도</Button>}</div>;}
export function Loading(){return <div className="loading-state" role="status"><LoaderCircle className="spin" size={23}/><span>검사 기록을 불러오고 있습니다</span></div>;}
export function Dialog({title,description,children,onClose,wide=false}){
  const ref=useRef();useEffect(()=>{ref.current.showModal();return()=>ref.current?.close();},[]);
  return <dialog ref={ref} className={'op-dialog'+(wide?' wide':'')} onCancel={e=>{e.preventDefault();onClose();}} onClick={e=>{if(e.target===ref.current)onClose();}}><div className="dialog-header"><div><h2>{title}</h2>{description&&<p>{description}</p>}</div><button className="icon-button" onClick={onClose} aria-label="닫기"><X size={21}/></button></div>{children}</dialog>;
}
export function PageHead({eyebrow,title,description,children}){return <div className="page-head"><div>{eyebrow&&<span className="op-eyebrow">{eyebrow}</span>}<h1>{title}</h1>{description&&<p>{description}</p>}</div>{children&&<div className="page-actions">{children}</div>}</div>;}
export function PanelHead({title,description,children}){return <div className="panel-head"><div><h2>{title}</h2>{description&&<p>{description}</p>}</div>{children}</div>;}
export function MiniChart({data=[],height=180}){
  const w=720,h=height,days=Array.from({length:14},(_,i)=>{const d=new Date();d.setUTCDate(d.getUTCDate()-13+i);return d.toLocaleDateString('sv-SE',{timeZone:'Asia/Seoul'});});
  const values=days.map(day=>data.find(x=>x.day===day)||{day,total:0,ng:0});const max=Math.max(5,...values.map(x=>x.total));
  return <div className="trend-chart"><svg viewBox={`0 0 ${w} ${h+32}`} role="img" aria-label="최근 14일의 검사 건수와 확정 불량 건수"><title>검사 건수 · 확정 불량 건수</title>{[0,.5,1].map(n=><g key={n}><line x1="32" x2={w-8} y1={h-h*n+4} y2={h-h*n+4} stroke="#e4eaf1"/><text x="0" y={h-h*n+8} fill="#78879b" fontSize="12">{Math.round(max*n)}</text></g>)}{values.map((d,i)=>{const x=45+i*(w-55)/14,bh=d.total/max*(h-12),nh=d.ng/max*(h-12);return <g key={d.day}><rect x={x} y={h-bh+4} width="25" height={Math.max(2,bh)} rx="3" fill={d.total?'#b7dfdc':'#e9eff4'}/>{d.ng>0&&<rect x={x} y={h-nh+4} width="25" height={nh} rx="3" fill="#dc7176"/>}<title>{d.day}: 검사 {d.total}건, 불량 {d.ng}건</title>{i%3===0&&<text x={x+12} y={h+27} fill="#78879b" fontSize="12" textAnchor="middle">{d.day.slice(5).replace('-','.')}</text>}</g>;})}</svg></div>;
}
