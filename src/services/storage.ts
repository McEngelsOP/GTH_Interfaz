/* ==========================================================================
   TalentAI | GTHC · ESAN — Capa de Persistencia Local Versionada
   ========================================================================== */

import { AppStateData } from '../types/index.ts';
import { INITIAL_APP_STATE } from '../data/initialData.ts';

const STORAGE_KEY = 'GTH_ESAN_STATE_V1';

export function loadAppState(): AppStateData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return INITIAL_APP_STATE;
    }
    const parsed = JSON.parse(raw);
    // Verificar estructura mínima
    if (
      Array.isArray(parsed.jobPostings) &&
      Array.isArray(parsed.candidates) &&
      Array.isArray(parsed.applications)
    ) {
      return {
        ...INITIAL_APP_STATE,
        ...parsed,
      };
    }
    return INITIAL_APP_STATE;
  } catch (error) {
    console.warn('[TalentAI Storage] No se pudo leer localStorage, usando estado inicial:', error);
    return INITIAL_APP_STATE;
  }
}

export function saveAppState(state: AppStateData): { success: boolean; warning?: string } {
  try {
    const serialized = JSON.stringify(state);
    localStorage.setItem(STORAGE_KEY, serialized);
    return { success: true };
  } catch (error: any) {
    console.warn('[TalentAI Storage] Error al guardar en localStorage:', error);
    const isQuotaExceeded =
      error?.name === 'QuotaExceededError' ||
      error?.code === 22 ||
      error?.code === 1014;
    return {
      success: false,
      warning: isQuotaExceeded
        ? 'El almacenamiento local ha alcanzado su límite. Los cambios se mantendrán durante la sesión actual.'
        : 'No se pudo guardar en el almacenamiento local. Los cambios se mantendrán durante la sesión.',
    };
  }
}

export function resetAppState(): AppStateData {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    console.warn('Error al limpiar localStorage:', e);
  }
  return INITIAL_APP_STATE;
}
