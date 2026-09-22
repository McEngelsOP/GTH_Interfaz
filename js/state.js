/* ==========================================================================
   TalentAI - GTHC · ESAN
   State Management & Reactive Subscriptions
   ========================================================================== */

import { MOCK_CANDIDATES, MOCK_JOB_POSTING } from './mockData.js';

class AppState {
  constructor() {
    this.jobPosting = { ...MOCK_JOB_POSTING };
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

    // Clone and initialize candidates with sorted ranks
    this.candidates = this.sortCandidates([...MOCK_CANDIDATES]);
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
    } else {
      this.selectedRows.add(candId);
    }
    this.notify('selection_changed');
  }

  toggleSelectAll(checked) {
    if (checked) {
      this.getFilteredCandidates().forEach(c => this.selectedRows.add(c.id));
    } else {
      this.selectedRows.clear();
    }
    this.notify('selection_changed');
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
        const matchesCompany = c.company.toLowerCase().includes(this.searchQuery);
        const matchesRole = c.role.toLowerCase().includes(this.searchQuery);
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
