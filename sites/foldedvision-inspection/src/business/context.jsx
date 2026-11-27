import {createContext,useContext,useEffect,useState} from 'react';
import {request} from './api.js';
export const OpsContext=createContext(null);
export const useOps=()=>useContext(OpsContext);
export function useResource(path,revision=0){
  const [data,setData]=useState(null),[error,setError]=useState(''),[loading,setLoading]=useState(Boolean(path)),[tick,setTick]=useState(0);
  useEffect(()=>{if(!path){setLoading(false);return;}const c=new AbortController();setLoading(true);setError('');setData(null);
    request(path,{signal:c.signal}).then(d=>{setData(d);setLoading(false);}).catch(e=>{if(e.name!=='AbortError'){setError(e.message);setLoading(false);}});return()=>c.abort();
  },[path,revision,tick]);
  return {data,error,loading,reload:()=>setTick(t=>t+1)};
}
