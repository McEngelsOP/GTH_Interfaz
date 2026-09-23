import { appState } from './state.js';
import { DataGridController } from './dataGrid.js';
import { DrawerController } from './drawer.js';
import { BatchIngestionController } from './batchIngestion.js';
import { CopilotController } from './copilot.js';
import { CriteriaModalController } from './criteriaModal.js';
import { KanbanViewController } from './kanbanView.js';
import { ComparisonViewController } from './comparisonView.js';
import { TalentPoolViewController } from './talentPoolView.js';
import { EffectivenessViewController } from './effectivenessView.js';
import { ExecutiveDashboardController } from './executiveDashboard.js';
import { ProfilesLibraryViewController } from './profilesLibraryView.js';
import { VacanciesViewController } from './vacanciesView.js';
import { NewJobWizard } from './newJobWizard.js';
import { escapeHTML as esc, notify } from './ui.js';

document.addEventListener('DOMContentLoaded', () => {
  // 1. Initialize Core Components
  const tableBodyEl = document.getElementById('candidateTableBody');
  const selectAllCheckboxEl = document.getElementById('selectAllCheckbox');
  const resultCountEl = document.getElementById('resultCountDisplay');
  const dataGrid = new DataGridController(tableBodyEl, selectAllCheckboxEl, resultCountEl);

  const drawerBackdropEl = document.getElementById('drawerBackdrop');
  const drawerEl = document.getElementById('auditDrawer');
  const drawer = new DrawerController(drawerBackdropEl, drawerEl);

  const ingestionBackdropEl = document.getElementById('ingestionBackdrop');
  const ingestionModalEl = document.getElementById('ingestionModal');
  const batchIngestion = new BatchIngestionController(ingestionBackdropEl, ingestionModalEl);

  const criteriaBackdropEl = document.getElementById('criteriaBackdrop');
  const criteriaModalEl = document.getElementById('criteriaModal');
  const criteriaModal = new CriteriaModalController(criteriaBackdropEl, criteriaModalEl);

  const copilotEl = document.getElementById('copilotPanel');
  const copilotFloatingTriggerEl = document.getElementById('copilotFloatingTrigger');
  const copilot = new CopilotController(copilotEl, copilotFloatingTriggerEl);

  // 2. Initialize View Controllers
  const kanbanContainerEl = document.getElementById('viewContainer_kanban');
  const kanbanController = new KanbanViewController(kanbanContainerEl);
  window.kanbanController = kanbanController;

  const comparisonContainerEl = document.getElementById('viewContainer_comparison');
  const comparisonController = new ComparisonViewController(comparisonContainerEl);
  window.comparisonController = comparisonController;

  const talentPoolContainerEl = document.getElementById('viewContainer_talentPool');
  const talentPoolController = new TalentPoolViewController(talentPoolContainerEl);
  window.talentPoolController = talentPoolController;

  const effectivenessContainerEl = document.getElementById('viewContainer_effectiveness');
  const effectivenessController = new EffectivenessViewController(effectivenessContainerEl);
  window.effectivenessController = effectivenessController;

  const executiveContainerEl = document.getElementById('viewContainer_executive');
  const executiveController = new ExecutiveDashboardController(executiveContainerEl);
  window.executiveController = executiveController;

  const profilesLibraryContainerEl = document.getElementById('viewContainer_profilesLibrary');
  const profilesLibraryController = new ProfilesLibraryViewController(profilesLibraryContainerEl);
  window.profilesLibraryController = profilesLibraryController;

  const wizard = new NewJobWizard(document.getElementById('newJobWizardMount'), job => switchView(job.status === 'Borrador' ? 'convocatorias' : 'ranking'));
  profilesLibraryController.onStartNewJob = templateId => wizard.open(templateId);
  const vacanciesController = new VacanciesViewController(document.getElementById('viewContainer_convocatorias'), {
    onNewJob: () => wizard.open(),
    onOpenJob: id => { appState.setActiveJobPosting(id); switchView('ranking'); }
  });

  // 3. Global PDF CV opener
  window.openCandidateCV = (candId) => {
    appState.selectCandidate(candId);
    appState.setActiveDrawerTab('cv');
  };

  // 4. Hierarchical Job Selector Dropdown (18 Vacantes por Categoría)
  const activeJobSelectorBtn = document.getElementById('activeJobSelectorBtn');
  const activeJobDropdownMenu = document.getElementById('activeJobDropdownMenu');
  const jobDropdownOptionsMount = document.getElementById('jobDropdownOptionsMount');

  const headerRoleBadge = document.getElementById('headerRoleBadge');
  const headerJobPeriod = document.getElementById('headerJobPeriod');
  const headerJobDept = document.getElementById('headerJobDept');
  const headerJobTitle = document.getElementById('headerJobTitle');

  const kpiProcessedCount = document.getElementById('kpiProcessedCount');
  const kpiAvgScore = document.getElementById('kpiAvgScore');
  const kpiRoleMetricLabel = document.getElementById('kpiRoleMetricLabel');
  const kpiRoleMetricValue = document.getElementById('kpiRoleMetricValue');

  const categoryMeta = {
    Docente: { label: 'Convocatorias Docentes & Cátedras', icon: '🎓' },
    Administrativo: { label: 'Convocatorias Administrativas & Gestión', icon: '💼' },
    Operativo: { label: 'Convocatorias Operativas & Soporte', icon: '🔧' },
    Directivo: { label: 'Convocatorias Directivas & Jefaturas', icon: '🏛️' }
  };

  const renderJobDropdownOptions = () => {
    if (!jobDropdownOptionsMount) return;
    const grouped = appState.getJobPostingsByCategory();

    jobDropdownOptionsMount.innerHTML = Object.entries(grouped).map(([categoryKey, jobs]) => {
      const meta = categoryMeta[categoryKey] || { label: categoryKey, icon: '📁', count: jobs.length };
      return `
        <div class="job-category-group">
          <div class="job-category-header">
            <span class="job-category-icon">${meta.icon}</span>
            <span class="job-category-title">${meta.label}</span>
            <span class="job-category-badge">${jobs.length} plazas</span>
          </div>
          <div class="job-category-list">
            ${jobs.map(job => {
              const isSelected = job.id === appState.activeJobPostingId;
              return `
                <button type="button" class="job-option-item ${isSelected ? 'selected' : ''}" data-job-id="${esc(job.id)}">
                  <div style="display: flex; flex-direction: column; gap: 2px;">
                    <div style="display: flex; align-items: center; gap: 6px;">
                  <span class="role-badge role-${esc(job.roleType)}">${esc(job.roleTypeName)}</span>
                      <span style="font-size: 11px; font-weight: 700; color: var(--text-tertiary);">${esc(job.id)}</span>
                    </div>
                    <strong style="font-size: 13px; color: var(--text-main); margin-top: 2px;">${esc(job.title)}</strong>
                    <span style="font-size: 11px; color: var(--text-secondary);">${esc(job.department)} • ${esc(job.period)}</span>
                  </div>
                  <div style="text-align: right; flex-shrink: 0;">
                    <span style="font-size: 13.5px; font-weight: 800; color: #2563EB;">${job.totalProcessed}</span>
                    <div style="font-size: 10px; color: var(--text-tertiary);">CVs</div>
                  </div>
                </button>
              `;
            }).join('')}
          </div>
        </div>
      `;
    }).join('');

    jobDropdownOptionsMount.querySelectorAll('.job-option-item').forEach(item => {
      item.addEventListener('click', () => {
        const jobId = item.getAttribute('data-job-id');
        appState.setActiveJobPosting(jobId);
        activeJobDropdownMenu.classList.remove('show');
      });
    });
  };

  renderJobDropdownOptions();
  const jobsBadge = document.getElementById('navJobsCountBadge');
  const templatesBadge = document.getElementById('navTemplatesCountBadge');
  const candidateCountBadge = document.getElementById('navCandidateCountBadge');
  const updateNavBadges = () => {
    if (jobsBadge) jobsBadge.textContent = `${appState.jobPostings.filter(j => j.status !== 'Borrador').length} activas`;
    if (templatesBadge) templatesBadge.textContent = `${appState.templates.length} perfiles`;
  };
  updateNavBadges();

  if (activeJobSelectorBtn && activeJobDropdownMenu) {
    activeJobSelectorBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      activeJobDropdownMenu.classList.toggle('show');
    });

    document.addEventListener('click', (e) => {
      if (!activeJobDropdownMenu.contains(e.target) && !activeJobSelectorBtn.contains(e.target)) {
        activeJobDropdownMenu.classList.remove('show');
      }
    });
  }

  // Update header and KPIs when job changes
  appState.subscribe((event, data) => {
    if (event === 'jobs_changed') { renderJobDropdownOptions(); updateNavBadges(); }
    if (['job_changed','criteria_updated','candidates_updated','jobs_changed'].includes(event)) {
      const job = appState.jobPosting;
      if (headerRoleBadge) {
        headerRoleBadge.className = `role-badge role-${job.roleType}`;
        headerRoleBadge.textContent = job.roleTypeName.toUpperCase();
      }
      if (headerJobPeriod) headerJobPeriod.textContent = job.period;
      if (headerJobDept) headerJobDept.textContent = job.department.split('/')[0].trim();
      if (headerJobTitle) headerJobTitle.textContent = job.title;

      // Update KPIs
      if (kpiProcessedCount) kpiProcessedCount.textContent = job.totalProcessed;
      if (kpiAvgScore) kpiAvgScore.textContent = job.avgScore ?? '—';
      if (candidateCountBadge) candidateCountBadge.textContent = `${appState.candidates.length} demo`;

      if (kpiRoleMetricLabel && job.roleMetrics) {
        kpiRoleMetricLabel.textContent = job.roleMetrics.metric1Label;
        kpiRoleMetricValue.textContent = job.roleMetrics.metric1Value;
      }

      const topNField = document.getElementById('topNInput');
      if (topNField) topNField.value = appState.topN;
      if (event === 'job_changed') {
      const searchField = document.getElementById('tableSearchInput');
      if (searchField) searchField.value = '';
      const sourceField = document.getElementById('filterSourceSelect');
      if (sourceField) sourceField.value = 'all';
      const statusField = document.getElementById('filterStatusSelect');
      if (statusField) statusField.value = 'all';
      }

      renderJobDropdownOptions();
      dataGrid.render();
    }
  });

  // 5. Adaptive Multi-Role Switcher (Mariana Córdova / Dr. Talavera / Decana / Admin)
  const globalRoleSelect = document.getElementById('globalRoleSelect');
  const userProfileAvatar = document.getElementById('userProfileAvatar');
  const userProfileName = document.getElementById('userProfileName');
  const userProfileRole = document.getElementById('userProfileRole');
  const navSectionGroups = document.querySelectorAll('.nav-section-group');

  const applyUserRole = (roleKey) => {
    appState.setUserRole(roleKey);
    const profile = appState.getUserRoleProfile();

    if (userProfileAvatar) userProfileAvatar.querySelector('span').textContent = profile.initials;
    if (userProfileName) userProfileName.textContent = profile.userName;
    if (userProfileRole) userProfileRole.textContent = profile.userRole;

    // Filter sidebar stages
    navSectionGroups.forEach(group => {
      const stage = group.getAttribute('data-stage');
      const isAllowed = profile.stages.includes(stage);
      group.style.display = isAllowed ? 'block' : 'none';
    });

    // Check if current view is allowed in this role
    const currentView = appState.currentView;
    const stageViewMap = {
      convocatorias: ['convocatorias'],
      ranking: ['convocatorias', 'evaluacion'],
      profilesLibrary: ['convocatorias'],
      kanban: ['seleccion'],
      comparison: ['evaluacion','seleccion'],
      talentPool: ['talento'],
      effectiveness: ['gobernanza'],
      executive: ['direccion']
    };

    const allowedViews = Object.entries(stageViewMap)
      .filter(([_, stages]) => stages.some(s => profile.stages.includes(s)))
      .map(([view]) => view);

    document.getElementById('openIngestionBtn').disabled = !appState.can('ingestion');
    ['topNInput','topNDecrementBtn','topNIncrementBtn'].forEach(id => { document.getElementById(id).disabled = !appState.can('selection'); });
    document.getElementById('navNewJobBtn').setAttribute('aria-disabled', String(!appState.can('jobs')));
    if (!allowedViews.includes(currentView)) {
      switchView('convocatorias');
    }
  };

  if (globalRoleSelect) {
    globalRoleSelect.addEventListener('change', (e) => {
      applyUserRole(e.target.value);
    });
  }

  // 6. View Routing & Sidebar Navigation (6 Etapas del Ciclo del Talento)
  const viewContainers = document.querySelectorAll('.view-container');
  const navItems = document.querySelectorAll('.sidebar-nav .nav-item');

  const renderCurrentView = (viewName) => {
    // Update Sidebar Navigation
    navItems.forEach(item => {
      const navTarget = item.getAttribute('data-nav') || item.getAttribute('data-target');
      item.classList.toggle('active', navTarget === viewName);
    });

    // Update View Containers
    viewContainers.forEach(container => {
      const containerView = container.id.replace('viewContainer_', '');
      container.classList.toggle('active', containerView === viewName);
    });

    // Trigger render for the active view
    if (viewName === 'kanban') kanbanController.render();
    if (viewName === 'comparison') comparisonController.render();
    if (viewName === 'talentPool') talentPoolController.render();
    if (viewName === 'effectiveness') effectivenessController.render();
    if (viewName === 'executive') executiveController.render();
    if (viewName === 'profilesLibrary') profilesLibraryController.render();
    if (viewName === 'convocatorias') vacanciesController.render();
    if (viewName === 'ranking') { dataGrid.scrollRegion.scrollTop = 0; dataGrid.render(); }

    document.querySelector('.app-main').scrollTo({ top: 0, behavior: 'instant' });
  };

  const switchView = viewName => {
    if (!appState.canView(viewName) || !document.getElementById(`viewContainer_${viewName}`)) return;
    if (appState.currentView === viewName) renderCurrentView(viewName);
    else appState.setCurrentView(viewName);
  };
  appState.subscribe((event, data) => {
    if (event === 'view_changed') renderCurrentView(data.viewName);
  });

  // Sidebar navigation routing
  navItems.forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const target = item.getAttribute('data-nav') || item.getAttribute('data-target');

      if (target === 'ingestion') {
        batchIngestion.open();
      } else if (target === 'criteria') {
        criteriaModal.open();
      } else if (target === 'new-job') {
        wizard.open();
      } else if (target === 'profilesLibrary') {
        switchView('profilesLibrary');
      } else if (target === 'interviews_star' || target === 'decisions') {
        switchView('ranking');
        appState.setActiveDrawerTab(target === 'interviews_star' ? 'gaps' : 'audit');
        notify('Selecciona un candidato para abrir su expediente.');      } else if (target === 'crossmatch') {
        switchView('talentPool');
      } else if (target === 'reports') {
        switchView('executive');
        notify('Puedes exportar el resumen de convocatorias en CSV.');
      } else if (target === 'audit') {
        switchView('ranking'); appState.setActiveDrawerTab('audit');
        notify('Selecciona una postulación para revisar su historial.');      } else if (target) {
        switchView(target);
      }
    });
  });

  // 6. Floating Comparison Dock (Cambio #6)
  const comparisonFloatingDock = document.getElementById('comparisonFloatingDock');
  const dockAvatarGroup = document.getElementById('dockAvatarGroup');
  const dockTextCount = document.getElementById('dockTextCount');
  const dockBtnCompareNow = document.getElementById('dockBtnCompareNow');
  const dockBtnClear = document.getElementById('dockBtnClear');

  const updateComparisonDock = (pool) => {
    if (!comparisonFloatingDock) return;

    if (pool.length >= 2) {
      comparisonFloatingDock.classList.add('visible');
      const cands = appState.getComparisonCandidates();

      if (dockAvatarGroup) {
        dockAvatarGroup.innerHTML = cands.map(c => `
          <div class="dock-avatar" title="${esc(c.name)}">${esc(c.name.split(' ').map(n=>n[0]).join(''))}</div>
        `).join('');
      }

      if (dockTextCount) {
        dockTextCount.textContent = `${pool.length} candidatos listos para comparar`;
      }
    } else {
      comparisonFloatingDock.classList.remove('visible');
    }
  };

  appState.subscribe((event, data) => {
    if (event === 'comparison_pool_changed') {
      updateComparisonDock(data.pool);
    }
  });

  if (dockBtnCompareNow) {
    dockBtnCompareNow.addEventListener('click', () => {
      switchView('comparison');
    });
  }

  if (dockBtnClear) {
    dockBtnClear.addEventListener('click', () => {
      appState.clearComparisonPool();
    });
  }

  // 8. Top-N Stepper Logic
  const topNInput = document.getElementById('topNInput');
  const topNDecrementBtn = document.getElementById('topNDecrementBtn');
  const topNIncrementBtn = document.getElementById('topNIncrementBtn');

  if (topNInput) {
    topNInput.value = appState.topN;
    topNInput.addEventListener('change', (e) => {
      appState.setTopN(e.target.value);
    });
  }

  if (topNDecrementBtn) {
    topNDecrementBtn.addEventListener('click', () => {
      appState.decrementTopN();
      if (topNInput) topNInput.value = appState.topN;
    });
  }

  if (topNIncrementBtn) {
    topNIncrementBtn.addEventListener('click', () => {
      appState.incrementTopN();
      if (topNInput) topNInput.value = appState.topN;
    });
  }

  appState.subscribe((event, data) => {
    if (event === 'topN_changed' && topNInput) {
      topNInput.value = data.topN;
    }
  });

  // 9. Search & Filter Inputs
  const searchInput = document.getElementById('tableSearchInput');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      appState.setSearchQuery(e.target.value);
    });
  }

  const filterSourceSelect = document.getElementById('filterSourceSelect');
  if (filterSourceSelect) {
    filterSourceSelect.addEventListener('change', (e) => {
      appState.setFilterSource(e.target.value);
    });
  }

  const filterStatusSelect = document.getElementById('filterStatusSelect');
  if (filterStatusSelect) {
    filterStatusSelect.addEventListener('change', (e) => {
      appState.setFilterStatus(e.target.value);
    });
  }

  // 10. Sidebar Collapse Toggle
  const sidebarEl = document.getElementById('appSidebar');
  const sidebarToggleBtn = document.getElementById('sidebarToggleBtn');
  const toggleSidebar = () => {
    if (!sidebarEl) return;
    const isCollapsed = sidebarEl.classList.toggle('collapsed');
    appState.setSidebarCollapsed(isCollapsed);
  };

  if (sidebarToggleBtn && sidebarEl) {
    sidebarToggleBtn.addEventListener('click', toggleSidebar);
  }

  window.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
      const tag = document.activeElement?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || document.activeElement?.isContentEditable) {
        return;
      }
      e.preventDefault();
      toggleSidebar();
    }
  });

  // 11. Header Ingestion Trigger
  const openIngestionBtn = document.getElementById('openIngestionBtn');
  if (openIngestionBtn) {
    openIngestionBtn.addEventListener('click', () => {
      batchIngestion.open();
    });
  }

  document.getElementById('exportRankingBtn')?.addEventListener('click', () => {
    const candidates = appState.getFilteredCandidates();
    if (!candidates.length) {
      alert('Esta convocatoria todavía no tiene candidatos para exportar.');
      return;
    }
    const safeCell = value => {
      const raw = String(value ?? '');
      const neutralized = /^[=+\-@\t\r]/.test(raw) ? `'${raw}` : raw;
      return `"${neutralized.replace(/"/g, '""')}"`;
    };
    const rows = [['ID', 'Candidato', 'Puesto', 'Score', 'Etapa', 'Fuente'], ...candidates.map(c => [c.id, c.name, appState.jobPosting.title, c.score, c.stage, c.source])];
    const csv = '\ufeff' + rows.map(row => row.map(safeCell).join(';')).join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `ranking-${appState.activeJobPostingId}.csv`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });

  // Bookmarkable context. Back/forward restores the job, view and candidate.
  let restoringRoute = false;
  const writeRoute = () => {
    if (restoringRoute) return;
    const params = new URLSearchParams({ view: appState.currentView, job: appState.activeJobPostingId });
    if (appState.selectedCandidateId) { params.set('candidate',appState.selectedCandidateId); params.set('tab',appState.activeDrawerTab); }
    const hash = `#${params}`;
    if (location.hash !== hash) history.pushState(null,'',hash);
  };
  const readRoute = () => {
    const params = new URLSearchParams(location.hash.slice(1));
    restoringRoute = true;
    try {
      if (params.get('job')) appState.setActiveJobPosting(params.get('job'));
      switchView(appState.canView(params.get('view')) ? params.get('view') : 'convocatorias');
      appState.setActiveDrawerTab(['explain','gaps','weights','cv','audit'].includes(params.get('tab')) ? params.get('tab') : 'explain');
      appState.selectCandidate(appState.candidates.some(c=>c.id===params.get('candidate')) ? params.get('candidate') : null);
    } finally { restoringRoute = false; }
  };
  window.addEventListener('popstate',readRoute);
  window.addEventListener('hashchange',readRoute);
  let routeWritePending = false;
  appState.subscribe(event => {
    if (restoringRoute || routeWritePending || !['view_changed','candidate_selected','drawer_tab_changed','job_changed'].includes(event)) return;
    routeWritePending = true;
    queueMicrotask(() => { routeWritePending = false; writeRoute(); });
  });

  // 12. Initial Render
  applyUserRole(appState.currentUserRole);
  if (candidateCountBadge) candidateCountBadge.textContent = `${appState.candidates.length} demo`;
  renderCurrentView(appState.currentView);
  appState.notify('job_changed', { jobPosting: appState.jobPosting });
  copilot.collapse();
  if (window.matchMedia('(max-width: 650px)').matches) toggleSidebar();
  if(location.hash) readRoute(); else writeRoute();
  console.log("TalentAI Enterprise Architecture initialized with Multi-Role support (GTHC · ESAN 2026).");
});
