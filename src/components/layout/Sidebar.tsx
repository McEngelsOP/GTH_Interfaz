import React, { useState } from 'react';
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
  GraduationCap,
} from 'lucide-react';

interface SidebarProps {
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

interface NavItem {
  id: ViewType;
  label: string;
  icon: React.ReactNode;
  count?: number;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

export function Sidebar({ isMobileOpen = false, onCloseMobile }: SidebarProps) {
  const { currentView, setCurrentView, activeJobApplications, appState } = useApp();
  const [collapsed, setCollapsed] = useState(false);

  // Contadores vivos calculados a partir de los datos
  const totalInJob = activeJobApplications.length;
  const totalTalentPool = appState.candidates.filter((c) => c.savedInTalentPool).length;
  const totalJobPostings = appState.jobPostings.length;

  const navGroups: NavGroup[] = [
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
        { id: 'agregar_archivos', label: 'Agregar archivos', icon: <UploadCloud size={18} /> },
        { id: 'mejores_candidatos', label: 'Mejores candidatos', icon: <Award size={18} />, count: totalInJob },
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
  ];

  const handleSelectView = (view: ViewType) => {
    setCurrentView(view);
    if (onCloseMobile) onCloseMobile();
  };

  return (
    <>
      {/* Backdrop para móvil */}
      {isMobileOpen && (
        <div
          onClick={onCloseMobile}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            zIndex: 1020,
          }}
        />
      )}

      <aside
        style={{
          width: collapsed ? '68px' : '260px',
          height: '100vh',
          backgroundColor: 'var(--bg-surface)',
          borderRight: '1px solid var(--border-subtle)',
          display: 'flex',
          flexDirection: 'column',
          position: 'sticky',
          top: 0,
          zIndex: 1030,
          transition: 'width var(--transition-normal)',
          flexShrink: 0,
          overflow: 'hidden',
        }}
        className={isMobileOpen ? 'sidebar-mobile-open' : ''}
      >
        {/* Marca Institucional */}
        <div
          style={{
            height: '64px',
            padding: '0 1rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: collapsed ? 'center' : 'space-between',
            borderBottom: '1px solid var(--border-subtle)',
            backgroundColor: 'var(--bg-surface)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.65rem',
              cursor: 'pointer',
              minWidth: 0,
            }}
            onClick={() => handleSelectView('mejores_candidatos')}
          >
            <div
              style={{
                width: '34px',
                height: '34px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--primary-red)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#FFFFFF',
                flexShrink: 0,
              }}
            >
              <GraduationCap size={20} />
            </div>
            {!collapsed && (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span
                  style={{
                    fontFamily: 'var(--font-heading)',
                    fontSize: '1.05rem',
                    fontWeight: 700,
                    letterSpacing: '-0.3px',
                    color: 'var(--text-primary)',
                  }}
                >
                  TalentAI <span style={{ color: 'var(--primary-red)' }}>· ESAN</span>
                </span>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                  GTHC · Selección
                </span>
              </div>
            )}
          </div>

          {!collapsed && (
            <button
              onClick={() => setCollapsed(true)}
              className="focus-ring hide-on-mobile"
              aria-label="Colapsar menú lateral"
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                padding: '0.3rem',
                borderRadius: 'var(--radius-sm)',
              }}
            >
              <ChevronLeft size={18} />
            </button>
          )}
        </div>

        {/* Lista de navegación con scroll */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '0.75rem 0.5rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.25rem',
          }}
        >
          {navGroups.map((group) => (
            <div key={group.title} style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
              {!collapsed && (
                <div
                  style={{
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    color: 'var(--text-muted)',
                    padding: '0.25rem 0.75rem',
                  }}
                >
                  {group.title}
                </div>
              )}
              {group.items.map((item) => {
                const isActive = currentView === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleSelectView(item.id)}
                    className="focus-ring"
                    title={collapsed ? item.label : undefined}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      padding: collapsed ? '0.65rem 0' : '0.55rem 0.75rem',
                      justifyContent: collapsed ? 'center' : 'flex-start',
                      borderRadius: 'var(--radius-md)',
                      border: 'none',
                      backgroundColor: isActive ? 'var(--primary-red-subtle)' : 'transparent',
                      color: isActive ? 'var(--primary-red)' : 'var(--text-primary)',
                      fontWeight: isActive ? 600 : 500,
                      fontSize: '0.84rem',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all var(--transition-fast)',
                      position: 'relative',
                    }}
                  >
                    {/* Indicador lateral rojo activo */}
                    {isActive && (
                      <span
                        style={{
                          position: 'absolute',
                          left: 0,
                          top: '15%',
                          bottom: '15%',
                          width: '3px',
                          backgroundColor: 'var(--primary-red)',
                          borderRadius: '0 2px 2px 0',
                        }}
                      />
                    )}

                    <span
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        color: isActive ? 'var(--primary-red)' : 'var(--text-secondary)',
                      }}
                    >
                      {item.icon}
                    </span>

                    {!collapsed && (
                      <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {item.label}
                      </span>
                    )}

                    {!collapsed && item.count !== undefined && item.count > 0 && (
                      <span
                        style={{
                          fontSize: '0.72rem',
                          fontWeight: 600,
                          padding: '0.1rem 0.4rem',
                          borderRadius: 'var(--radius-full)',
                          backgroundColor: isActive ? 'var(--primary-red)' : 'var(--bg-muted)',
                          color: isActive ? '#FFFFFF' : 'var(--text-muted)',
                        }}
                      >
                        {item.count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        {/* Botón inferior para expandir si está colapsado */}
        {collapsed && (
          <div
            style={{
              padding: '0.75rem',
              borderTop: '1px solid var(--border-subtle)',
              display: 'flex',
              justifyContent: 'center',
            }}
          >
            <button
              onClick={() => setCollapsed(false)}
              className="focus-ring"
              aria-label="Expandir menú lateral"
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                padding: '0.4rem',
                borderRadius: 'var(--radius-sm)',
              }}
            >
              <ChevronRight size={18} />
            </button>
          </div>
        )}
      </aside>
    </>
  );
}
