import React, { useEffect, useId, useRef, useState } from 'react';
import { useDialog } from '../common/useDialog.ts';
import '../../styles/sidebar.css';
import { IS_STAGE_ONE } from '../../config/edition.ts';
import { useApp, ViewType } from '../../context/AppContext.tsx';
import {
  Briefcase,
  BookOpen,
  PlusCircle,
  UploadCloud,
  Award,
  GitCompare,
  Kanban,
  Database,
  Sliders,
  History,
  FileCheck2,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
  X,
  GraduationCap,
  RefreshCw,
  Library,
  UserCog,
} from 'lucide-react';
import type { useBumeranSync } from '../../services/useBumeranSync.ts';
import { resumirRevisiones, timeAgo } from '../../services/bumeranSync.ts';
import { puedeVerSeccion, usePerfil, VISTA_ADMIN } from '../../services/permisos.ts';

interface SidebarProps {
  sync?: ReturnType<typeof useBumeranSync>;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

interface NavItem {
  id: ViewType;
  label: string;
  icon: React.ReactNode;
  count?: number;
  /** Punto de estado y texto corto a la derecha (p. ej. «hace 2 h»), en lugar del contador. */
  status?: { color: string; text: string; label: string };
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

export function Sidebar({ sync, isMobileOpen = false, onCloseMobile }: SidebarProps) {
  const { currentView, setCurrentView, activeJobApplications, appState } = useApp();
  const perfil = usePerfil();
  const [collapsed, setCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(() => window.matchMedia('(max-width: 768px)').matches);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const navId = useId();
  const compact = collapsed && !isMobile;
  useEffect(() => {
    const query = window.matchMedia('(max-width: 768px)');
    const update = () => setIsMobile(query.matches);
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);
  useDialog(isMobile && isMobileOpen, sidebarRef, () => onCloseMobile?.());
  const toggleSidebar = () => isMobile ? onCloseMobile?.() : setCollapsed((value) => !value);
  const toggleLabel = isMobile ? 'Cerrar menú lateral' : compact ? 'Expandir menú lateral' : 'Colapsar menú lateral';

  // Contadores vivos calculados a partir de los datos
  const totalInJob = activeJobApplications.length;
  const totalTalentPool = appState.candidates.filter((c) => c.savedInTalentPool).length;
  const totalJobPostings = appState.jobPostings.length;

  // Estado de los datos de Bumeran: verde = al día, rojo = error al consultar, gris = consultando o sin datos
  const ultimaRevision = sync ? resumirRevisiones(sync.runs.rows)[0] : undefined;
  const errorSync = sync && [sync.postings.error, sync.applicants.error, sync.ranking.error, sync.runs.error].some(Boolean);
  const cargandoSync = sync && (sync.postings.loading || sync.runs.loading);
  const datosItem: NavItem = {
    id: 'actualizacion_datos', label: 'Actualización de datos', icon: <RefreshCw size={18} />,
    status: !sync?.configured ? undefined : {
      color: errorSync ? 'var(--status-failed-text)' : cargandoSync || !ultimaRevision ? 'var(--text-muted)' : 'var(--status-verified-text)',
      text: errorSync ? 'error' : ultimaRevision ? timeAgo(ultimaRevision.inicio).replace('hace ', '') : '',
      label: errorSync ? 'Error al consultar los datos' : ultimaRevision ? `Última revisión de Bumeran ${timeAgo(ultimaRevision.inicio)}` : 'Consultando',
    },
  };

  const allNavGroups: NavGroup[] = [
    {
      title: 'Puestos',
      items: [
        { id: 'convocatorias', label: 'Convocatorias', icon: <Briefcase size={18} />, count: totalJobPostings },
        { id: 'perfiles_puestos', label: 'Perfiles de puestos', icon: <BookOpen size={18} /> },
        { id: 'nueva_convocatoria', label: 'Nueva convocatoria', icon: <PlusCircle size={18} /> },
      ],
    },
    {
      title: 'Candidatos',
      items: [
        { id: 'mejores_candidatos', label: 'Candidatos y ranking', icon: <Award size={18} />, count: totalInJob },
        { id: 'base_centralizada', label: 'Base centralizada', icon: <Library size={18} /> },
        { id: 'comparador', label: 'Comparador', icon: <GitCompare size={18} /> },
      ],
    },
    {
      title: 'Seguimiento',
      items: [
        { id: 'avance_candidatos', label: 'Avance de candidatos', icon: <Kanban size={18} /> },
      ],
    },
    {
      title: 'Talento',
      items: [
        { id: 'banco_talento', label: 'Banco de Talento', icon: <Database size={18} />, count: totalTalentPool },
      ],
    },
    {
      title: 'Configuración',
      items: [
        { id: 'criterios_evaluacion', label: 'Criterios de evaluación', icon: <Sliders size={18} /> },
        { id: 'historial_decisiones', label: 'Historial de decisiones', icon: <History size={18} /> },
        { id: 'resultados_proceso', label: 'Resultados del proceso', icon: <FileCheck2 size={18} /> },
        { id: 'ajustes_generales', label: 'Ajustes generales', icon: <Settings size={18} /> },
      ],
    },
    {
      title: 'Resultados',
      items: [
        { id: 'resumen_general', label: 'Resumen general', icon: <BarChart3 size={18} /> },
      ],
    },
    { title: 'Datos', items: [datosItem] },
    { title: 'Administración', items: [{ id: VISTA_ADMIN, label: 'Usuarios y permisos', icon: <UserCog size={18} /> }] },
  ];

  const stageOneLayout: { title: string; views: ViewType[] }[] = [
    { title: '', views: ['convocatorias'] },
    { title: 'Proceso de selección', views: ['mejores_candidatos', 'comparador', 'avance_candidatos'] },
    { title: 'Datos', views: ['base_centralizada', 'actualizacion_datos'] },
    { title: 'Administración', views: [VISTA_ADMIN] },
  ];
  const navItems = allNavGroups.flatMap((group) => group.items);
  const stageOneNavGroups = stageOneLayout.map(({ title, views }) => ({
    title,
    items: views.flatMap((view) => navItems.filter((item) => item.id === view)),
  }));

  // Se conservan los iconos y datos de cada función, filtrados por los permisos del perfil.
  const navGroups = (IS_STAGE_ONE
    ? stageOneNavGroups
    : allNavGroups)
    .map((group) => ({ ...group, items: group.items.filter((item) => puedeVerSeccion(perfil, item.id)) }))
    .filter((group) => group.items.length);

  const handleSelectView = (view: ViewType) => {
    setCurrentView(view);
    if (onCloseMobile) onCloseMobile();
  };

  return (
    <>
      <div className={`sidebar-backdrop${isMobileOpen ? ' is-open' : ''}`} aria-hidden="true" onClick={onCloseMobile} />
      <div
        ref={sidebarRef}
        className={`sidebar-shell${compact ? ' is-compact' : ''}${isMobileOpen ? ' is-mobile-open' : ''}`}
        role={isMobile && isMobileOpen ? 'dialog' : undefined}
        aria-modal={isMobile && isMobileOpen ? true : undefined}
        aria-label={isMobile ? 'Menú de navegación' : undefined}
        inert={isMobile && !isMobileOpen}
        tabIndex={-1}
      >
        <aside className="sidebar">
          <div className="sidebar-header">
            <button type="button" className="sidebar-brand-toggle focus-ring" onClick={toggleSidebar}
              aria-label={toggleLabel} title={toggleLabel} aria-expanded={isMobile ? isMobileOpen : !compact} aria-controls={navId}>
              <span className="sidebar-brand-icon"><GraduationCap size={20} /></span>
            </button>
            <button type="button" className="sidebar-wordmark sidebar-copy focus-ring"
              tabIndex={compact ? -1 : undefined} aria-hidden={compact}
              onClick={() => handleSelectView('mejores_candidatos')}>
              <span>TalentAI <em>· ESAN</em></span>
              <small>GTHC · Selección</small>
            </button>
            <button type="button" className="sidebar-header-close sidebar-copy focus-ring"
              tabIndex={compact ? -1 : undefined} aria-hidden={compact}
              onClick={toggleSidebar} aria-label={isMobile ? 'Cerrar navegación' : 'Contraer navegación'}
              aria-expanded={isMobile ? isMobileOpen : !compact} aria-controls={navId}>
              {isMobile ? <X size={18} /> : <ChevronLeft size={18} />}
            </button>
          </div>
          <nav id={navId} aria-label="Navegación principal" className="sidebar-nav">
            {navGroups.map((group) => (
              <div key={group.title} role="group" aria-label={group.title || 'Convocatorias'} className="sidebar-group">
                {group.title && <div className="sidebar-group-heading" aria-hidden={compact}>
                  <div><span>{group.title}</span></div>
                </div>}
                {group.items.map((item) => {
                  const isActive = currentView === item.id;
                  return (
                    <button key={item.id} type="button" onClick={() => handleSelectView(item.id)}
                      className="sidebar-link focus-ring" aria-label={item.label}
                      aria-current={isActive ? 'page' : undefined} title={compact ? item.label : undefined}>
                      <span className="sidebar-link-icon">
                        {item.icon}
                        {item.status && <span className="sidebar-status-dot" aria-hidden="true" style={{ backgroundColor: item.status.color }} />}
                      </span>
                      <span className="sidebar-link-label sidebar-copy" aria-hidden={compact}>{item.label}</span>
                      {item.status && <span className="sidebar-status sidebar-copy" aria-hidden={compact}
                        title={item.status.label} style={{ color: item.status.color }}>{item.status.text}</span>}
                      {item.count !== undefined && item.count > 0 && (
                        <span className="sidebar-count sidebar-copy" aria-hidden={compact}>{item.count}</span>
                      )}
                    </button>
                  );
                })}
              </div>
            ))}
          </nav>
          <div className="sidebar-footer">
            <button type="button" className="sidebar-footer-toggle focus-ring" onClick={toggleSidebar}
              aria-label={toggleLabel} aria-expanded={!compact} aria-controls={navId}>
              <span className="sidebar-footer-chevron"><ChevronRight size={18} /></span>
              <span className="sidebar-copy" aria-hidden={compact}>Contraer menú</span>
            </button>
          </div>
        </aside>
      </div>
    </>
  );
}
