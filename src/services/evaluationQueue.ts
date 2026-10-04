import { EvaluationError } from './evaluationService.ts';

export interface EvaluationQueueOptions { concurrency: number; intervalMs: number }
// Compatible con despliegues anteriores que aún anuncian solo configured.
export const LEGACY_QUEUE_OPTIONS: EvaluationQueueOptions = { concurrency: 1, intervalMs: 12_000 };
export function evaluationQueueOptions(value: unknown): EvaluationQueueOptions {
  const config = value as Record<string, unknown> | null;
  const concurrency = config?.concurrency, seconds = config?.intervalSeconds;
  return { concurrency: typeof concurrency === 'number' && Number.isInteger(concurrency) && concurrency >= 1 && concurrency <= 5 ? concurrency : 1,
    intervalMs: typeof seconds === 'number' && Number.isFinite(seconds) && seconds >= .5 && seconds <= 61 ? seconds * 1000 : LEGACY_QUEUE_OPTIONS.intervalMs };
}
export function evaluationDelay(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) { reject(new DOMException('Cancelado', 'AbortError')); return; }
    const stop = () => { clearTimeout(timer); reject(new DOMException('Cancelado', 'AbortError')); };
    const timer = setTimeout(() => { signal.removeEventListener('abort', stop); resolve(); }, ms);
    signal.addEventListener('abort', stop, { once: true });
  });
}

let lastStart: number | undefined;
let startGate: Promise<void> = Promise.resolve();
/** Pool limitado: separa los inicios, solapa respuestas y respeta Retry-After. */
export async function runEvaluationQueue<T>(items: T[], options: EvaluationQueueOptions, signal: AbortSignal,
  process: (item: T) => Promise<void>, onRetry: (item: T, waitMs: number) => void = () => {}) {
  let cursor = 0, halted = false, pauseUntil = 0, failure: unknown;
  const haltController = new AbortController();
  const waitSignal = AbortSignal.any([signal,haltController.signal]);
  let intervalMs = options.intervalMs;
  async function start() {
    const turn = startGate.then(async () => {
      while (!halted && !signal.aborted) {
        const remaining = Math.max(0, pauseUntil - Date.now(), lastStart === undefined ? 0 : lastStart + intervalMs - Date.now());
        if (!remaining) { lastStart = Date.now(); return; }
        await evaluationDelay(remaining, waitSignal);
      }
      throw new DOMException('Cancelado', 'AbortError');
    });
    startGate = turn.catch(() => {});
    await turn;
  }
  async function worker() {
    while (!halted && !signal.aborted && cursor < items.length) {
      const item = items[cursor++];
      for (let attempt = 0; !halted && !signal.aborted; attempt++) {
        try { await start(); await process(item); break; }
        catch (error) {
          if (signal.aborted || halted) break;
          if (error instanceof EvaluationError && error.status === 429 && error.retryAfterMs !== undefined && error.retryAfterMs <= 120_000 && attempt < 2) {
            // Se reduce el ritmo de todo el lote, no solo el perfil que obtuvo 429.
            intervalMs = Math.min(60_000,Math.max(intervalMs * 2,12_500));
            pauseUntil = Math.max(pauseUntil,Date.now() + error.retryAfterMs);
            onRetry(item,error.retryAfterMs); continue;
          }
          failure = error; halted = true; haltController.abort(); break;
        }
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(options.concurrency,items.length) },worker));
  if (failure) throw failure;
}
