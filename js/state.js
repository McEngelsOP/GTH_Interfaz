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
  EXECUTIVE_METRICS
} from './mockData.js';

class AppState {
  constructor() {
    this.jobPostings = [...MOCK_JOB_POSTINGS];
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

    // New Architecture States
    this.currentView = 'ranking'; // 'ranking' | 'kanban' | 'evaluation' | 'comparison' | 'talentPool' | 'effectiveness' | 'executive'
    this.viewMode = 'rrhh';       // 'rrhh' | 'technical'
    this.comparisonPool = new Set(); // Candidate IDs selected for side-by-side comparison (max 5)
    this.talentPool = [...MOCK_TALENT_POOL];
    this.templates = [...ORGANIZATIONAL_TEMPLATES];
    this.executiveMetrics = { ...EXECUTIVE_METRICS };

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

  subscribe(listener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  notify(event, data) {
    this.listeners.forEach(l => l(event, data, this));
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

    // Load candidates for this job
    const jobCands = this.candidatesByJob[jobId] || [];
    this.candidates = this.sortCandidates([...jobCands]);
    this.updateTopNFlags();

    this.notify('job_changed', { jobPosting: this.jobPosting });
    this.notify('filter_changed');
  }

  // --- View Routing System ---
  setCurrentView(viewName) {
    if (this.currentView !== viewName) {
      this.currentView = viewName;
      this.notify('view_changed', { viewName });
    }
  }

  // --- View Mode Toggle: RRHH vs Técnico (Cambio #9) ---
  setViewMode(mode) {
    if (this.viewMode !== mode && (mode === 'rrhh' || mode === 'technical')) {
      this.viewMode = mode;
      this.notify('view_mode_changed', { viewMode: mode });
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
    return this.candidates.filter(c => this.comparisonPool.has(c.id));
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

  updateTopNFlags() {
    this.candidates.forEach((cand, index) => {
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
      this.sortOrder = 'desc';
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

  toggleSelectAll(checked) {
    if (checked) {
      this.getFilteredCandidates().forEach(c => {
        this.selectedRows.add(c.id);
        if (this.comparisonPool.size < 5) this.comparisonPool.add(c.id);
      });
    } else {
      this.selectedRows.clear();
      this.comparisonPool.clear();
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
