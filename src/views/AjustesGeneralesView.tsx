import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext.tsx';
import { Badge } from '../components/common/Badge.tsx';
import { Button } from '../components/common/Button.tsx';
import { Modal } from '../components/common/Modal.tsx';
import {
  Settings,
  Sun,
  Moon,
  Laptop,
  Database,
  RotateCcw,
  Download,
  Mail,
  Cpu,
  FileText,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  HardDrive,
  Activity,
  Lock,
  Sparkles,
  KeyRound,
} from 'lucide-react';

type SettingsTab = 'apariencia' | 'almacenamiento' | 'conectores' | 'gobernanza';

export function AjustesGeneralesView() {
  const {
    appState,
    setThemePreference,
    setReducedMotion,
    resetToInitialState,
    showToast,
  } = useApp();

  const [activeTab, setActiveTab] = useState<SettingsTab>('apariencia');
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);

  // Telemetría en vivo del almacenamiento local
  const telemetry = useMemo(() => {
    try {
      const raw = localStorage.getItem('GTH_ESAN_STATE_V1') || '';
      const bytes = new Blob([raw]).size;
      const kb = (bytes / 1024).toFixed(1);
      // Cuota de 5MB estándar de LocalStorage
      const pctQuota = Math.min(100, Math.max(0.5, (bytes / (5 * 1024 * 1024)) * 100)).toFixed(2);

      const countConvocatorias = appState.jobPostings?.length || 0;
      const countCandidatos = appState.candidates?.length || 0;
      const countAplicaciones = appState.applications?.length || 0;
      const countDecisiones = appState.decisionLogs?.length || 0;

      return {
        bytes,
        kb,
        pctQuota,
        countConvocatorias,
        countCandidatos,
        countAplicaciones,
        countDecisiones,
      };
    } catch {
      return {
        bytes: 0,
        kb: '0.0',
        pctQuota: '0.1',
        countConvocatorias: 0,
        countCandidatos: 0,
        countAplicaciones: 0,
        countDecisiones: 0,
      };
    }
  }, [appState]);

  // Exportar respaldo JSON con formato enriquecido
  const handleExportBackup = () => {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(appState, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `GTH_ESAN_BACKUP_${timestamp}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showToast('Copia de respaldo JSON institucional generada y descargada.', 'success');
  };

  const handleConfirmReset = () => {
    resetToInitialState();
    setIsResetModalOpen(false);
  };

  const tabs: { id: SettingsTab; label: string; icon: React.ReactNode; badgeText?: string }[] = [
    { id: 'apariencia', label: 'Apariencia & Accesibilidad', icon: <Sun size={15} /> },
    { id: 'almacenamiento', label: 'Persistencia & Respaldo', icon: <Database size={15} />, badgeText: `${telemetry.kb} KB` },
    { id: 'conectores', label: 'Conectores & Servicios', icon: <Cpu size={15} />, badgeText: '3 Activos' },
    { id: 'gobernanza', label: 'Gobernanza & Sistema', icon: <ShieldCheck size={15} /> },
  ];

  return (
    <div style={{ maxWidth: '1080px', margin: '0 auto', width: '100%', paddingBottom: '2.5rem' }}>
      {/* ─────────────────────────────────────────────────────────────
          1. CABECERA INSTITUCIONAL Y BARRA DE TELEMETRÍA EN VIVO
         ───────────────────────────────────────────────────────────── */}
      <div
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-subtle)',
          boxShadow: 'var(--shadow-sm)',
          padding: '1.25rem 1.5rem',
          marginBottom: '1.25rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--primary-red-subtle)',
                color: 'var(--primary-red)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 0 1px var(--primary-red-border)',
                flexShrink: 0,
              }}
            >
              <Settings size={22} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                <h1
                  style={{
                    fontFamily: 'var(--font-heading)',
                    fontSize: '1.35rem',
                    fontWeight: 700,
                    letterSpacing: '-0.02em',
                    color: 'var(--text-primary)',
                  }}
                >
                  Configuración y Ajustes del Sistema
                </h1>
                <Badge variant="primary" size="sm">
                  ESAN GTHC · v1.4
                </Badge>
              </div>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
                Gobernanza de parámetros, telemetría de almacenamiento, ergonomía visual y diagnóstico de conectores.
              </p>
            </div>
          </div>

          {/* Quick status pill */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              backgroundColor: 'var(--bg-base)',
              padding: '0.4rem 0.75rem',
              borderRadius: 'var(--radius-full)',
              border: '1px solid var(--border-subtle)',
              fontSize: '0.75rem',
              color: 'var(--text-secondary)',
            }}
          >
            <span
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: 'var(--status-verified-text)',
                boxShadow: '0 0 0 2px var(--status-verified-border)',
                display: 'inline-block',
              }}
            />
            <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Aislamiento 100% Local</span>
            <span style={{ color: 'var(--text-muted)' }}>·</span>
            <span>Zero Cloud Leak</span>
          </div>
        </div>

        {/* Barra de telemetría compacta en vivo */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '0.75rem',
            paddingTop: '0.9rem',
            borderTop: '1px solid var(--border-subtle)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <HardDrive size={15} style={{ color: 'var(--primary-red)' }} />
            <div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>
                Persistencia en Cliente
              </div>
              <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>
                {telemetry.kb} KB <span style={{ fontSize: '0.75rem', fontWeight: 400, color: 'var(--text-secondary)' }}>({telemetry.pctQuota}% de cuota)</span>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>
                Entidades Gestionadas
              </div>
              <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>
                {telemetry.countConvocatorias} <span style={{ fontSize: '0.75rem', fontWeight: 400, color: 'var(--text-secondary)' }}>convocatorias</span> · {telemetry.countCandidatos} <span style={{ fontSize: '0.75rem', fontWeight: 400, color: 'var(--text-secondary)' }}>postulantes</span>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Lock size={15} style={{ color: 'var(--status-verified-text)' }} />
            <div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>
                Esquema de Estado
              </div>
              <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                GTH_ESAN_STATE_V1
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          2. NAVEGACIÓN POR PESTAÑAS (DOMAIN TABS)
         ───────────────────────────────────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          gap: '0.35rem',
          borderBottom: '1px solid var(--border-default)',
          marginBottom: '1.5rem',
          overflowX: 'auto',
          paddingBottom: '1px',
        }}
        role="tablist"
        aria-label="Secciones de ajustes"
      >
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              role="tab"
              aria-selected={isActive}
              onClick={() => setActiveTab(tab.id)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.65rem 1rem',
                fontSize: '0.84rem',
                fontWeight: isActive ? 600 : 500,
                color: isActive ? 'var(--primary-red)' : 'var(--text-secondary)',
                backgroundColor: isActive ? 'var(--bg-surface)' : 'transparent',
                borderTop: '1px solid',
                borderLeft: '1px solid',
                borderRight: '1px solid',
                borderBottom: isActive ? '2px solid var(--primary-red)' : '2px solid transparent',
                borderColor: isActive ? 'var(--border-subtle) var(--border-subtle) var(--primary-red)' : 'transparent',
                borderTopLeftRadius: 'var(--radius-md)',
                borderTopRightRadius: 'var(--radius-md)',
                cursor: 'pointer',
                transition: 'all var(--transition-fast)',
                whiteSpace: 'nowrap',
                position: 'relative',
                marginBottom: '-1px',
              }}
            >
              {tab.icon}
              <span>{tab.label}</span>
              {tab.badgeText && (
                <span
                  style={{
                    fontSize: '0.6875rem',
                    fontWeight: 600,
                    padding: '0.1rem 0.4rem',
                    borderRadius: 'var(--radius-full)',
                    backgroundColor: isActive ? 'var(--primary-red-subtle)' : 'var(--bg-muted)',
                    color: isActive ? 'var(--primary-red)' : 'var(--text-muted)',
                  }}
                >
                  {tab.badgeText}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ─────────────────────────────────────────────────────────────
          3. CONTENIDO DE LAS PESTAÑAS
         ───────────────────────────────────────────────────────────── */}

      {/* PESTAÑA 1: APARIENCIA & ACCESIBILIDAD */}
      {activeTab === 'apariencia' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Selector de Tema con Mini-Specimens Reales */}
          <div
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border-default)',
              boxShadow: 'var(--shadow-sm)',
              padding: '1.5rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
              <h2 style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                Modo Visual y Paleta de Interfaz
              </h2>
              <Badge variant="neutral" size="sm">
                Sincronización Inmediata
              </Badge>
            </div>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
              Elige la temperatura de superficie óptima. El modo claro emplea tonalidades lino y papel oficial ESAN; el modo oscuro reduce la fatiga visual en sesiones nocturnas.
            </p>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                gap: '1rem',
              }}
            >
              {[
                {
                  id: 'light',
                  title: 'Modo Claro',
                  desc: 'Superficies lino cálido con acento Carmesí ESAN',
                  icon: <Sun size={16} />,
                  accent: '#B71936',
                  bgOuter: '#F6F3EF',
                  bgCard: '#FFFFFF',
                  bgSidebar: '#ECE7E1',
                  border: '#DDD6CC',
                },
                {
                  id: 'dark',
                  title: 'Modo Oscuro',
                  desc: 'Carbón pizarra de alto contraste para baja luminosidad',
                  icon: <Moon size={16} />,
                  accent: '#D22646',
                  bgOuter: '#14171C',
                  bgCard: '#252B35',
                  bgSidebar: '#1E232B',
                  border: '#394252',
                },
                {
                  id: 'system',
                  title: 'Sincronizar con Sistema',
                  desc: 'Cambia dinámicamente con la preferencia del SO',
                  icon: <Laptop size={16} />,
                  accent: '#B71936',
                  bgOuter: 'linear-gradient(135deg, #F6F3EF 50%, #14171C 50%)',
                  bgCard: 'transparent',
                  bgSidebar: 'transparent',
                  border: 'var(--border-default)',
                },
              ].map((themeOpt) => {
                const isSelected = appState.theme === themeOpt.id;
                return (
                  <button
                    key={themeOpt.id}
                    type="button"
                    onClick={() => setThemePreference(themeOpt.id as any)}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      textAlign: 'left',
                      padding: '1rem',
                      borderRadius: 'var(--radius-md)',
                      border: `2px solid ${isSelected ? 'var(--primary-red)' : 'var(--border-subtle)'}`,
                      backgroundColor: isSelected ? 'var(--primary-red-subtle)' : 'var(--bg-base)',
                      cursor: 'pointer',
                      transition: 'all var(--transition-fast)',
                      position: 'relative',
                    }}
                  >
                    {/* Mini Specimen Visual de la Interfaz */}
                    <div
                      style={{
                        width: '100%',
                        height: '76px',
                        borderRadius: 'var(--radius-sm)',
                        border: `1px solid ${themeOpt.border}`,
                        background: themeOpt.bgOuter,
                        marginBottom: '0.85rem',
                        overflow: 'hidden',
                        display: 'flex',
                        boxShadow: 'var(--shadow-sm)',
                        position: 'relative',
                      }}
                    >
                      {themeOpt.id !== 'system' ? (
                        <>
                          {/* Mini Sidebar */}
                          <div
                            style={{
                              width: '26%',
                              backgroundColor: themeOpt.bgSidebar,
                              borderRight: `1px solid ${themeOpt.border}`,
                              padding: '6px 4px',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '4px',
                            }}
                          >
                            <div style={{ width: '14px', height: '4px', borderRadius: '2px', backgroundColor: themeOpt.accent }} />
                            <div style={{ width: '80%', height: '3px', borderRadius: '1.5px', backgroundColor: themeOpt.border }} />
                            <div style={{ width: '60%', height: '3px', borderRadius: '1.5px', backgroundColor: themeOpt.border }} />
                          </div>
                          {/* Mini Content Area */}
                          <div style={{ flex: 1, padding: '6px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <div style={{ width: '50%', height: '5px', borderRadius: '2px', backgroundColor: themeOpt.accent, opacity: 0.85 }} />
                            <div
                              style={{
                                flex: 1,
                                backgroundColor: themeOpt.bgCard,
                                borderRadius: '3px',
                                border: `1px solid ${themeOpt.border}`,
                                padding: '4px',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '3px',
                              }}
                            >
                              <div style={{ width: '70%', height: '3px', borderRadius: '1px', backgroundColor: themeOpt.border }} />
                              <div style={{ width: '40%', height: '3px', borderRadius: '1px', backgroundColor: themeOpt.border }} />
                            </div>
                          </div>
                        </>
                      ) : (
                        <div
                          style={{
                            width: '100%',
                            height: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            color: 'var(--text-primary)',
                            backgroundColor: 'var(--bg-surface)',
                            backdropFilter: 'blur(4px)',
                          }}
                        >
                          <Laptop size={18} style={{ marginRight: '6px', color: 'var(--primary-red)' }} />
                          Modo Automático
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontWeight: 600, fontSize: '0.875rem', color: isSelected ? 'var(--primary-red)' : 'var(--text-primary)' }}>
                        {themeOpt.icon}
                        <span>{themeOpt.title}</span>
                      </div>
                      {isSelected && (
                        <span style={{ color: 'var(--primary-red)', display: 'flex', alignItems: 'center' }}>
                          <CheckCircle2 size={16} />
                        </span>
                      )}
                    </div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.35 }}>
                      {themeOpt.desc}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Accesibilidad & Reducción de Movimiento */}
          <div
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border-default)',
              boxShadow: 'var(--shadow-sm)',
              padding: '1.25rem 1.5rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '1rem',
              flexWrap: 'wrap',
            }}
          >
            <div style={{ maxWidth: '680px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                <span style={{ fontSize: '0.92rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  Reducción de Movimiento y Animaciones (WCAG 2.2)
                </span>
                <Badge variant={appState.reducedMotion ? 'success' : 'neutral'} size="sm">
                  {appState.reducedMotion ? 'Activado' : 'Estándar'}
                </Badge>
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
                Desactiva las transiciones elásticas en paneles laterales (drawer), modales y desvanecimientos. Recomendado para usuarios con sensibilidad vestibular o entornos con terminales de escritorio remoto.
              </p>
            </div>

            {/* Switch estilizado táctil */}
            <button
              type="button"
              role="switch"
              aria-checked={appState.reducedMotion}
              onClick={() => setReducedMotion(!appState.reducedMotion)}
              style={{
                width: '48px',
                height: '26px',
                borderRadius: '13px',
                backgroundColor: appState.reducedMotion ? 'var(--primary-red)' : 'var(--border-strong)',
                border: 'none',
                cursor: 'pointer',
                position: 'relative',
                transition: 'background-color var(--transition-fast)',
                flexShrink: 0,
                outline: 'none',
                padding: '2px',
              }}
            >
              <span
                style={{
                  display: 'block',
                  width: '22px',
                  height: '22px',
                  borderRadius: '50%',
                  backgroundColor: '#FFFFFF',
                  transform: appState.reducedMotion ? 'translateX(22px)' : 'translateX(0px)',
                  transition: 'transform var(--transition-fast)',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.25)',
                }}
              />
            </button>
          </div>
        </div>
      )}

      {/* PESTAÑA 2: ALMACENAMIENTO & RESPALDO */}
      {activeTab === 'almacenamiento' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Monitor de Memoria y Resumen */}
          <div
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border-default)',
              boxShadow: 'var(--shadow-sm)',
              padding: '1.5rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <HardDrive size={18} style={{ color: 'var(--primary-red)' }} />
                <h2 style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  Monitor de Cuota y Persistencia Local
                </h2>
              </div>
              <Badge variant="purple" size="sm">
                Versión: GTH_ESAN_STATE_V1
              </Badge>
            </div>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
              Los perfiles de puestos, candidatos cargados mediante OCR/CSV, notas confidenciales de evaluación y calibraciones de syllabus se almacenan de manera persistente en este navegador con aislamiento local.
            </p>

            {/* Barra de Progreso de Almacenamiento */}
            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: '0.4rem', color: 'var(--text-secondary)' }}>
                <span>Cuota de almacenamiento en navegador (límite estimado: 5 MB)</span>
                <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>
                  {telemetry.kb} KB / 5,120 KB ({telemetry.pctQuota}%)
                </span>
              </div>
              <div
                style={{
                  width: '100%',
                  height: '8px',
                  backgroundColor: 'var(--bg-base)',
                  borderRadius: '4px',
                  overflow: 'hidden',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                <div
                  style={{
                    width: `${Math.max(1, parseFloat(telemetry.pctQuota))}%`,
                    height: '100%',
                    backgroundColor: 'var(--primary-red)',
                    borderRadius: '4px',
                    transition: 'width 0.3s ease',
                  }}
                />
              </div>
            </div>

            {/* Desglose de Entidades en memoria */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                gap: '0.75rem',
                marginBottom: '1.5rem',
              }}
            >
              <div style={{ padding: '0.85rem', backgroundColor: 'var(--bg-base)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Convocatorias</span>
                <div style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>
                  {telemetry.countConvocatorias}
                </div>
              </div>

              <div style={{ padding: '0.85rem', backgroundColor: 'var(--bg-base)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Postulantes Registrados</span>
                <div style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>
                  {telemetry.countCandidatos}
                </div>
              </div>

              <div style={{ padding: '0.85rem', backgroundColor: 'var(--bg-base)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Evaluaciones Activas</span>
                <div style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>
                  {telemetry.countAplicaciones}
                </div>
              </div>

              <div style={{ padding: '0.85rem', backgroundColor: 'var(--bg-base)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Eventos de Decisión</span>
                <div style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>
                  {telemetry.countDecisiones}
                </div>
              </div>
            </div>

            {/* Acciones de Respaldo */}
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '0.75rem',
                alignItems: 'center',
                paddingTop: '1.25rem',
                borderTop: '1px solid var(--border-subtle)',
              }}
            >
              <Button
                variant="primary"
                size="md"
                icon={<Download size={16} />}
                onClick={handleExportBackup}
              >
                Descargar Respaldo Estructurado (.JSON)
              </Button>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Formato con codificación segura UTF-8 estándar para auditoría académica.
              </span>
            </div>
          </div>

          {/* Zona Peligrosa / Restablecimiento */}
          <div
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--status-failed-border)',
              boxShadow: 'var(--shadow-sm)',
              padding: '1.25rem 1.5rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '1rem',
              flexWrap: 'wrap',
            }}
          >
            <div style={{ maxWidth: '620px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
                <AlertTriangle size={17} style={{ color: 'var(--status-failed-text)' }} />
                <span style={{ fontSize: '0.92rem', fontWeight: 600, color: 'var(--status-failed-text)' }}>
                  Restablecer Datos de Fábrica
                </span>
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
                Borra los datos de selección guardados en este navegador. No elimina los registros almacenados en Supabase.
              </p>
            </div>

            <Button
              variant="danger"
              size="md"
              icon={<RotateCcw size={15} />}
              onClick={() => setIsResetModalOpen(true)}
            >
              Borrar datos locales
            </Button>
          </div>
        </div>
      )}

      {/* PESTAÑA 3: CONECTORES & SERVICIOS */}
      {activeTab === 'conectores' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border-default)',
              boxShadow: 'var(--shadow-sm)',
              padding: '1.5rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <h2 style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                Diagnóstico de Conectores y Pasarelas Institucionales
              </h2>
              <Badge variant="success" size="sm" icon={<CheckCircle2 size={12} />}>
                Todos los Servicios Saludables
              </Badge>
            </div>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
              Supervisión de protocolos de integración para el ecosistema ESAN Graduate School of Business.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {/* Conector 1: Google Workspace */}
              <div
                style={{
                  padding: '1.1rem 1.25rem',
                  backgroundColor: 'var(--bg-base)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-subtle)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.65rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                    <div
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: 'var(--radius-sm)',
                        backgroundColor: 'var(--primary-red-subtle)',
                        color: 'var(--primary-red)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Mail size={16} />
                    </div>
                    <div>
                      <div style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                        Google Workspace Institucional (Gmail & Calendar ESAN)
                      </div>
                      <div style={{ fontSize: '0.73rem', color: 'var(--text-muted)' }}>
                        Dominio autorizado: <code>@esan.edu.pe</code> · Protocolo: OAuth2 PKCE
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Badge variant="warning" size="sm">
                      Modo Simulado Local
                    </Badge>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>
                      Latencia: &lt;1 ms
                    </span>
                  </div>
                </div>
                <p style={{ fontSize: '0.79rem', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
                  Los borradores de citación a entrevistas y notificaciones de avance se generan en memoria. En producción, la sincronización se autentica mediante single-sign-on (SSO) institucional sin exponer credenciales a servidores externos.
                </p>
              </div>

              {/* Conector 2: Motor OCR */}
              <div
                style={{
                  padding: '1.1rem 1.25rem',
                  backgroundColor: 'var(--bg-base)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-subtle)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.65rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                    <div
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: 'var(--radius-sm)',
                        backgroundColor: 'rgba(197, 155, 39, 0.12)',
                        color: '#92400E',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <FileText size={16} />
                    </div>
                    <div>
                      <div style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                        Motor de Ingesta OCR y Normalización Curricular
                      </div>
                      <div style={{ fontSize: '0.73rem', color: 'var(--text-muted)' }}>
                        Parsing tabular de grados académicos, años de experiencia y certificaciones
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Badge variant="info" size="sm">
                      Importación de postulantes
                    </Badge>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>
                      Capacidad: 500 CVs
                    </span>
                  </div>
                </div>
                <p style={{ fontSize: '0.79rem', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
                  Admite archivos CSV estructurados y valida los campos de postulantes antes de incorporarlos a una convocatoria.
                </p>
              </div>

              {/* Conector 3: IA / LLM Scoring */}
              <div
                style={{
                  padding: '1.1rem 1.25rem',
                  backgroundColor: 'var(--bg-base)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-subtle)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.65rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                    <div
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: 'var(--radius-sm)',
                        backgroundColor: 'rgba(109, 40, 217, 0.12)',
                        color: 'var(--method-llm-color)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Cpu size={16} />
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                        <span style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                          Evaluación LLM / Ponderación Curricular
                        </span>
                        <Sparkles size={13} style={{ color: 'var(--method-llm-color)' }} />
                      </div>
                      <div style={{ fontSize: '0.73rem', color: 'var(--text-muted)' }}>
                        Evalúa perfiles profesionales con Gemini cuando el equipo autoriza el envío de los datos depurados
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Badge variant="purple" size="sm">
                      Gemini · autorización previa
                    </Badge>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>
                      Privacidad: 100%
                    </span>
                  </div>
                </div>
                <p style={{ fontSize: '0.79rem', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
                  Se envían a Gemini los campos profesionales depurados que el equipo revisa y autoriza. La evaluación sirve como apoyo; el equipo mantiene la revisión de requisitos y las decisiones.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PESTAÑA 4: GOBERNANZA & SISTEMA */}
      {activeTab === 'gobernanza' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border-default)',
              boxShadow: 'var(--shadow-sm)',
              padding: '1.5rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.5rem' }}>
              <ShieldCheck size={20} style={{ color: 'var(--primary-red)' }} />
              <h2 style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                Ficha Técnica y Gobernanza de Datos
              </h2>
            </div>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
              Especificaciones formales del entorno de ejecución institucional y políticas de confidencialidad para procesos de selección académica y administrativa en ESAN.
            </p>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: '1rem',
                marginBottom: '1.5rem',
              }}
            >
              <div style={{ padding: '1rem', backgroundColor: 'var(--bg-base)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: '0.73rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600, marginBottom: '0.35rem' }}>
                  Institución Patrocinadora
                </div>
                <div style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  Universidad ESAN
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
                  Graduate School of Business · Dirección de Gestión del Talento Humano y Colaboradores (GTHC)
                </div>
              </div>

              <div style={{ padding: '1rem', backgroundColor: 'var(--bg-base)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: '0.73rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600, marginBottom: '0.35rem' }}>
                  Cumplimiento Normativo
                </div>
                <div style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--status-verified-text)' }}>
                  Ley N° 29733 (Perú)
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
                  Ley de Protección de Datos Personales · Tratamiento de currículos en memoria sin almacenamiento en nubes públicas no autorizadas.
                </div>
              </div>

              <div style={{ padding: '1rem', backgroundColor: 'var(--bg-base)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: '0.73rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600, marginBottom: '0.35rem' }}>
                  Pila Tecnológica
                </div>
                <div style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  React 19 · TypeScript 5.7 · Vite 6
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
                  Lucide Icons · Tokens de Diseño Propietarios ESAN · Sin dependencias de UI bloqueantes
                </div>
              </div>

              <div style={{ padding: '1rem', backgroundColor: 'var(--bg-base)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: '0.73rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600, marginBottom: '0.35rem' }}>
                  Integridad de Archivos
                </div>
                <div style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  UTF-8 con BOM & RFC 4180
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
                  Compatibilidad bidireccional garantizada con Microsoft Excel (Español/Latinoamérica) y delimitadores estándar.
                </div>
              </div>
            </div>

            <div
              style={{
                padding: '0.85rem 1rem',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'var(--primary-red-subtle)',
                border: '1px solid var(--primary-red-border)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.65rem',
                fontSize: '0.78rem',
                color: 'var(--primary-red)',
              }}
            >
              <KeyRound size={15} />
              <span>
                Versión principal: <strong>main · TalentAI Interface v1.4</strong>. Todos los derechos reservados © {new Date().getFullYear()} Universidad ESAN.
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          4. MODAL DE CONFIRMACIÓN DE RESTABLECIMIENTO
         ───────────────────────────────────────────────────────────── */}
      <Modal
        isOpen={isResetModalOpen}
        onClose={() => setIsResetModalOpen(false)}
        title="¿Restablecer datos de fábrica?"
        maxWidth="480px"
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', width: '100%' }}>
            <Button variant="ghost" onClick={() => setIsResetModalOpen(false)}>
              Cancelar
            </Button>
            <Button variant="danger" icon={<RotateCcw size={14} />} onClick={handleConfirmReset}>
              Confirmar y Restablecer
            </Button>
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              color: 'var(--status-failed-text)',
              backgroundColor: 'var(--status-failed-bg)',
              padding: '0.75rem 1rem',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--status-failed-border)',
            }}
          >
            <AlertTriangle size={22} style={{ flexShrink: 0 }} />
            <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>
              Acción destructiva de datos locales
            </div>
          </div>
          <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            Esta operación borrará del navegador las convocatorias manuales, los postulantes importados, las evaluaciones y las notas locales. Los avisos y postulantes de Bumeran guardados en Supabase no se eliminarán.
          </p>
        </div>
      </Modal>
    </div>
  );
}

