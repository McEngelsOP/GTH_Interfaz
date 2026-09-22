/* ==========================================================================
   TalentAI - GTHC · ESAN
   Main Application Entry Point & Global Event Bindings
   ========================================================================== */

import { appState } from './state.js';
import { DataGridController } from './dataGrid.js';
import { DrawerController } from './drawer.js';
import { BatchIngestionController } from './batchIngestion.js';
import { CopilotController } from './copilot.js';

document.addEventListener('DOMContentLoaded', () => {
  // 1. Initialize Components
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

  const copilotEl = document.getElementById('copilotPanel');
  const copilotFloatingTriggerEl = document.getElementById('copilotFloatingTrigger');
  const copilot = new CopilotController(copilotEl, copilotFloatingTriggerEl);

  // 2. Global helper for PDF CV clicks
  window.openCandidateCV = (candId) => {
    appState.selectCandidate(candId);
    appState.setActiveDrawerTab('cv');
  };

  // 3. Top-N Dynamic Control
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

  // 4. Search and Filters
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

  // 5. Sidebar Toggle
  const sidebarEl = document.getElementById('appSidebar');
  const sidebarToggleBtn = document.getElementById('sidebarToggleBtn');
  if (sidebarToggleBtn && sidebarEl) {
    sidebarToggleBtn.addEventListener('click', () => {
      const isCollapsed = sidebarEl.classList.toggle('collapsed');
      appState.setSidebarCollapsed(isCollapsed);
    });
  }

  // 6. Navigation items
  const navItems = document.querySelectorAll('.nav-item');
  navItems.forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      navItems.forEach(i => i.classList.remove('active'));
      item.classList.add('active');

      const target = item.getAttribute('data-target');
      if (target === 'ingestion') {
        batchIngestion.open();
      } else if (target === 'ranking') {
        // scroll to data grid
        document.getElementById('candidateGridSection')?.scrollIntoView({ behavior: 'smooth' });
      } else if (target === 'audit') {
        const first = appState.candidates[0];
        if (first) {
          appState.selectCandidate(first.id);
          appState.setActiveDrawerTab('audit');
        }
      } else if (target === 'criteria') {
        alert('⚙️ Configuración de Criterios y Pesos: Abriendo matriz de ponderación para la convocatoria...');
      }
    });
  });

  // 7. Header buttons
  const openIngestionBtn = document.getElementById('openIngestionBtn');
  if (openIngestionBtn) {
    openIngestionBtn.addEventListener('click', () => {
      batchIngestion.open();
    });
  }

  // 8. Initial table render
  dataGrid.render();

  console.log('TalentAI (GTHC · ESAN) inicializado exitosamente.');
});
