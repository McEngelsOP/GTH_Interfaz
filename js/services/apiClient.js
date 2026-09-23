import { normalizeCandidate } from '../domain.js';

// Integration boundary, deliberately not enabled by the demonstration bootstrap.
// Authentication, authorization, uploads and all writes must be implemented by the server.
export class ApiError extends Error {
  constructor(message,status=0,code='NETWORK') { super(message);this.name='ApiError';this.status=status;this.code=code; }
}
export class ApiClient {
  constructor({ baseUrl='/api/v1', fetchImpl=globalThis.fetch, timeoutMs=15000 }={}) {
    this.baseUrl=baseUrl.replace(/\/$/,'');this.fetchImpl=fetchImpl;this.timeoutMs=timeoutMs;
  }
  async get(path,{signal}={}) {
    const controller=new AbortController();
    const abort=()=>controller.abort(signal?.reason);
    if(signal?.aborted)abort();else signal?.addEventListener('abort',abort,{once:true});
    const timer=setTimeout(()=>controller.abort(),this.timeoutMs);
    try {
      const response=await this.fetchImpl(`${this.baseUrl}${path}`,{signal:controller.signal,credentials:'same-origin',headers:{Accept:'application/json'}});
      if(!response.ok)throw new ApiError(response.status===403?'No tienes permiso para consultar estos datos.':'No se pudo completar la consulta.',response.status,'HTTP');
      let data;
      try{data=await response.json();}catch{throw new ApiError('La respuesta no contiene JSON válido.',response.status,'INVALID_RESPONSE');}
      return data;
    } catch(error) {
      if(error instanceof ApiError)throw error;
      throw new ApiError(controller.signal.aborted?'La consulta se canceló o agotó su tiempo.':'No se pudo conectar con el servicio.',0,controller.signal.aborted?'ABORTED':'NETWORK');
    } finally {clearTimeout(timer);signal?.removeEventListener('abort',abort);}
  }
  async listCandidates(jobId,{cursor='',limit=50,query='',signal}={}) {
    if(![25,50,100].includes(limit))throw new ApiError('Tamaño de página inválido.',0,'INVALID_REQUEST');
    const params=new URLSearchParams({limit:String(limit),query});if(cursor)params.set('cursor',cursor);
    const data=await this.get(`/jobs/${encodeURIComponent(jobId)}/applications?${params}`,{signal});
    if(!data||!Array.isArray(data.items)||!Number.isInteger(data.total)||data.total<data.items.length||data.items.length>limit||typeof data.snapshotId!=='string'||!(data.nextCursor===null||typeof data.nextCursor==='string'))throw new ApiError('Formato de página inválido.',0,'INVALID_RESPONSE');
    const ids=new Set();
    const items=data.items.map(item=>{
      if(!item||!Number.isInteger(item.rank)||item.rank<1||typeof item.inTopN!=='boolean'||ids.has(item.id))throw new ApiError('Ranking remoto inválido.',0,'INVALID_RESPONSE');
      ids.add(item.id);
      try{return {...normalizeCandidate({...item,demo:false},jobId),rank:item.rank,inTopN:item.inTopN};}catch{throw new ApiError('Postulación remota inválida.',0,'INVALID_RESPONSE');}
    });
    return {items,total:data.total,nextCursor:data.nextCursor,snapshotId:data.snapshotId};
  }
}
