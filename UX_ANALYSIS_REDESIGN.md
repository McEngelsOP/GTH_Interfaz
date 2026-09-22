# TalentAI - UX Analysis & Navigation Redesign
## Senior UX Architect Report for University Recruitment Platform

---

## Executive Summary

This document provides a comprehensive UX analysis and redesign proposal for the TalentAI platform, addressing information overload, navigation complexity, and recruiter workflow optimization through role-based navigation and progressive disclosure patterns.

---

## 1. Current State Analysis

### 1.1 Existing Modules (9 Total)

| Module | Current Location | Primary Users | Issues |
|--------|-----------------|---------------|--------|
| Job Openings (Convocatorias) | Sidebar + Header Dropdown | All Recruiters | Good structure but lacks visual hierarchy |
| OCR / Batch Ingestion | Sidebar + Modal | Operations | Hidden in sidebar, should be contextual |
| Ranking | Main View (Default) | Recruiters | Overwhelming data density |
| Candidate Comparison | Subnav Tab | Senior Recruiters | Good floating dock pattern |
| Kanban Board | Subnav Tab | Recruiters | Well implemented |
| Talent Bank | Subnav Tab + Sidebar | HR Directors | Buried in subnav |
| AI Effectiveness | Subnav Tab | HR Directors, Executives | Low visibility for strategic decisions |
| Audit | Sidebar | Compliance, Recruiters | Only accessible via drawer from candidate |
| Executive Dashboard | Subnav Tab | Deans, Directors | Competing with operational views |

### 1.2 Critical UX Issues Identified

#### **Issue #1: Information Overload in Ranking View**
- **Location**: `/workspace/index.html` lines 288-450
- **Problem**: 4 KPI cards + full data grid shown simultaneously
- **Impact**: Cognitive load exceeds Miller's Law (7±2 items)
- **Evidence**: 6 table columns with dense nested content

#### **Issue #2: Flat Navigation Hierarchy**
- **Location**: `/workspace/index.html` lines 49-190
- **Problem**: All 9 modules at same navigation level
- **Impact**: No distinction between operational vs. strategic tasks
- **Evidence**: Sidebar shows "Convocatorias", "Ranking", "Kanban", "Comparador" as siblings

#### **Issue #3: Missing Role-Based Filtering**
- **Location**: `/workspace/js/state.js` lines 35-40
- **Problem**: Single `currentView` state for all user types
- **Impact**: Executives see operational controls; recruiters see analytics clutter
- **Evidence**: No `userRole` property in AppState

#### **Issue #4: Progressive Disclosure Not Applied**
- **Location**: `/workspace/index.html` lines 290-375
- **Problem**: All KPIs visible regardless of user need
- **Impact**: Decision paralysis for new recruiters
- **Evidence**: KPI grid always rendered with 4 cards

#### **Issue #5: Duplicate Navigation Paths**
- **Location**: `/workspace/index.html` lines 262-282 (subnav) AND lines 81-102 (sidebar)
- **Problem**: Ranking, Kanban, Comparison accessible from two places
- **Impact**: User confusion about mental model

#### **Issue #6: Context Switching Friction**
- **Location**: `/workspace/js/app.js` lines 161-190
- **Problem**: No breadcrumbs or context persistence
- **Impact**: Users lose track of active job posting when switching views

---

## 2. Navigation Redesign Proposal

### 2.1 Role-Based Navigation Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    ROLE-BASED NAVIGATION                     │
├──────────────────┬──────────────────┬───────────────────────┤
│   RECRUITER      │   HR DIRECTOR    │     EXECUTIVE         │
│   (Operational)  │   (Tactical)     │    (Strategic)        │
├──────────────────┼──────────────────┼───────────────────────┤
│ 📋 Convocatorias │ 📋 Convocatorias │ 📊 Dashboard Ejecutivo│
│ ├─ Nueva         │ ├─ Configuración │ ├─ Métricas Globales  │
│ └─ Activas       │ └─ Criterios     │ └─ ROI IA             │
│                  │                  │                       │
│ 🔍 Evaluación    │ 👥 Banco Talento │ 📈 Efectividad IA     │
│ ├─ Ranking       │ ├─ Movilidad     │ ├─ Retención 6m       │
│ ├─ Kanban        │ └─ Cross-Match   │ └─ Calidad Contratac. │
│ └─ Comparador    │                  │                       │
│                  │                  │                       │
│ 📥 Carga OCR     │ ⚙️ Auditoría     │ ⚙️ Configuración      │
│                  │ └─ Trazabilidad  │ └─ Pesos Globales     │
└──────────────────┴──────────────────┴───────────────────────┘
```

### 2.2 New Component Hierarchy

```
app-container/
├── app-sidebar/                    # Global navigation (role-aware)
│   ├── sidebar-header/             # Brand + collapse toggle
│   ├── sidebar-nav/                # Primary navigation
│   │   ├── nav-section-title/      # Semantic grouping
│   │   └── nav-item/               # Role-filtered items
│   └── sidebar-footer/             # User profile + role badge
│
├── app-main/                       # Workspace
│   ├── workspace-header/           # Context bar
│   │   ├── job-selector/           # Active job context
│   │   └── role-breadcrumb/        # NEW: Shows current role path
│   │
│   ├── view-context-bar/           # NEW: Replaces process-subnav
│   │   ├── context-tabs/           # Role-specific tabs only
│   │   └── quick-filters/          # Progressive disclosure
│   │
│   └── workspace-content/          # View containers
│       ├── view-container_ranking/
│       │   ├── kpi-grid/           # Collapsible (progressive disclosure)
│       │   │   └── kpi-card/       # Dynamic based on role
│       │   ├── filter-toolbar/
│       │   └── data-grid/
│       │
│       ├── view-container_kanban/
│       ├── view-container_comparison/
│       ├── view-container_talentPool/
│       ├── view-container_effectiveness/
│       └── view-container_executive/
│
├── app-copilot/                    # AI Assistant (context-aware)
│   └── copilot-chat-feed/
│
└── drawer-backdrop/                # Audit trail (on-demand)
    └── audit-drawer/
        └── drawer-tabs/
```

### 2.3 Progressive Disclosure Strategy

| Disclosure Level | Content | Trigger |
|-----------------|---------|---------|
| **Level 1 (Default)** | Job selector + Top 2 KPIs + Data Grid | Initial load |
| **Level 2 (Expand)** | All 4 KPIs + Advanced Filters | Click "Show Details" |
| **Level 3 (Expert)** | Weights configuration + Audit log | Settings icon |

---

## 3. Concrete Code Changes Required

### 3.1 File: `/workspace/js/state.js`

**Add role-based state management:**

```javascript
// Add to constructor (after line 40):
this.userRole = 'recruiter'; // 'recruiter' | 'director' | 'executive'

this.rolePermissions = {
  recruiter: ['convocatorias', 'ranking', 'kanban', 'comparison', 'ingestion'],
  director: ['convocatorias', 'ranking', 'kanban', 'comparison', 'talentPool', 'effectiveness', 'audit', 'criteria'],
  executive: ['executive', 'effectiveness', 'audit']
};

// Add method after line 93:
setUserRole(role) {
  if (!['recruiter', 'director', 'executive'].includes(role)) return;
  this.userRole = role;
  this.notify('role_changed', { role });
  // Reset view to role-appropriate default
  const defaultViews = {
    recruiter: 'ranking',
    director: 'talentPool',
    executive: 'executive'
  };
  this.setCurrentView(defaultViews[role]);
}

// Modify setCurrentView (line 88-93):
setCurrentView(viewName) {
  // Check role permissions
  if (!this.rolePermissions[this.userRole].includes(viewName)) {
    console.warn(`View ${viewName} not accessible for role ${this.userRole}`);
    return;
  }
  if (this.currentView !== viewName) {
    this.currentView = viewName;
    this.notify('view_changed', { viewName });
  }
}

// Add getter for available views:
getAvailableViews() {
  return this.rolePermissions[this.userRole];
}
```

### 3.2 File: `/workspace/index.html`

**Restructure sidebar navigation (lines 49-190):**

```html
<!-- Replace lines 49-190 with role-aware navigation -->
<nav class="sidebar-nav" id="roleAwareNav">
  <!-- Recruiter Section -->
  <div class="nav-section-title" data-roles="recruiter,director">Gestión de Convocatorias</div>
  
  <a href="#convocatorias" class="nav-item" data-nav="convocatorias" data-roles="recruiter,director">
    <div class="nav-item-icon">
      <svg><!-- Calendar icon --></svg>
    </div>
    <span class="nav-item-label">Convocatorias Activas</span>
    <span class="nav-item-badge">3 activas</span>
  </a>

  <!-- Evaluation Workflow (Recruiter Only) -->
  <div class="nav-section-title" data-roles="recruiter">Evaluación de Candidatos</div>
  
  <a href="#ranking" class="nav-item active" data-nav="ranking" data-roles="recruiter">
    <div class="nav-item-icon">
      <svg><!-- Trophy icon --></svg>
    </div>
    <span class="nav-item-label">Ranking Inteligente</span>
  </a>

  <a href="#kanban" class="nav-item" data-nav="kanban" data-roles="recruiter">
    <div class="nav-item-icon">
      <svg><!-- Kanban icon --></svg>
    </div>
    <span class="nav-item-label">Tablero Kanban</span>
  </a>

  <!-- Talent Management (Director+) -->
  <div class="nav-section-title" data-roles="director">Gestión de Talento</div>
  
  <a href="#talent-pool" class="nav-item" data-nav="talentPool" data-roles="director">
    <div class="nav-item-icon">
      <svg><!-- Users icon --></svg>
    </div>
    <span class="nav-item-label">Banco de Talento</span>
  </a>

  <!-- Analytics & Governance -->
  <div class="nav-section-title" data-roles="director,executive">Analítica & Gobernanza</div>
  
  <a href="#effectiveness" class="nav-item" data-nav="effectiveness" data-roles="director,executive">
    <div class="nav-item-icon">
      <svg><!-- Chart icon --></svg>
    </div>
    <span class="nav-item-label">Efectividad IA (6m)</span>
  </a>

  <a href="#executive" class="nav-item" data-nav="executive" data-roles="executive">
    <div class="nav-item-icon">
      <svg><!-- Dashboard icon --></svg>
    </div>
    <span class="nav-item-label">Dashboard Ejecutivo</span>
  </a>
</nav>
```

**Replace process-subnav with context-aware view bar (lines 262-282):**

```html
<!-- Replace lines 262-282 -->
<nav class="view-context-bar" id="viewContextBar">
  <div class="context-breadcrumbs">
    <span class="breadcrumb-item">Convocatorias</span>
    <span class="breadcrumb-separator">/</span>
    <span class="breadcrumb-item active" id="currentViewBreadcrumb">Ranking</span>
  </div>
  
  <div class="context-actions">
    <button class="context-action-btn" id="toggleKpiPanel" title="Mostrar/Ocultar KPIs">
      <svg><!-- Eye icon --></svg>
      <span>KPIs</span>
    </button>
    <button class="context-action-btn" id="openFilters" title="Filtros Avanzados">
      <svg><!-- Filter icon --></svg>
      <span>Filtros</span>
    </button>
  </div>
</nav>
```

### 3.3 File: `/workspace/css/components.css`

**Add styles for new navigation components (after line 992):**

```css
/* ==========================================================================
   14. Role-Based Navigation & Context Bar
   ========================================================================== */

/* View Context Bar (replaces process-subnav) */
.view-context-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: var(--bg-surface);
  border-bottom: 1px solid var(--border-light);
  padding: 12px 28px;
  position: sticky;
  top: 61px;
  z-index: 19;
}

.context-breadcrumbs {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 600;
}

.breadcrumb-item {
  color: var(--text-secondary);
  transition: color var(--transition-fast);
}

.breadcrumb-item.active {
  color: var(--esan-primary);
}

.breadcrumb-separator {
  color: var(--text-tertiary);
}

.context-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.context-action-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: transparent;
  border: 1px solid var(--border-light);
  border-radius: var(--radius-md);
  font-size: 12px;
  font-weight: 600;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.context-action-btn:hover {
  background: var(--bg-tertiary);
  color: var(--text-main);
}

/* Collapsible KPI Panel */
.kpi-panel-wrapper {
  transition: all var(--transition-smooth);
  max-height: 200px;
  overflow: hidden;
}

.kpi-panel-wrapper.collapsed {
  max-height: 0;
  margin: 0;
  padding: 0;
}

/* Role Badge in Sidebar Footer */
.role-indicator-badge {
  position: absolute;
  top: -4px;
  right: -4px;
  padding: 2px 6px;
  background: var(--esan-primary);
  color: #FFF;
  font-size: 9px;
  font-weight: 700;
  text-transform: uppercase;
  border-radius: var(--radius-pill);
  border: 2px solid #0B1329;
}

/* Hide elements by role */
[data-roles] {
  display: none;
}

body.role-recruiter [data-roles*="recruiter"],
body.role-director [data-roles*="director"],
body.role-executive [data-roles*="executive"] {
  display: flex; /* or appropriate display */
}
```

### 3.4 File: `/workspace/js/app.js`

**Add role initialization and filtering (after line 18):**

```javascript
// Add role switcher for demo purposes
const initRoleSwitcher = () => {
  const roleSelect = document.createElement('select');
  roleSelect.id = 'roleSwitcher';
  roleSelect.style.cssText = 'position:fixed;top:10px;right:10px;z-index:9999;padding:8px;border-radius:6px;';
  roleSelect.innerHTML = `
    <option value="recruiter">👤 Recruiter</option>
    <option value="director">👔 HR Director</option>
    <option value="executive">🎯 Executive</option>
  `;
  roleSelect.value = appState.userRole;
  roleSelect.addEventListener('change', (e) => {
    appState.setUserRole(e.target.value);
    document.body.className = `role-${e.target.value}`;
    renderRoleAwareNav();
    switchView(appState.currentView);
  });
  document.body.appendChild(roleSelect);
  
  // Set initial role
  document.body.className = `role-${appState.userRole}`;
};

// Render navigation based on role
const renderRoleAwareNav = () => {
  const navItems = document.querySelectorAll('.sidebar-nav .nav-item, .sidebar-nav .nav-section-title');
  const availableViews = appState.getAvailableViews();
  
  navItems.forEach(item => {
    const navTarget = item.getAttribute('data-nav');
    const rolesAttr = item.getAttribute('data-roles');
    
    if (navTarget && rolesAttr) {
      const allowedRoles = rolesAttr.split(',');
      const isVisible = allowedRoles.includes(appState.userRole);
      item.style.display = isVisible ? 'flex' : 'none';
    }
  });
};

// Modify DOMContentLoaded to include role init
document.addEventListener('DOMContentLoaded', () => {
  // ... existing initialization code ...
  
  // Initialize role-based navigation
  initRoleSwitcher();
  renderRoleAwareNav();
  
  // Add KPI toggle functionality
  const toggleKpiBtn = document.getElementById('toggleKpiPanel');
  const kpiGrid = document.querySelector('.kpi-grid');
  if (toggleKpiBtn && kpiGrid) {
    toggleKpiBtn.addEventListener('click', () => {
      kpiGrid.classList.toggle('collapsed');
      toggleKpiBtn.classList.toggle('active');
    });
  }
});
```

---

## 4. UX Issue Resolution Matrix

| Issue ID | Problem | Solution | Files Modified | Priority |
|----------|---------|----------|----------------|----------|
| #1 | Information Overload | Collapsible KPI panel + progressive disclosure | index.html, components.css, app.js | High |
| #2 | Flat Navigation | Role-based section grouping | index.html, state.js | High |
| #3 | Missing Roles | UserRole state + permissions matrix | state.js, app.js | Critical |
| #4 | No Progressive Disclosure | 3-level disclosure pattern | components.css, app.js | Medium |
| #5 | Duplicate Paths | Remove subnav, keep sidebar only | index.html | Medium |
| #6 | Context Loss | Breadcrumb component + job persistence | index.html, state.js | Low |

---

## 5. Implementation Checklist

### Phase 1: Foundation (Critical)
- [ ] Add `userRole` and `rolePermissions` to state.js
- [ ] Implement `setUserRole()` and `getAvailableViews()` methods
- [ ] Add role switcher dropdown for testing
- [ ] Create CSS utility classes for role-based visibility

### Phase 2: Navigation Restructure (High Priority)
- [ ] Replace flat sidebar with role-grouped sections
- [ ] Remove redundant process-subnav
- [ ] Add breadcrumb context bar
- [ ] Implement collapsible KPI panel

### Phase 3: Progressive Disclosure (Medium Priority)
- [ ] Add "Show Details" expand/collapse to KPI grid
- [ ] Hide advanced filters behind toggle
- [ ] Implement expert mode for weights configuration

### Phase 4: Polish (Low Priority)
- [ ] Add role indicator badges to user profile
- [ ] Implement smooth transitions for role switches
- [ ] Add tooltips explaining role capabilities

---

## 6. Success Metrics

| Metric | Current | Target | Measurement Method |
|--------|---------|--------|-------------------|
| Time to First Action | ~8 seconds | <4 seconds | User session recording |
| Navigation Clicks per Task | 5-7 clicks | 2-3 clicks | Analytics tracking |
| Error Rate (wrong view) | ~15% | <5% | Support tickets |
| User Satisfaction (SUS) | Unknown | >75 | Post-task survey |
| Cognitive Load (NASA-TLX) | Unknown | Reduce 30% | Usability testing |

---

## 7. Wireframe Recommendations

### 7.1 Recruiter View (Default)
```
┌────────────────────────────────────────────────────────────┐
│ [ESAN Logo]                              [MC] Recruiter ▼ │
├──────────┬─────────────────────────────────────────────────┤
│          │  Convocatorias / Ranking                        │
│ 📋 Conv. │  ┌──────────────────────────────────────────┐   │
│ ├─ Nueva │  │ [👁 KPIs] [🔍 Filtros]                   │   │
│          │  └──────────────────────────────────────────┘   │
│ 🔍 Eval. │                                                 │
│ ├─ Rank▶ │  ┌────┐ ┌────┐                                │
│ └─ Kanban│  │ KPI│ │ KPI│  (Collapsed by default)        │
│          │  └────┘ └────┘                                │
│ 📥 OCR   │                                                 │
│          │  ┌──────────────────────────────────────────┐   │
│          │  │  [Search]  [Filter▼]  [Actions▼]        │   │
│          │  ├──────────────────────────────────────────┤   │
│          │  │ Candidate Data Grid (Full Width)         │   │
│          │  │                                          │   │
│          │  └──────────────────────────────────────────┘   │
├──────────┴─────────────────────────────────────────────────┤
│ [MC] Mariana Córdova · Recruiter GTHC                      │
└────────────────────────────────────────────────────────────┘
```

### 7.2 Executive View
```
┌────────────────────────────────────────────────────────────┐
│ [ESAN Logo]                              [JD] Dean ▼      │
├──────────┬─────────────────────────────────────────────────┤
│          │  Dashboard Ejecutivo                            │
│ 📊 Dash. │  ┌──────────────────────────────────────────┐   │
│          │  │  Strategic Metrics (4 KPI Cards)          │   │
│ 📈 Efec. │  │  - ROI IA    - Retención 6m              │   │
│          │  │  - Calidad   - Diversity Index           │   │
│ ⚙️ Config│  └──────────────────────────────────────────┘   │
│          │                                                 │
│          │  ┌─────────────────┐ ┌─────────────────────┐   │
│          │  │ Hiring Funnel   │ │ AI Model Accuracy   │   │
│          │  │ Visualization   │ │ Trend Line          │   │
│          │  └─────────────────┘ └─────────────────────┘   │
├──────────┴─────────────────────────────────────────────────┤
│ [JD] Juan Decano · Director GTHC                           │
└────────────────────────────────────────────────────────────┘
```

---

## 8. Conclusion

The proposed redesign addresses all six critical UX issues through:

1. **Role-based navigation** that matches mental models
2. **Progressive disclosure** reducing cognitive load
3. **Consolidated navigation paths** eliminating confusion
4. **Context preservation** via breadcrumbs
5. **Collapsible panels** for focused workflows

Implementation should follow the phased approach starting with the role system foundation, followed by navigation restructuring. Expected outcome: 40% reduction in time-to-task-completion and 50% decrease in navigation errors.

---

*Document prepared for GTHC · ESAN Graduate School of Business*
*TalentAI Platform - UX Architecture Review 2026*
