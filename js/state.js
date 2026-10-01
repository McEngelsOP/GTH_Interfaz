/* ==========================================================================
   TalentAI - GTHC · ESAN
   State Management & Reactive Subscriptions
   ========================================================================== */

import { createDemoRepository } from './services/demoRepository.js';
import { normalizeCandidate, validateWeights, reweightCandidate, isEligible, candidateScore, STAGES } from './domain.js';
import { notify as notice } from './ui.js';

class AppState {
  constructor(repository = createDemoRepository()) {
    this.repository = repository;
    const seed = repository.load();
    this.jobPostings = [...seed.jobPostings, ...this.loadDemoJobs().filter(j => !seed.jobPostings.some(existing => existing.id === j.id))];
    this.activeJobPostingId = this.jobPostings[0].id;
    this.jobPosting = this.jobPostings[0];
    
    this.topN = this.jobPosting.defaultTopN;
    this.rankingModel = this.jobPosting.rankingModel === 'llm' ? 'llm' : 'ml';
    this.searchQuery = '';
    this.filterSource = 'all';
    this.filterStatus = 'active';
    this.sortBy = 'score';
    this.sortOrder = 'desc';
    this.selectedCandidateId = null;
    this.selectedRows = new Set();
    this.sidebarCollapsed = false;
    this.copilotCollapsed = true;
    this.activeDrawerTab = 'explain';

    // One operational workspace; production authorization belongs on the server.
    this.currentUserRole = 'gthc';
    this.rolesConfig = {
      gthc: { roleId: 'gthc', roleLabel: 'Equipo de GTHC', userName: 'Equipo de GTHC',
        userRole: 'Gestión del talento · ESAN', initials: 'GT',
        stages: ['convocatorias', 'evaluacion', 'seleccion', 'talento', 'gobernanza', 'direccion'] }
    };

    // Architecture States
    this.currentView = 'convocatorias';
    this.comparisonPool = new Set();
    this.talentPool = seed.talentPool;
    this.talentSearchQuery = '';
    this.templates = seed.templates;
    this.candidatesByJob = {};
    for (const job of this.jobPostings) {
      job.weights = validateWeights(job.weights);
      this.candidatesByJob[job.id] = (seed.candidatesByJob[job.id] || []).map(c => normalizeCandidate({ ...c, demo: true }, job.id));
      this.refreshJobMetrics(job.id);
    }

    // Current candidates for active job
    this.candidates = this.sortCandidates([...this.candidatesByJob[this.activeJobPostingId]]);
    this.updateTopNFlags();

    this.listeners = [];
  }

  // Migrate vacancies from the earlier demonstration snapshot.
  loadDemoJobs() {
    try {
      const saved = JSON.parse(localStorage.getItem('talentai.demo.jobs.v1') || '[]');
      return Array.isArray(saved) ? saved.filter(j => j && j.demo === true && /^REQ-DEMO-[A-Z0-9-]+$/.test(j.id) && ['title','department','period','roleTypeName'].every(k => typeof j[k] === 'string') && ['docente','administrativo','operativo','directivo'].includes(j.roleType) && Array.isArray(j.weights) && j.weights.length && j.weights.every(w => w && typeof w.label === 'string' && Number.isInteger(w.weightPct) && w.weightPct >= 0 && w.weightPct <= 100) && j.weights.reduce((sum,w) => sum+w.weightPct,0) === 100) : [];
    } catch {
      return [];
    }
  }

  saveDemoJobs() {
    try {
      localStorage.setItem('talentai.demo.jobs.v1', JSON.stringify(this.jobPostings.filter(j => j.demo)));
    } catch {
      // The demo still works in private browsing or when storage is unavailable.
    }
  }

  createJobPosting(fields) {
    if (!this.can('jobs')) throw new Error('Este rol no puede crear convocatorias.');
    const title = String(fields.title || '').trim();
    const department = String(fields.department || '').trim();
    const vacancies = Number(fields.vacancies);
    const validRoles = ['docente', 'administrativo', 'operativo', 'directivo'];
    const weights = (fields.weights || []).map(w => ({
      label: String(w.label || '').trim(),
      weightPct: Number(w.weightPct),
      type: w.type === 'LLM' ? 'LLM' : 'ML'
    }));
    if (!title || !department || !validRoles.includes(fields.roleType) || !Number.isInteger(vacancies) || vacancies < 1 || vacancies > 100) {
      throw new Error('Completa el puesto, el área, la categoría y un número válido de vacantes.');
    }
    if (!weights.length || weights.some(w => !w.label || !Number.isInteger(w.weightPct) || w.weightPct < 0 || w.weightPct > 100) || weights.reduce((sum, w) => sum + w.weightPct, 0) !== 100) {
      throw new Error('Los criterios deben tener nombres y sus pesos sumar 100 %.');
    }
    if (fields.openDate && fields.closeDate && fields.closeDate < fields.openDate) {
      throw new Error('La fecha de cierre debe ser posterior a la de apertura.');
    }
    const roleNames = { docente: 'Docente Universitario', administrativo: 'Personal Administrativo', operativo: 'Personal Operativo', directivo: 'Cargo Directivo' };
    const groups = { docente: 'Docente', administrativo: 'Administrativo', operativo: 'Operativo', directivo: 'Directivo' };
    const id = `REQ-DEMO-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 5).toUpperCase()}`;
    const job = {
      id, title, department, vacancies, roleType: fields.roleType,
      roleTypeName: roleNames[fields.roleType], categoryGroup: groups[fields.roleType],
      period: String(fields.period || '').trim() || 'Periodo por definir',
      modality: String(fields.modality || 'Presencial'),
      openDate: fields.openDate || '', closeDate: fields.closeDate || '',
      templateId: fields.templateId || null, demo: true,
      status: fields.activate ? 'Convocatoria Abierta' : 'Borrador',
      phase: fields.activate ? 'Recepción de postulaciones' : 'Configuración',
      totalProcessed: 0, defaultTopN: Math.max(1, Math.min(20, vacancies * 3)),
      avgScore: 0, potentialTalentCount: 0,
      batchId: `#${id}`, criteriaVersion: 'Borrador de demostración',
      aiModel: 'Pendiente de integración',
      knockoutRule: String(fields.knockoutRule || '').trim(), weights,
      roleMetrics: { metric1Label: 'Candidatos evaluados', metric1Value: '0' },
      createdAt: new Date().toISOString()
    };
    job.weights = validateWeights(job.weights);
    this.jobPostings.unshift(job);
    this.candidatesByJob[id] = [];
    this.saveDemoJobs();
    this.setActiveJobPosting(id);
    this.persist();
    this.notify('jobs_changed', { job });
    return job;
  }

  activateJobPosting(jobId) {
    if (!this.can('jobs')) return false;
    const job = this.jobPostings.find(j => j.id === jobId && j.demo && j.status === 'Borrador');
    if (!job) return false;
    job.status = 'Convocatoria Abierta';
    job.phase = 'Recepción de postulaciones';
    this.saveDemoJobs();
    if (this.activeJobPostingId === jobId) this.jobPosting = job;
    this.persist();
    this.notify('jobs_changed', { job });
    return true;
  }

  subscribe(listener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  notify(event, data) {
    for (const listener of [...this.listeners]) {
      try { listener(event, data, this); } catch (error) { console.error('Error actualizando vista:', event, error); notice('Una vista no pudo actualizarse. Cambia de sección o vuelve a intentarlo.', true); }
    }
  }

  // --- Role-Based Experience & Views Filter ---
  setUserRole(roleId) {
    if (this.rolesConfig[roleId] && this.currentUserRole !== roleId) {
      this.currentUserRole = roleId;
      this.notify('role_changed', {
        roleId,
        roleConfig: this.rolesConfig[roleId]
      });
    }
  }

  getUserRoleProfile() {
    return this.rolesConfig[this.currentUserRole] || this.rolesConfig.gthc;
  }

  isStageVisibleForCurrentRole(stageId) {
    const config = this.getUserRoleProfile();
    return config.stages.includes(stageId);
  }

  // --- Hierarchical Vacancy Structure (Acordeón por Categorías) ---
  getJobPostingsByCategory() {
    const categories = {
      Docente: [],
      Administrativo: [],
      Operativo: [],
      Directivo: []
    };

    this.jobPostings.forEach(job => {
      const group = job.categoryGroup || (job.roleType === 'operativo' ? 'Operativo' : job.roleType === 'administrativo' ? 'Administrativo' : job.roleType === 'directivo' ? 'Directivo' : 'Docente');
      if (!categories[group]) categories[group] = [];
      categories[group].push(job);
    });

    return categories;
  }

  // --- Convocatoria Activa Management (Cambio #1) ---
  setActiveJobPosting(jobId) {
    const target = this.jobPostings.find(j => j.id === jobId);
    if (!target || this.activeJobPostingId === jobId) return;

    this.activeJobPostingId = jobId;
    this.jobPosting = target;
    this.topN = target.defaultTopN;
    this.rankingModel = target.rankingModel === 'llm' ? 'llm' : 'ml';
    this.selectedCandidateId = null;
    this.selectedRows.clear();
    this.comparisonPool.clear();
    this.searchQuery = '';
    this.filterSource = 'all';
    this.filterStatus = 'active';

    this.candidatesByJob[jobId] ||= [];
    const jobCands = this.candidatesByJob[jobId];
    this.candidates = this.sortCandidates([...jobCands]);
    this.updateTopNFlags();

    this.notify('comparison_pool_changed', { pool: [] });
    this.notify('candidate_selected', { candidateId: null });
    this.notify('job_changed', { jobPosting: this.jobPosting });
    this.notify('filter_changed');
  }

  can(action) {
    return this.currentUserRole === 'gthc' && ['jobs','selection','talent','criteria','ingestion'].includes(action);
  }

  persist() {
    if (this.repository.save(this) === false && !this.storageWarningShown) {
      this.storageWarningShown = true;
      notice('No se pudo guardar la demo en este navegador. Los cambios se conservan solo durante esta sesión.', true);
    }
  }

  addDemoBatch(jobId, count) {
    if (!this.can('ingestion')) throw new Error('Este rol no puede cargar lotes.');
    const job = this.jobPostings.find(j => j.id === jobId);
    if (!job || job.status === 'Borrador') throw new Error('Activa la convocatoria antes de cargar un lote.');
    if (![25,100,500].includes(count)) throw new Error('Tamaño de lote no permitido.');
    const rows = this.candidatesByJob[jobId] || [];
    if (rows.length + count > 1000) throw new Error('La demostración admite hasta 1000 perfiles por convocatoria.');
    const batchId = `DEMO-${Date.now()}-${rows.length}`;
    const added = Array.from({ length: count }, (_,i) => {
      const position = rows.length + i + 1;
      const weights = job.weights.map((w,k) => ({ ...w, maxScore: w.weightPct, scoreObtained: Math.round(w.weightPct * (0.55 + ((position * 7 + k * 11) % 45) / 100) * 100) / 100 }));
      return normalizeCandidate({ id: `${jobId}-DEMO-${batchId}-${i}`, candidateId: `${jobId}-PERSON-${position}`, jobPostingId: jobId, name: `Perfil demo ${String(position).padStart(4,'0')}`, role: job.title, company: 'Organización ficticia', source: ['linkedin','gmail','computrabajo'][i%3], stage: 'postulado', knockoutMet: i % 9 === 0 ? null : true, weights, score: Math.round(weights.reduce((sum,w) => sum+w.scoreObtained,0)*10)/10,
        mlScore: Math.round(55 + ((position * 7) % 45)), llmScore: Math.round(55 + ((position * 11) % 45)),
        mandatoryReqs: Array.from({ length: 5 }, (_,k) => ({ name: `Requisito de ejemplo ${k+1}`, status: i%9 === 0 ? 'unknown' : 'green', tooltipTitle: 'Evidencia ficticia', tooltipReason: 'Resultado generado para probar la interfaz. No corresponde a una persona real.' })),
        narrative: { selectionReason: 'Perfil sintético para recorrer el proceso de selección.', strengths: [] },
        audit: { batchId, criteriaVersion: job.criteriaVersion, model: 'Generador de datos ficticios', decisionHistory: [] },
        cvMarkdown: `# Perfil demo ${position}\nDocumento sintético. No contiene datos personales reales.`, demo: true
      },jobId);
    });
    this.candidatesByJob[jobId] = [...rows,...added];
    this.refreshJobMetrics(jobId);
    if (jobId === this.activeJobPostingId) { this.candidates = this.sortCandidates([...this.candidatesByJob[jobId]]); this.updateTopNFlags(); }
    this.persist(); this.notify('candidates_updated', { jobId }); this.notify('jobs_changed', { job });
    return added.length;
  }

  refreshJobMetrics(jobId) {
    const job = this.jobPostings.find(j => j.id === jobId);
    if (!job) return;
    const rows = this.candidatesByJob[jobId] || [];
    const active = rows.filter(c => !['liberado','contratado'].includes(c.stage));
    const model = job.rankingModel === 'llm' ? 'llm' : 'ml';
    const evaluated = active.filter(c => candidateScore(c, model) !== null);
    job.totalProcessed = rows.length;
    job.activeCandidates = active.length;
    if (job.status !== 'Borrador') job.phase = rows.length ? 'Seguimiento de postulaciones' : 'Recepción de postulaciones';
    job.avgScore = evaluated.length ? Math.round(evaluated.reduce((sum,c) => sum+candidateScore(c, model),0) / evaluated.length * 10) / 10 : null;
    job.roleMetrics = { metric1Label: 'Cumplen los requisitos', metric1Value: active.length ? `${Math.round(active.filter(c => c.knockoutMet === true).length / active.length * 100)}%` : '—' };
  }

  simulateWeightsImpact(weights) {
    const validated = validateWeights(weights);
    const simulated = this.candidates.filter(c => !['liberado','contratado'].includes(c.stage)).map(c => ({ id: c.id, name: c.name, currentScore: candidateScore(c,this.rankingModel), currentRank: c.rank, ...reweightCandidate(c, validated) }));
    simulated.sort((a,b) => (candidateScore(b,this.rankingModel) ?? -1) - (candidateScore(a,this.rankingModel) ?? -1) || a.id.localeCompare(b.id));
    return simulated.map((item,i) => ({ ...item, simulatedScore: candidateScore(item,this.rankingModel), simulatedRank: i+1 }));
  }

  applyCriteria(jobId, weights) {
    if (!this.can('criteria')) throw new Error('Este rol no puede modificar los criterios.');
    const job = this.jobPostings.find(j => j.id === jobId);
    if (!job) throw new Error('Convocatoria no disponible.');
    const validated = validateWeights(weights);
    const now = new Date().toISOString();
    job.criteriaHistory ||= [];
    job.criteriaHistory.push({ version: job.criteriaVersion, weights: structuredClone(job.weights), timestamp: now });
    job.weights = validated;
    job.criteriaVersion = `Demo ${job.criteriaHistory.length + 1}`;
    for (const candidate of this.candidatesByJob[jobId] || []) {
      candidate.evaluationHistory ||= [];
      candidate.evaluationHistory.push({ timestamp: now, score: candidate.score, mlScore: candidate.mlScore, llmScore: candidate.llmScore, weights: structuredClone(candidate.weights), strengths: [...candidate.narrative.strengths], criteriaVersion: candidate.audit.criteriaVersion });
      Object.assign(candidate, reweightCandidate(candidate, validated));
      candidate.audit.criteriaVersion = job.criteriaVersion;
      candidate.narrative.selectionReason = 'Puntaje de demostración recalculado a partir de las evidencias disponibles y los pesos actuales. Revisa el desglose por criterio.';
      candidate.narrative.strengths = [];
      this.appendAudit(candidate, `Reponderación de demostración: ${job.criteriaVersion}`);
    }
    this.refreshJobMetrics(jobId);
    if (jobId === this.activeJobPostingId) { this.candidates = this.sortCandidates([...this.candidatesByJob[jobId]]); this.updateTopNFlags(); }
    this.saveDemoJobs(); this.persist();
    this.notify('criteria_updated', { jobId });
    this.notify('jobs_changed', { job });
  }

  advanceCandidate(candId) {
    const cand = this.candidates.find(c => c.id === candId);
    return cand ? this.moveCandidateStage(candId, STAGES[STAGES.indexOf(cand.stage) + 1]) : false;
  }

  releaseCandidate(candId) {
    if (!this.can('selection')) return false;
    const cand = this.candidates.find(c => c.id === candId);
    if (!cand || ['liberado','contratado'].includes(cand.stage)) return false;
    const previous = cand.stage;
    cand.stage = 'liberado';
    this.appendAudit(cand, 'Postulación liberada en la demo. No se envió ninguna notificación.');
    this.selectedRows.delete(candId);
    this.comparisonPool.delete(candId);
    this.updateTopNFlags();
    this.refreshJobMetrics(this.activeJobPostingId);
    this.addToTalentPool(candId, 'Perfil conservado tras liberar la postulación.');
    this.persist();
    this.notify('candidate_stage_changed', { candidate: cand, prevStage: previous, newStage: 'liberado' });
    this.notify('comparison_pool_changed', { pool: [...this.comparisonPool] });
    this.notify('jobs_changed', {});
    return true;
  }

  appendAudit(cand, action) {
    cand.audit ||= { decisionHistory: [] };
    cand.audit.decisionHistory ||= [];
    const profile = this.getUserRoleProfile();
    const now = new Date();
    cand.audit.decisionHistory.push({ timestamp: now.toISOString(), time: now.toLocaleString('es-PE'), user: `${profile.userName} (${profile.roleLabel})`, action });
  }

  // --- Universal Talent Pool Search & Filters (Cambio #8) ---
  setTalentSearchQuery(q) {
    this.talentSearchQuery = (q || '').trim().toLowerCase();
    this.notify('talent_search_changed', { query: this.talentSearchQuery });
  }

  getFilteredTalentPool(activeCategory = 'all') {
    return this.talentPool.filter(talent => {
      // Category filter
      if (activeCategory === 'transferible') {
        if (!talent.crossMatchOpportunity) return false;
      } else if (activeCategory !== 'all') {
        const cat = talent.roleCategory.toLowerCase();
        if (!cat.includes(activeCategory.toLowerCase())) return false;
      }

      // Universal search query
      if (this.talentSearchQuery) {
        const q = this.talentSearchQuery;
        const nameMatch = talent.name.toLowerCase().includes(q);
        const roleMatch = talent.roleCategory.toLowerCase().includes(q);
        const vacancyMatch = (talent.previousVacancy || '').toLowerCase().includes(q);
        const reasonMatch = (talent.matchReason || '').toLowerCase().includes(q);
        const tagsMatch = (talent.tags || []).some(t => t.toLowerCase().includes(q));
        const oppMatch = (talent.crossMatchOpportunity || '').toLowerCase().includes(q);

        if (!nameMatch && !roleMatch && !vacancyMatch && !reasonMatch && !tagsMatch && !oppMatch) {
          return false;
        }
      }

      return true;
    });
  }

  // --- View Routing System ---
  canView(view) {
    const map = { audit: ['gobernanza'], convocatorias: ['convocatorias'], ranking: ['convocatorias'], profilesLibrary: ['convocatorias'], comparison: ['evaluacion','seleccion'], kanban: ['seleccion'], talentPool: ['talento'], effectiveness: ['gobernanza'], executive: ['direccion'] };
    return (map[view] || []).some(stage => this.isStageVisibleForCurrentRole(stage));
  }

  setCurrentView(viewName) {
    if (!this.canView(viewName)) return false;
    if (this.currentView !== viewName) {
      this.currentView = viewName;
      this.notify('view_changed', { viewName });
    }
  }

  // --- Candidate Comparison Pool (Cambio #6) ---
  toggleComparisonCandidate(candId) {
    if (!this.candidates.some(c => c.id === candId)) return;
    if (this.comparisonPool.has(candId)) {
      this.comparisonPool.delete(candId);
      this.selectedRows.delete(candId);
    } else {
      this.comparisonPool.add(candId);
      this.selectedRows.add(candId);
    }
    this.notify('comparison_pool_changed', { pool: Array.from(this.comparisonPool) });
  }

  clearComparisonPool() {
    this.comparisonPool.forEach(id => this.selectedRows.delete(id));
    this.comparisonPool.clear();
    this.notify('comparison_pool_changed', { pool: [] });
  }

  getComparisonCandidates() {
    return this.getRankedCandidates().filter(c => this.comparisonPool.has(c.id));
  }

  // --- Kanban Pipeline Transitions (Cambio #7) ---
  moveCandidateStage(candId, newStage) {
    if (!this.can('selection')) { notice('Este rol tiene acceso de consulta.', true); return false; }
    const cand = this.candidates.find(c => c.id === candId);
    if (!cand || !STAGES.includes(cand.stage) || !STAGES.includes(newStage) || cand.stage === 'contratado') return false;
    const from = STAGES.indexOf(cand.stage), to = STAGES.indexOf(newStage);
    if (Math.abs(to-from) !== 1) { notice('Avanza o retrocede una etapa a la vez.', true); return false; }
    if (to > from && !isEligible(cand,this.rankingModel)) { notice('Verifica los requisitos y el puntaje del método elegido antes de avanzar.', true); return false; }
    const prevStage = cand.stage;
    cand.stage = newStage;
    this.appendAudit(cand, `Etapa: ${prevStage} → ${newStage}`);
    this.updateTopNFlags();
    this.refreshJobMetrics(this.activeJobPostingId);
    this.persist();
    this.notify('candidate_stage_changed', { candidate: cand, prevStage, newStage });
    this.notify('jobs_changed', {});
    return true;
  }

  // --- Banco de Talento (Cambio #11) ---
  linkTalent(talentId) {
    if (!this.can('talent')) throw new Error('Este rol tiene acceso de consulta.');
    if (this.jobPosting.status === 'Borrador') throw new Error('Activa primero la convocatoria.');
    const talent = this.talentPool.find(t => t.id === talentId);
    if (!talent) throw new Error('Perfil no disponible.');
    const candidateId = talent.candidateId || talent.id;
    const existing = this.candidates.find(c => c.candidateId === candidateId);
    if (existing) { this.selectCandidate(existing.id); return existing; }
    const candidate = normalizeCandidate({ id: `${this.activeJobPostingId}-LINK-${Date.now()}-${this.candidates.length}`, candidateId, name: talent.name, role: talent.roleCategory, source: 'interno', stage: 'postulado', score: null, knockoutMet: null }, this.activeJobPostingId);
    this.appendAudit(candidate,'Vinculado desde el banco de talento. Pendiente de evaluar para este puesto.');
    this.candidatesByJob[this.activeJobPostingId].push(candidate);
    this.candidates = this.sortCandidates([...this.candidatesByJob[this.activeJobPostingId]]);
    this.refreshJobMetrics(this.activeJobPostingId); this.updateTopNFlags(); this.persist();
    this.notify('candidates_updated', { jobId: this.activeJobPostingId }); this.notify('jobs_changed', {});
    this.selectCandidate(candidate.id);
    return candidate;
  }

  addToTalentPool(candId, customNote = "") {
    const cand = this.candidates.find(c => c.id === candId);
    if (!cand) return;

    if (!this.can('talent')) return false;
    const identity = cand.candidateId || cand.id;
    const exists = this.talentPool.find(t => t.candidateId === identity);
    if (!exists) {
      this.talentPool.unshift({
        id: `TAL-${Date.now()}-${this.talentPool.length}`,
        candidateId: identity,
        name: cand.name,
        roleCategory: this.jobPosting.roleTypeName,
        previousVacancy: `${this.jobPosting.title} (${this.jobPosting.id})`,
        scoreObtained: candidateScore(cand,this.rankingModel), mlScore: cand.mlScore, llmScore: cand.llmScore, jobPostingId: this.activeJobPostingId,
        matchReason: customNote || cand.narrative.selectionReason,
        tags: cand.preferredCriteria.map(p => p.name),
        availability: "Disponible",
        lastContact: "Hoy (TalentAI Preservado)",
        crossMatchOpportunity: cand.crossMatches && cand.crossMatches[0] 
          ? `Apto para ${cand.crossMatches[0].jobTitle} (${cand.crossMatches[0].matchPct}%)`
          : null
      });
      this.persist();
      this.notify('talent_pool_updated', { talentPool: this.talentPool });
    }
    return true;
  }

  // --- Candidate Sorting & Filtering ---
  sortCandidates(list) {
    return list.sort((a, b) => {
      if (this.sortBy === 'score') {
        const difference = this.sortOrder === 'desc' ? (candidateScore(b,this.rankingModel) ?? -1) - (candidateScore(a,this.rankingModel) ?? -1) : (candidateScore(a,this.rankingModel) ?? Infinity) - (candidateScore(b,this.rankingModel) ?? Infinity);
        return difference || String(a.id).localeCompare(String(b.id));
      }
      if (this.sortBy === 'name') {
        return this.sortOrder === 'asc' 
          ? a.name.localeCompare(b.name) 
          : b.name.localeCompare(a.name);
      }
      return 0;
    });
  }

  getRankedCandidates() {
    return [...this.candidates].sort((a, b) => (candidateScore(b,this.rankingModel) ?? -1) - (candidateScore(a,this.rankingModel) ?? -1) || String(a.id).localeCompare(String(b.id)));
  }

  updateTopNFlags() {
    // The visual sort must never change merit ranking or the Top-N cut.
    let eligibleCount = 0, activeRank = 0;
    this.getRankedCandidates().forEach(cand => {
      if (['liberado','contratado'].includes(cand.stage)) {
        cand.inTopN = false;
        cand.rank = null;
        return;
      }
      cand.inTopN = isEligible(cand,this.rankingModel) && eligibleCount++ < this.topN;
      cand.rank = ++activeRank;
    });
  }

  getRankingCounts() {
    const active = this.candidates.filter(c => !['liberado','contratado'].includes(c.stage));
    return {
      active: active.length,
      topN: active.filter(c => c.inTopN).length,
      selected: this.selectedRows.size,
      released: this.candidates.filter(c => c.stage === 'liberado').length,
      all: this.candidates.length
    };
  }

  setTopN(newN) {
    if (!this.can('selection')) return;
    const parsed = Number(newN);
    if (!Number.isSafeInteger(parsed) || parsed < 1) return false;
    const val = parsed;
    if (this.topN !== val) {
      this.topN = val;
      this.jobPosting.defaultTopN = val;
      this.saveDemoJobs(); this.persist();
      this.updateTopNFlags();
      this.notify('topN_changed', { topN: this.topN });
    }
  }

  incrementTopN() {
    this.setTopN(this.topN + 1);
  }

  decrementTopN() {
    this.setTopN(this.topN - 1);
  }

  setRankingModel(model) {
    if (!['ml','llm'].includes(model) || model === this.rankingModel) return;
    this.rankingModel = model;
    this.sortBy = 'score'; this.sortOrder = 'desc';
    this.jobPosting.rankingModel = model;
    this.candidates = this.sortCandidates(this.candidates);
    this.updateTopNFlags();
    this.refreshJobMetrics(this.activeJobPostingId);
    this.persist();
    this.notify('ranking_model_changed', { model });
    this.notify('jobs_changed', {});
  }

  selectTopN() {
    const chosen = this.getRankedCandidates().filter(c => c.inTopN);
    this.setCandidateSelection(chosen.map(c=>c.id));
    return chosen;
  }

  setCandidateSelection(ids) {
    const known = new Set(this.candidates.map(c=>c.id));
    this.selectedRows = new Set(ids.filter(id=>known.has(id)));
    this.comparisonPool = new Set(this.selectedRows);
    this.notify('selection_changed');
    this.notify('comparison_pool_changed', { pool: [...this.comparisonPool] });
  }

  getDecisionPreview() {
    const selected = this.getRankedCandidates().filter(c => this.selectedRows.has(c.id));
    const others = this.candidates.filter(c => c.stage === 'postulado' && !this.selectedRows.has(c.id));
    return {
      selected,
      blocked: selected.filter(c => !isEligible(c,this.rankingModel)),
      declined: others.filter(c => c.knockoutMet !== null && candidateScore(c,this.rankingModel) !== null),
      pending: others.filter(c => c.knockoutMet === null || candidateScore(c,this.rankingModel) === null)
    };
  }

  confirmSelection({ jobId, declineOthers = false, advanceMessage, declineMessage }) {
    if (!this.can('selection') || jobId !== this.activeJobPostingId) throw new Error('La convocatoria cambió. Revisa la selección nuevamente.');
    const preview = this.getDecisionPreview();
    if (!preview.selected.length || preview.blocked.length) throw new Error('Elige perfiles con requisitos verificados y un puntaje disponible para continuar.');
    if (!String(advanceMessage || '').trim() || (declineOthers && !String(declineMessage || '').trim())) throw new Error('Completa el texto de los mensajes.');
    const timestamp = new Date().toISOString();
    const draft = (c, outcome, message) => {
      c.messageDraft = { outcome, subject: `${outcome === 'avanza' ? 'Avance de tu postulación' : 'Resultado de tu postulación'} · ${this.jobPosting.title}`, body: message.replaceAll('{nombre}',c.name).replaceAll('{puesto}',this.jobPosting.title), status: 'Borrador', timestamp };
      this.appendAudit(c, `${outcome === 'avanza' ? 'Seleccionado por GTH' : 'No continúa por decisión de GTH'}. Mensaje preparado como borrador.`);
    };
    for (const c of preview.selected) {
      if (c.stage === 'postulado') c.stage = 'preseleccionado';
      draft(c,'avanza',advanceMessage);
    }
    if (declineOthers) for (const c of preview.declined) {
      c.stage = 'liberado';
      draft(c,'no_avanza',declineMessage);
      if (!this.talentPool.some(t => t.candidateId === c.candidateId)) this.talentPool.unshift({ id: `TAL-${timestamp}-${c.id}`, candidateId: c.candidateId, name: c.name, roleCategory: this.jobPosting.roleTypeName, previousVacancy: `${this.jobPosting.title} (${jobId})`, jobPostingId: jobId, mlScore: c.mlScore, llmScore: c.llmScore, scoreObtained: candidateScore(c,this.rankingModel), matchReason: 'Perfil conservado tras la decisión de GTH.', tags: c.preferredCriteria.map(p=>p.name) });
    }
    this.updateTopNFlags(); this.refreshJobMetrics(jobId); this.persist();
    this.notify('selection_confirmed', { jobId });
    this.notify('candidate_stage_changed', {});
    this.notify('talent_pool_updated', {});
    this.notify('jobs_changed', {});
    return { advanced: preview.selected.length, declined: declineOthers ? preview.declined.length : 0, pending: preview.pending.length };
  }

  setSearchQuery(q) {
    this.searchQuery = q.trim().toLowerCase();
    this.notify('filter_changed');
  }

  setFilterSource(source) {
    this.filterSource = source;
    this.notify('filter_changed');
  }

  setFilterStatus(status) {
    this.filterStatus = status;
    this.notify('filter_changed');
  }

  toggleSort(field) {
    if (this.sortBy === field) {
      this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortBy = field;
      this.sortOrder = field === 'name' ? 'asc' : 'desc';
    }
    this.candidates = this.sortCandidates(this.candidates);
    this.updateTopNFlags();
    this.notify('sort_changed');
  }

  toggleRowSelection(candId) {
    if (this.selectedRows.has(candId)) {
      this.selectedRows.delete(candId);
      this.comparisonPool.delete(candId);
    } else {
      this.selectedRows.add(candId);
      this.comparisonPool.add(candId);
    }
    this.notify('selection_changed');
    this.notify('comparison_pool_changed', { pool: Array.from(this.comparisonPool) });
  }

  toggleSelectAll(checked, visibleCandidates = this.getFilteredCandidates()) {
    if (checked) {
      visibleCandidates.forEach(c => {
        this.selectedRows.add(c.id);
        this.comparisonPool.add(c.id);
      });
    } else {
      visibleCandidates.forEach(c => {
        this.selectedRows.delete(c.id);
        this.comparisonPool.delete(c.id);
      });
    }
    this.notify('selection_changed');
    this.notify('comparison_pool_changed', { pool: Array.from(this.comparisonPool) });
  }

  selectCandidate(candId) {
    if (candId !== null && !this.candidates.some(c => c.id === candId)) return;
    this.selectedCandidateId = candId;
    this.notify('candidate_selected', { candidateId: candId });
  }

  getSelectedCandidate() {
    return this.candidates.find(c => c.id === this.selectedCandidateId) || null;
  }

  setSidebarCollapsed(collapsed) {
    this.sidebarCollapsed = collapsed;
    this.notify('sidebar_toggled', { collapsed });
  }

  setCopilotCollapsed(collapsed) {
    this.copilotCollapsed = collapsed;
    this.notify('copilot_toggled', { collapsed });
  }

  setActiveDrawerTab(tabName) {
    this.activeDrawerTab = tabName;
    this.notify('drawer_tab_changed', { tabName });
  }

  getFilteredCandidates() {
    return this.candidates.filter(c => {
      // Search
      if (this.searchQuery) {
        const matchesName = c.name.toLowerCase().includes(this.searchQuery);
        const matchesCompany = (c.company || '').toLowerCase().includes(this.searchQuery);
        const matchesRole = (c.role || '').toLowerCase().includes(this.searchQuery);
        if (!matchesName && !matchesCompany && !matchesRole) return false;
      }

      // Source
      if (this.filterSource !== 'all' && c.source !== this.filterSource) {
        return false;
      }

      // Status
      if (this.filterStatus === 'selected' && !this.selectedRows.has(c.id)) return false;
      if (this.filterStatus === 'topN' && !c.inTopN) return false;
      if (this.filterStatus === 'outsideTopN' && c.inTopN) return false;
      if (!['all','released','selected'].includes(this.filterStatus) && ['liberado','contratado'].includes(c.stage)) return false;
      if (this.filterStatus === 'released' && c.stage !== 'liberado') return false;
      if (this.filterStatus === 'pending' && c.knockoutMet !== null && candidateScore(c,this.rankingModel) !== null) return false;
      if (this.filterStatus === 'transferable' && !c.transferablePotential) return false;

      return true;
    });
  }

  recordDecision(candId, decisionText) {
    if (!this.can('selection')) return false;
    const cand = this.candidates.find(c => c.id === candId);
    if (!cand) return false;
    this.appendAudit(cand, decisionText); this.persist();
    this.notify('decision_recorded', { candidate: cand, action: decisionText });
    return true;
  }
}

export const appState = new AppState();
