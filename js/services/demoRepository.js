import { MOCK_JOB_POSTINGS, MOCK_DOCENTE_CANDIDATES, MOCK_OPERATIVO_CANDIDATES, MOCK_ADMIN_CANDIDATES, MOCK_TALENT_POOL, ORGANIZATIONAL_TEMPLATES } from '../mockData.js';
import { normalizeCandidate, validateWeights, text, numberOrNull } from '../domain.js';

const KEY = 'talentai.demo.workspace.v2';
const clone = value => JSON.parse(JSON.stringify(value));
export function createDemoRepository() {
  return {
    mode: 'demo',
    load() {
      let snapshot = null;
      try { snapshot = JSON.parse(localStorage.getItem(KEY)); } catch { /* memory-only demo */ }
      const seed = { jobPostings: clone(MOCK_JOB_POSTINGS), candidatesByJob: { 'REQ-2026-DOC-088': clone(MOCK_DOCENTE_CANDIDATES), 'REQ-2026-OPE-014': clone(MOCK_OPERATIVO_CANDIDATES), 'REQ-2026-ADM-032': clone(MOCK_ADMIN_CANDIDATES) }, talentPool: clone(MOCK_TALENT_POOL), templates: clone(ORGANIZATIONAL_TEMPLATES) };
      if (!snapshot || snapshot.version !== 2 || snapshot.mode !== 'demo') return seed;
      try {
        if (!Array.isArray(snapshot.jobPostings) || !snapshot.jobPostings.length) return seed;
        const ids = new Set();
        for (const j of snapshot.jobPostings) {
          if (!j || typeof j.id !== 'string' || !/^[a-zA-Z0-9_-]+$/.test(j.id) || ids.has(j.id) || !['docente','administrativo','operativo','directivo'].includes(j.roleType) || ['title','department','period','roleTypeName'].some(k => typeof j[k] !== 'string')) return seed;
          validateWeights(j.weights); ids.add(j.id);
          j.defaultTopN = Number.isSafeInteger(j.defaultTopN) && j.defaultTopN > 0 ? j.defaultTopN : 5;
        }
        for (const [id, candidates] of Object.entries(snapshot.candidatesByJob || {})) {
          if (!ids.has(id) || !Array.isArray(candidates)) return seed;
          snapshot.candidatesByJob[id] = candidates.filter(c => c.demo !== false).map(c => normalizeCandidate(c, id));
          if (new Set(snapshot.candidatesByJob[id].map(c => c.id)).size !== snapshot.candidatesByJob[id].length) return seed;
        }
        const talentPool = Array.isArray(snapshot.talentPool) ? snapshot.talentPool.filter(t => t && typeof t.id === 'string').map(t => ({
          id: t.id, candidateId: text(t.candidateId, t.id), name: text(t.name, 'Perfil sin nombre'), roleCategory: text(t.roleCategory, 'Sin categoría'),
          previousVacancy: text(t.previousVacancy), matchReason: text(t.matchReason), scoreObtained: numberOrNull(t.scoreObtained), mlScore: numberOrNull(t.mlScore), llmScore: numberOrNull(t.llmScore), jobPostingId: text(t.jobPostingId),
          crossMatchOpportunity: text(t.crossMatchOpportunity), tags: Array.isArray(t.tags) ? t.tags.filter(tag => typeof tag === 'string') : []
        })) : seed.talentPool;
        return { ...seed, jobPostings: snapshot.jobPostings, candidatesByJob: snapshot.candidatesByJob || {}, talentPool };
      } catch { return seed; }
    },
    save(state) {
      try {
        localStorage.setItem(KEY, JSON.stringify({ version: 2, mode: 'demo', jobPostings: state.jobPostings, candidatesByJob: Object.fromEntries(Object.entries(state.candidatesByJob).map(([id,rows]) => [id, rows.filter(c => c.demo !== false)])), talentPool: state.talentPool }));
        return true;
      } catch { return false; }
    }
  };
}
