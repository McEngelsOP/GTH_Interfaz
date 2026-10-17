/* ==========================================================================
   Guardado del estado en IndexedDB.
   localStorage admite ~5 MB y cada postulante de Bumeran ocupa varios KB (su fila del CSV completa): con unos
   cientos de postulantes se llenaba. IndexedDB admite cientos de MB. Se guarda el mismo JSON y se valida con
   parseStoredState (storage.ts); si IndexedDB no está disponible, se usa localStorage como antes.
   ========================================================================== */

import { AppStateData } from '../types/index.ts';
import { loadAppState, parseStoredState, resetAppState, saveAppState, STORAGE_KEY } from './storage.ts';

const BASE = 'gth-talentai';
const ALMACEN = 'estado';
const ESPERA_MS = 400;   // agrupa cambios seguidos en una sola escritura

function abrir(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') { reject(new Error('IndexedDB no disponible')); return; }
    const pedido = indexedDB.open(BASE, 1);
    pedido.onupgradeneeded = () => pedido.result.createObjectStore(ALMACEN);
    pedido.onsuccess = () => resolve(pedido.result);
    pedido.onerror = () => reject(pedido.error);
  });
}

async function operar<T>(modo: IDBTransactionMode, accion: (almacen: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await abrir();
  try {
    return await new Promise<T>((resolve, reject) => {
      const tx = db.transaction(ALMACEN, modo);
      const pedido = accion(tx.objectStore(ALMACEN));
      tx.oncomplete = () => resolve(pedido.result);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}

let disponible = true;
// Con sesión de Supabase cada usuario tiene su propia copia: en una PC compartida, quien entra después no ve los
// avisos que solo podía ver el anterior (p. ej. los confidenciales de una cuenta maestra).
let clave = STORAGE_KEY;

/**
 * Estado guardado del usuario. La primera vez toma la copia anterior sin usuario (IndexedDB o localStorage),
 * la pasa a su clave y la borra de donde estaba.
 */
export async function cargarEstado(usuario?: string): Promise<AppStateData> {
  clave = usuario ? `${STORAGE_KEY}:${usuario}` : STORAGE_KEY;
  try {
    const raw = await operar<string | undefined>('readonly', (a) => a.get(clave));
    const guardado = raw ? parseStoredState(raw) : null;
    if (guardado) return guardado;
    const comun = clave === STORAGE_KEY ? undefined : await operar<string | undefined>('readonly', (a) => a.get(STORAGE_KEY));
    const anterior = (comun && parseStoredState(comun)) || loadAppState();
    await operar('readwrite', (a) => a.put(JSON.stringify(anterior), clave));
    if (comun) await operar('readwrite', (a) => a.delete(STORAGE_KEY));
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* sin acceso a localStorage */ }
    return anterior;
  } catch (error) {
    console.warn('[TalentAI] IndexedDB no disponible; se usa localStorage.', error);
    disponible = false;
    return loadAppState();
  }
}

let pendiente: AppStateData | null = null;
let temporizador: ReturnType<typeof setTimeout> | undefined;

/** Guarda el estado (con una pequeña espera para agrupar cambios). Devuelve un aviso si no se pudo guardar. */
export function guardarEstado(state: AppStateData): Promise<{ success: boolean; warning?: string }> {
  if (!disponible) return Promise.resolve(saveAppState(state));
  pendiente = state;
  clearTimeout(temporizador);
  return new Promise((resolve) => {
    temporizador = setTimeout(async () => {
      const actual = pendiente;
      pendiente = null;
      if (!actual) { resolve({ success: true }); return; }
      try {
        await operar('readwrite', (a) => a.put(JSON.stringify(actual), clave));
        resolve({ success: true });
      } catch (error: any) {
        console.warn('[TalentAI] No se pudo guardar en IndexedDB:', error);
        resolve({ success: false, warning: error?.name === 'QuotaExceededError'
          ? 'El navegador no tiene espacio para guardar los datos. Los cambios se mantendrán durante la sesión actual.'
          : 'No se pudo guardar en este navegador. Los cambios se mantendrán durante la sesión actual.' });
      }
    }, ESPERA_MS);
  });
}

/** Borra el estado guardado (IndexedDB y localStorage) y devuelve el estado inicial. */
export function borrarEstado(): AppStateData {
  clearTimeout(temporizador);
  pendiente = null;
  if (disponible) operar('readwrite', (a) => a.delete(clave)).catch(() => undefined);
  return resetAppState();
}
