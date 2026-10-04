import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
let EvaluationError: typeof import('../evaluationService.ts').EvaluationError;

beforeEach(async () => { vi.useFakeTimers(); vi.setSystemTime(0); vi.resetModules(); EvaluationError=(await import('../evaluationService.ts')).EvaluationError; });
afterEach(() => { vi.useRealTimers(); });

describe('cola de evaluación', () => {
  it('solapa peticiones con concurrencia limitada y acelera un lote de 100 perfiles', async () => {
    const { runEvaluationQueue,evaluationDelay }=await import('../evaluationQueue.ts');
    const signal=new AbortController().signal;
    let active=0,maxActive=0;const starts:number[]=[],done:number[]=[];
    const task=runEvaluationQueue(Array.from({length:100},(_,i)=>i),{concurrency:3,intervalMs:3100},signal,async item=>{
      starts.push(Date.now());active++;maxActive=Math.max(maxActive,active);
      await evaluationDelay(8000,signal);active--;done.push(item);
    });
    await vi.runAllTimersAsync();await task;
    expect(maxActive).toBe(3);expect(done).toHaveLength(100);
    expect(new Set(done).size).toBe(100);
    expect(starts.slice(1).every((t,i)=>t-starts[i]>=3100)).toBe(true);
    expect(Date.now()).toBe(314900); // 5m 14.9s simulados, frente a 19m 56s con intervalos de 12s.
  });
  it('respeta la espera por cuota y reintenta el mismo perfil sin repetir resultados recibidos', async () => {
    const { runEvaluationQueue }=await import('../evaluationQueue.ts');
    const sent:{item:number;time:number}[]=[];let retry=true;
    const callback=vi.fn();
    const task=runEvaluationQueue([1,2,3],{concurrency:2,intervalMs:500},new AbortController().signal,async item=>{
      sent.push({item,time:Date.now()});
      if(item===2 && retry){retry=false;throw new EvaluationError('Espera.','RATE',429,20000);}
    },callback);
    await vi.runAllTimersAsync();await task;
    expect(sent.map(s=>s.item)).toEqual([1,2,3,2]);
    expect(sent[2].time).toBeGreaterThanOrEqual(20500);
    expect(callback).toHaveBeenCalledOnce();
  });
  it('pausar cancela las esperas y evita iniciar más perfiles', async () => {
    const { runEvaluationQueue }=await import('../evaluationQueue.ts');
    const c=new AbortController(),sent:number[]=[];
    const task=runEvaluationQueue([1,2,3],{concurrency:3,intervalMs:3100},c.signal,async item=>{sent.push(item);});
    await vi.advanceTimersByTimeAsync(100);c.abort();
    await vi.runAllTimersAsync();await task;
    expect(sent).toEqual([1]);
  });
  it('los errores de configuración detienen nuevos envíos y conservan las respuestas ya en curso', async () => {
    const { runEvaluationQueue,evaluationDelay }=await import('../evaluationQueue.ts');
    const signal=new AbortController().signal,sent:number[]=[],done:number[]=[];
    const task=runEvaluationQueue([1,2,3,4],{concurrency:3,intervalMs:500},signal,async item=>{
      sent.push(item);
      if(item===2)throw new EvaluationError('Sin permisos.','AUTH',403);
      await evaluationDelay(2000,signal);done.push(item);
    });
    const assertion=expect(task).rejects.toMatchObject({status:403});
    await vi.runAllTimersAsync();await assertion;
    expect(sent).toEqual([1,2]);expect(done).toEqual([1]);
  });
  it('acota reintentos y rechaza configuración fuera de rango', async () => {
    const { runEvaluationQueue,evaluationQueueOptions }=await import('../evaluationQueue.ts');
    const process=vi.fn(async()=>{throw new EvaluationError('Espera.','RATE',429,1000);});
    const task=runEvaluationQueue([1],{concurrency:1,intervalMs:500},new AbortController().signal,process);
    const assertion=expect(task).rejects.toMatchObject({status:429});
    await vi.runAllTimersAsync();await assertion;
    expect(process).toHaveBeenCalledTimes(3);
    expect(evaluationQueueOptions({concurrency:100,intervalSeconds:0})).toEqual({concurrency:1,intervalMs:12000});
  });
});
