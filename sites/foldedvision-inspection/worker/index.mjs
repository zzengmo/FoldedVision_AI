import {api} from '../server/api.mjs';
import assets from '../.runtime/assets.generated.mjs';
function staticAsset(path){
  const key=path==='/'?'/index.html':path;
  const asset=assets[key];if(!asset)return new Response('Not found',{status:404});
  const binary=atob(asset.body),bytes=new Uint8Array(binary.length);
  for(let i=0;i<binary.length;i++)bytes[i]=binary.charCodeAt(i);
  return new Response(bytes,{headers:{'Content-Type':asset.type,'Cache-Control':key.startsWith('/assets/')?'public, max-age=31536000, immutable':'no-cache','X-Content-Type-Options':'nosniff','Referrer-Policy':'same-origin'}});
}
export default {async fetch(request,env){
  const url=new URL(request.url);
  if(url.pathname.startsWith('/api/'))return api(request,{...env,STATIC:async p=>staticAsset(p)});
  if(!['GET','HEAD'].includes(request.method))return new Response('Method not allowed',{status:405});
  const response=staticAsset(url.pathname);
  if(request.method==='HEAD')return new Response(null,{status:response.status,headers:response.headers});
  return response;
}};
