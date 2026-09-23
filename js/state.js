/* ==========================================================================
   TalentAI - GTHC · ESAN
   State Management & Reactive Subscriptions
   ========================================================================== */

import {
  MOCK_JOB_POSTINGS,
  MOCK_DOCENTE_CANDIDATES,
  MOCK_OPERATIVO_CANDIDATES,
  MOCK_ADMIN_CANDIDATES,
  MOCK_TALENT_POOL,
  ORGANIZATIONAL_TEMPLATES,
  EXECUTIVE_METRICS,
  MOCK_OCR_INCIDENCES
} from './mockData.js';

class AppState {
  constructor() {
    this.jobPostings = [...MOCK_JOB_POSTINGS, ...this.loadDemoJobs()];
    this.activeJobPostingId = this.jobPostings[0].id;
    this.jobPosting = { ...this.jobPostings[0] };
    
    this.topN = this.jobPosting.defaultTopN;
    this.searchQuery = '';
    this.filterSource = 'all';
    this.filterStatus = 'all';
    this.sortBy = 'score';
    this.sortOrder = 'desc';
    this.selectedCandidateId = null;
    this.selectedRows = new Set();
    this.sidebarCollapsed = false;
    this.copilotCollapsed = false;
    this.activeDrawerTab = 'explain';

    // Role-based state: 'reclutador' | 'coordinador' | 'director' | 'admin'
    this.currentUserRole = 'reclutador';
    this.rolesConfig = {
      reclutador: {
        roleId: 'reclutador',
        roleLabel: 'Reclutador Operativo',
        userName: 'Mariana Córdova',
        userRole: 'Reclutadora GTHC · ESAN',
        initials: 'MC',
        description: 'Enfocado en ingestión OCR, ranking Top-N, entrevistas y pipeline Kanban.',
        stages: ['convocatorias', 'evaluacion', 'seleccion']
      },
      coordinador: {
        roleId: 'coordinador',
        roleLabel: 'Coordinador GTH',
        userName: 'Jorge Benavides',
        userRole: 'Coordinador de Selección & Talento',
        initials: 'JB',
        description: 'Supervisión de movilidad interna, banco de talento institucional y matriz de ponderaciones.',
        stages: ['convocatorias', 'seleccion', 'talento', 'gobernanza']
      },
      director: {
        roleId: 'director',
        roleLabel: 'Director / Decano',
        userName: 'Dr. Armando Valdés',
        userRole: 'Director de Escuela & Claustro',
        initials: 'AV',
        description: 'Visión estratégica: Cobertura de vacantes, KPIs gerenciales y Biblioteca de Perfiles.',
        stages: ['convocatorias', 'direccion', 'talento']
      },
      admin: {
        roleId: 'admin',
        roleLabel: 'Administrador Global',
        userName: 'Gobernanza TI ESAN',
        userRole: 'Super Administrador · Matching Dual',
        initials: 'SA',
        description: 'Acceso irrestricto: Calibración de modelos LLM, auditoría inmutable y todos los módulos.',
        stages: ['convocatorias', 'evaluacion', 'seleccion', 'talento', 'gobernanza', 'direccion']
      }
    };

    // Architecture States
    this.currentView = 'convocatorias';
    this.comparisonPool = new Set();
    this.talentPool = [...MOCK_TALENT_POOL];
    this.talentSearchQuery = '';
    this.templates = [...ORGANIZATIONAL_TEMPLATES];
    this.executiveMetrics = { ...EXECUTIVE_METRICS };
    this.ocrIncidences = { ...MOCK_OCR_INCIDENCES };

    // Candidates pool by job
    this.candidatesByJob = {
      'REQ-2026-DOC-088': JSON.parse(JSON.stringify(MOCK_DOCENTE_CANDIDATES)),
      'REQ-2026-OPE-014': JSON.parse(JSON.stringify(MOCK_OPERATIVO_CANDIDATES)),
      'REQ-2026-ADM-032': JSON.parse(JSON.stringify(MOCK_ADMIN_CANDIDATES))
    };

    // Current candidates for active job
    this.candidates = this.sortCandidates([...this.candidatesByJob[this.activeJobPostingId]]);
    this.updateTopNFlags();

    this.listeners = [];
  }

  // Only demonstration vacancies are saved locally. CVs and decisions remain in memory.
  loadDemoJobs() {
    try {
      const saved = JSON.parse(localStorage.getItem('talentai.demo.jobs.v1') || '[]');
      return Array.isArray(saved) ? saved.filter(j => j && j.demo === true && typeof j.id === 'string' && typeof j.title === 'string') : [];
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
    this.jobPostings.unshift(job);
    this.candidatesByJob[id] = [];
    this.saveDemoJobs();
    this.setActiveJobPosting(id);
    this.notify('jobs_changed', { job });
    return job;
  }

  activateJobPosting(jobId) {
    const job = this.jobPostings.find(j => j.id === jobId && j.demo && j.status === 'Borrador');
    if (!job) return false;
    job.status = 'Convocatoria Abierta';
    job.phase = 'Recepción de postulaciones';
    this.saveDemoJobs();
    if (this.activeJobPostingId === jobId) this.jobPosting = { ...job };
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
    this.listeners.forEach(l => l(event, data, this));
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
    return this.rolesConfig[this.currentUserRole] || this.rolesConfig.reclutador;
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
    this.jobPosting = { ...target };
    this.topN = target.defaultTopN;
    this.selectedCandidateId = null;
    this.selectedRows.clear();
    this.comparisonPool.clear();
    this.searchQuery = '';
    this.filterSource = 'all';
    this.filterStatus = 'all';

    // New demo vacancies start empty; legacy sample postings retain sample profiles.
    if (!this.candidatesByJob[jobId]) {
      const baseList = target.demo ? [] : this.jobPosting.roleType === 'operativo' 
        ? MOCK_OPERATIVO_CANDIDATES 
        : this.jobPosting.roleType === 'administrativo' 
          ? MOCK_ADMIN_CANDIDATES 
          : MOCK_DOCENTE_CANDIDATES;
      
      this.candidatesByJob[jobId] = JSON.parse(JSON.stringify(baseList)).map((c, i) => ({
        ...c,
        id: `${jobId}-CAND-${i+1}`,
        jobPostingId: jobId,
        score: Math.max(70, Math.min(96, c.score + ((i % 3) - 1) * 2))
      }));
    }
    const jobCands = this.candidatesByJob[jobId];
    this.candidates = this.sortCandidates([...jobCands]);
    this.updateTopNFlags();

    this.notify('job_changed', { jobPosting: this.jobPosting });
    this.notify('filter_changed');
  }

  // --- Simulation Engine for Weights Impact on Candidate Podium (Cambio #9) ---
  simulateWeightsImpact(variableWeights) {
    // variableWeights: { exp, sem, tech, teach, pref }
    const currentList = [...this.candidates];
    const simulated = currentList.map(c => {
      let scoreModifier = 0;
      if (variableWeights.teach > 10) {
        const hasTeach = (c.weights || []).some(w => w.label.toLowerCase().includes('docente') && (w.scoreObtained || 0) >= 8);
        if (hasTeach) scoreModifier += (variableWeights.teach - 10) * 0.4;
      }
      if (variableWeights.exp > 30) {
        const hasExp = (c.weights || []).some(w => w.label.toLowerCase().includes('experiencia') && (w.scoreObtained || 0) >= 28);
        if (hasExp) scoreModifier += (variableWeights.exp - 30) * 0.3;
      }
      if (variableWeights.sem > 30) {
        const hasSem = (c.llmScore || 85) >= 88;
        if (hasSem) scoreModifier += (variableWeights.sem - 30) * 0.35;
      }
      if (variableWeights.tech > 20) {
        const hasTech = (c.weights || []).some(w => (w.label.toLowerCase().includes('stack') || w.label.toLowerCase().includes('técnico')) && (w.scoreObtained || 0) >= 15);
        if (hasTech) scoreModifier += (variableWeights.tech - 20) * 0.3;
      }

      const simScore = Math.max(65, Math.min(99, Math.round(c.score + scoreModifier)));
      return {
        id: c.id,
        name: c.name,
        company: c.company,
        role: c.role,
        currentScore: c.score,
        simulatedScore: simScore,
        currentRank: c.rank
      };
    });

    // Sort simulated list by simulated score
    simulated.sort((a, b) => b.simulatedScore - a.simulatedScore);
    simulated.forEach((item, idx) => {
      item.simulatedRank = idx + 1;
      item.rankDelta = item.currentRank - item.simulatedRank; // > 0 means went up! (e.g. 3 -> 1 = +2)
    });

    return simulated;
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
  setCurrentView(viewName) {
    if (this.currentView !== viewName) {
      this.currentView = viewName;
      this.notify('view_changed', { viewName });
    }
  }

  // --- Candidate Comparison Pool (Cambio #6) ---
  toggleComparisonCandidate(candId) {
    if (this.comparisonPool.has(candId)) {
      this.comparisonPool.delete(candId);
    } else {
      if (this.comparisonPool.size >= 5) {
        alert("Puedes comparar hasta un máximo de 5 candidatos a la vez.");
        return;
      }
      this.comparisonPool.add(candId);
    }
    this.notify('comparison_pool_changed', { pool: Array.from(this.comparisonPool) });
  }

  clearComparisonPool() {
    this.comparisonPool.clear();
    this.notify('comparison_pool_changed', { pool: [] });
  }

  getComparisonCandidates() {
    return this.getRankedCandidates().filter(c => this.comparisonPool.has(c.id));
  }

  // --- Kanban Pipeline Transitions (Cambio #7) ---
  moveCandidateStage(candId, newStage) {
    const cand = this.candidates.find(c => c.id === candId);
    if (cand && cand.stage !== newStage) {
      const prevStage = cand.stage;
      cand.stage = newStage;

      const now = new Date();
      const timeStr = now.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      cand.audit.decisionHistory.push({
        time: timeStr,
        user: "Mariana Córdova (Reclutadora GTHC)",
        action: `Etapa actualizada: ${prevStage.toUpperCase()} → ${newStage.toUpperCase()}`
      });

      this.notify('candidate_stage_changed', { candidate: cand, prevStage, newStage });
    }
  }

  // --- Banco de Talento (Cambio #11) ---
  addToTalentPool(candId, customNote = "") {
    const cand = this.candidates.find(c => c.id === candId);
    if (!cand) return;

    const exists = this.talentPool.find(t => t.name === cand.name);
    if (!exists) {
      this.talentPool.unshift({
        id: `TAL-${Date.now()}`,
        name: cand.name,
        roleCategory: this.jobPosting.roleTypeName,
        previousVacancy: `${this.jobPosting.title} (${this.jobPosting.id})`,
        scoreObtained: cand.score,
        matchReason: customNote || cand.narrative.selectionReason,
        tags: cand.preferredCriteria.map(p => p.name),
        availability: "Disponible",
        lastContact: "Hoy (TalentAI Preservado)",
        crossMatchOpportunity: cand.crossMatches && cand.crossMatches[0] 
          ? `Apto para ${cand.crossMatches[0].jobTitle} (${cand.crossMatches[0].matchPct}%)`
          : "Evaluado con Alto Potencial"
      });
      this.notify('talent_pool_updated', { talentPool: this.talentPool });
    }
  }

  // --- Candidate Sorting & Filtering ---
  sortCandidates(list) {
    return list.sort((a, b) => {
      if (this.sortBy === 'score') {
        return this.sortOrder === 'desc' ? b.score - a.score : a.score - b.score;
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
    return [...this.candidates].sort((a, b) => b.score - a.score || String(a.id).localeCompare(String(b.id)));
  }

  updateTopNFlags() {
    // The visual sort must never change merit ranking or the Top-N cut.
    this.getRankedCandidates().forEach((cand, index) => {
      cand.inTopN = index < this.topN;
      cand.rank = index + 1;
    });
  }

  setTopN(newN) {
    const val = Math.max(1, Math.min(20, parseInt(newN, 10) || 5));
    if (this.topN !== val) {
      this.topN = val;
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
      if (this.comparisonPool.size < 5) {
        this.comparisonPool.add(candId);
      }
    }
    this.notify('selection_changed');
    this.notify('comparison_pool_changed', { pool: Array.from(this.comparisonPool) });
  }

  toggleSelectAll(checked, visibleCandidates = this.getFilteredCandidates()) {
    if (checked) {
      visibleCandidates.forEach(c => {
        this.selectedRows.add(c.id);
        if (this.comparisonPool.size < 5) this.comparisonPool.add(c.id);
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
      if (this.filterStatus === 'topN' && !c.inTopN) return false;
      if (this.filterStatus === 'outsideTopN' && c.inTopN) return false;
      if (this.filterStatus === 'transferable' && !c.transferablePotential) return false;

      return true;
    });
  }

  recordDecision(candId, decisionText) {
    const cand = this.candidates.find(c => c.id === candId);
    if (cand) {
      const now = new Date();
      const timeStr = now.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      cand.audit.decisionHistory.push({
        time: timeStr,
        user: "Mariana Córdova (Reclutadora GTHC)",
        action: decisionText
      });
      this.notify('decision_recorded', { candidate: cand, action: decisionText });
    }
  }
}

export const appState = new AppState();
