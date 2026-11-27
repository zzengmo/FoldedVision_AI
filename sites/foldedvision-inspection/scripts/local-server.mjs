import http from 'node:http';
import {Readable} from 'node:stream';
import {readFile,stat} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawn} from 'node:child_process';
import {randomUUID} from 'node:crypto';
import {api} from '../server/api.mjs';
import {localBindings} from './local-store.mjs';

const root=fileURLToPath(new URL('../',import.meta.url));
const port=Number(process.env.PORT||4173),host='127.0.0.1';
const bindings=await localBindings(root);
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.json':'application/json'};
async function staticFile(requested){
  const safe=path.posix.normalize(decodeURIComponent(requested));if(safe.includes('..')||safe.includes('\\'))return new Response('Not found',{status:404});
  for(const folder of ['.runtime/client','public']){
    const f=path.join(root,folder,safe==='/'?'index.html':safe.slice(1));
    if(!f.startsWith(path.join(root,folder)+path.sep))continue;
    try{if((await stat(f)).isFile())return new Response(await readFile(f),{headers:{'Content-Type':types[path.extname(f)]||'application/octet-stream','Cache-Control':'no-cache'}});}catch{}
  }
  return new Response('Run npm run build, or open the Vite development URL.',{status:404});
}
const env={...bindings,LOCAL_PREVIEW:'true',INFERENCE_URL:process.env.INFERENCE_URL||'http://127.0.0.1:8011',INFERENCE_TOKEN:process.env.INFERENCE_TOKEN||randomUUID(),STATIC:staticFile};
let modelProcess;
const python=path.resolve(root,'../../.venv/Scripts/python.exe');
if(!process.env.INFERENCE_URL&&existsSync(python)&&process.env.NO_MODEL!=='1'){
  modelProcess=spawn(python,['-m','uvicorn','inference.app:app','--host','127.0.0.1','--port','8011','--log-level','warning'],{cwd:root,env:{...process.env,INFERENCE_TOKEN:env.INFERENCE_TOKEN,TF_CPP_MIN_LOG_LEVEL:'2',CUDA_VISIBLE_DEVICES:'-1'},stdio:['ignore','inherit','inherit'],windowsHide:true});
  modelProcess.on('error',()=>console.error('Model service could not start. Manual inspection remains available.'));
}
const server=http.createServer(async(req,res)=>{
  try{
    const headers=new Headers();for(const [k,v] of Object.entries(req.headers)){if(k.startsWith('oai-authenticated-user-'))continue;if(v)headers.set(k,Array.isArray(v)?v.join(','):v);}
    const url=`http://${host}:${port}${req.url}`;
    const request=new Request(url,{method:req.method,headers,...(!['GET','HEAD'].includes(req.method)?{body:Readable.toWeb(req),duplex:'half'}:{})});
    const response=new URL(url).pathname.startsWith('/api/')?await api(request,env):await staticFile(new URL(url).pathname);
    res.writeHead(response.status,Object.fromEntries(response.headers));if(response.body)Readable.fromWeb(response.body).pipe(res);else res.end();
  }catch(e){console.error(e.message);res.writeHead(500,{'Content-Type':'application/json'});res.end(JSON.stringify({error:'요청을 처리하지 못했습니다.'}));}
});
server.on('error',error=>{
  modelProcess?.kill();bindings.close();
  console.error(error.code==='EADDRINUSE'?`Port ${port} is already in use. Open the existing workspace or close its server window first.`:error.message);
  process.exitCode=1;
});
server.listen(port,host,()=>{
  const url=`http://${host}:${port}`;
  console.log(`FoldedVision workspace: ${url}\nRecords and photos: .runtime/ (persistent, local only)`);
  if(process.env.FOLDEDVISION_OPEN==='1')spawn(process.platform==='win32'?'explorer.exe':process.platform==='darwin'?'open':'xdg-open',[url],{stdio:'ignore',windowsHide:true}).on('error',()=>{});
});
function shutdown(){modelProcess?.kill();server.close(()=>{bindings.close();process.exit(0);});setTimeout(()=>process.exit(0),2000).unref();}
process.on('SIGINT',shutdown);process.on('SIGTERM',shutdown);
