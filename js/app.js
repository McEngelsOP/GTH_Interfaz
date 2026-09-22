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
    docente: { label: 'Convocatorias Docentes & Cátedras', icon: '🎓', count: 8 },
    administrativo: { label: 'Convocatorias Administrativas & Gestión', icon: '💼', count: 5 },
    operativo: { label: 'Convocatorias Operativas & Soporte', icon: '🔧', count: 3 },
    directivo: { label: 'Convocatorias Directivas & Jefaturas', icon: '🏛️', count: 2 }
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
                <div class="job-option-item ${isSelected ? 'selected' : ''}" data-job-id="${job.id}">
                  <div style="display: flex; flex-direction: column; gap: 2px;">
                    <div style="display: flex; align-items: center; gap: 6px;">
                      <span class="role-badge role-${job.roleType}">${job.roleTypeName}</span>
                      <span style="font-size: 11px; font-weight: 700; color: var(--text-tertiary);">${job.id}</span>
                    </div>
                    <strong style="font-size: 13px; color: var(--text-main); margin-top: 2px;">${job.title}</strong>
                    <span style="font-size: 11px; color: var(--text-secondary);">${job.department} • ${job.period}</span>
                  </div>
                  <div style="text-align: right; flex-shrink: 0;">
                    <span style="font-size: 13.5px; font-weight: 800; color: #2563EB;">${job.totalProcessed}</span>
                    <div style="font-size: 10px; color: var(--text-tertiary);">CVs</div>
                  </div>
                </div>
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
    if (event === 'job_changed') {
      const job = data.jobPosting;
      if (headerRoleBadge) {
        headerRoleBadge.className = `role-badge role-${job.roleType}`;
        headerRoleBadge.textContent = job.roleTypeName.toUpperCase();
      }
      if (headerJobPeriod) headerJobPeriod.textContent = job.period;
      if (headerJobDept) headerJobDept.textContent = job.department.split('/')[0].trim();
      if (headerJobTitle) headerJobTitle.textContent = job.title;

      // Update KPIs
      if (kpiProcessedCount) kpiProcessedCount.textContent = job.totalProcessed;
      if (kpiAvgScore) kpiAvgScore.textContent = job.avgScore;

      if (kpiRoleMetricLabel && job.roleMetrics) {
        kpiRoleMetricLabel.textContent = job.roleMetrics.metric1Label;
        kpiRoleMetricValue.textContent = job.roleMetrics.metric1Value;
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

    if (userProfileAvatar) userProfileAvatar.querySelector('span').textContent = profile.avatar;
    if (userProfileName) userProfileName.textContent = profile.name;
    if (userProfileRole) userProfileRole.textContent = profile.roleTitle;

    // Filter sidebar stages
    navSectionGroups.forEach(group => {
      const stage = group.getAttribute('data-stage');
      const isAllowed = profile.allowedStages.includes(stage);
      group.style.display = isAllowed ? 'block' : 'none';
    });

    // Check if current view is allowed in this role
    const currentView = appState.currentView;
    const stageViewMap = {
      ranking: ['convocatorias', 'evaluacion'],
      profilesLibrary: ['convocatorias'],
      kanban: ['seleccion'],
      comparison: ['evaluacion'],
      talentPool: ['talento'],
      effectiveness: ['gobernanza'],
      executive: ['direccion']
    };

    const allowedViews = Object.entries(stageViewMap)
      .filter(([_, stages]) => stages.some(s => profile.allowedStages.includes(s)))
      .map(([view]) => view);

    if (!allowedViews.includes(currentView)) {
      switchView(profile.defaultView || 'ranking');
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

  const switchView = (viewName) => {
    appState.setCurrentView(viewName);

    // Update Sidebar Navigation
    navItems.forEach(item => {
      const navTarget = item.getAttribute('data-nav') || item.getAttribute('data-target');
      item.classList.toggle('active', navTarget === viewName || (viewName === 'ranking' && navTarget === 'convocatorias'));
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
    if (viewName === 'ranking') dataGrid.render();

    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Sidebar navigation routing
  navItems.forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const target = item.getAttribute('data-nav') || item.getAttribute('data-target');

      if (target === 'ingestion') {
        batchIngestion.open();
      } else if (target === 'criteria') {
        criteriaModal.open();
      } else if (target === 'new-job' || target === 'profilesLibrary') {
        switchView('profilesLibrary');
      } else if (target === 'interviews_star') {
        switchView('ranking');
        const first = appState.candidates[0];
        if (first) {
          appState.selectCandidate(first.id);
          appState.setActiveDrawerTab('gaps');
        }
      } else if (target === 'decisions') {
        switchView('ranking');
        const first = appState.candidates[0];
        if (first) {
          appState.selectCandidate(first.id);
          appState.setActiveDrawerTab('audit');
        }
      } else if (target === 'crossmatch') {
        switchView('talentPool');
      } else if (target === 'reports') {
        alert('📊 Generando informe consolidado de cobertura institucional y contrataciones en formato PDF para Decanatura...');
      } else if (target === 'audit') {
        const first = appState.candidates[0];
        if (first) {
          appState.selectCandidate(first.id);
          appState.setActiveDrawerTab('audit');
        }
      } else if (target) {
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
          <div class="dock-avatar" title="${c.name}">${c.name.split(' ').map(n=>n[0]).join('')}</div>
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

  const filterCategorySelect = document.getElementById('filterCategorySelect');
  if (filterCategorySelect) {
    filterCategorySelect.addEventListener('change', (e) => {
      const cat = e.target.value;
      if (cat !== 'all') {
        const found = appState.jobPostings.find(j => j.roleType === cat);
        if (found) {
          appState.setActiveJobPosting(found.id);
        }
      }
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

  // 12. Initial Render
  dataGrid.render();
  console.log("TalentAI Enterprise Architecture initialized with Multi-Role support (GTHC · ESAN 2026).");
});
