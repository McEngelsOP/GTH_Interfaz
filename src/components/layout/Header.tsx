import React, { useState } from 'react';
import { supabase } from '../../services/supabase.ts';
import { Button } from '../common/Button.tsx';
import { IS_STAGE_ONE } from '../../config/edition.ts';
import { useApp } from '../../context/AppContext.tsx';
import {
  Briefcase,
  ChevronDown,
  Moon,
  Sun,
  Laptop,
  Sparkles,
  Menu,
  LogOut,
} from 'lucide-react';
import { Badge } from '../common/Badge.tsx';

interface HeaderProps {
  onToggleMobileNav: () => void;
}

export function Header({ onToggleMobileNav }: HeaderProps) {
  const {
    appState,
    activeJob,
    setActiveJobPostingId,
    setCurrentView,
    setTheme,
    toggleAssistant,
    showToast,
  } = useApp();

  const [signingOut, setSigningOut] = useState(false);
  const signOut = async () => {
    if (!supabase) return;
    setSigningOut(true);
    try {
      const { error } = await supabase.auth.signOut({ scope: 'local' });
      if (error) showToast('No se pudo cerrar la sesión. Intenta nuevamente.', 'warning');
    } catch { showToast('No se pudo cerrar la sesión. Intenta nuevamente.', 'warning'); }
    finally { setSigningOut(false); }
  };

  const handleNextTheme = () => {
    if (appState.theme === 'light') setTheme('dark');
    else if (appState.theme === 'dark') setTheme('system');
    else setTheme('light');
  };

  return (
    <header
      style={{
        height: '64px',
        backgroundColor: 'var(--header-bg)',
        backdropFilter: 'blur(12px) saturate(160%)',
        WebkitBackdropFilter: 'blur(12px) saturate(160%)',
        borderBottom: '1px solid var(--border-subtle)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 1.25rem',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        boxShadow: 'var(--shadow-sm)',
        transition: 'background-color var(--transition-normal), border-color var(--transition-normal)',
      }}
    >
      {/* Lado izquierdo: Botón móvil + Selector de Convocatoria Activa */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, minWidth: 0 }}>
        <button
          onClick={onToggleMobileNav}
          className="focus-ring mobile-only"
          aria-label="Abrir menú de navegación"
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--text-primary)',
            cursor: 'pointer',
            padding: '0.4rem',
            borderRadius: 'var(--radius-sm)',
            display: 'none',
          }}
        >
          <Menu size={22} />
        </button>

        {/* Selector rápido de Puesto Activo */}
        {IS_STAGE_ONE ? (
          <select
            aria-label="Convocatoria activa"
            disabled={!appState.jobPostings.length}
            value={appState.activeJobPostingId}
            onChange={(event) => setActiveJobPostingId(event.target.value)}
            style={{ maxWidth: '520px', width: '100%', minWidth: 0, padding: '0.6rem',
              color: 'var(--text-primary)', backgroundColor: 'var(--bg-base)',
              border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)' }}
          >
            {!appState.jobPostings.length && <option value="">Sin convocatorias</option>}
            {appState.jobPostings.map((job) => (
              <option key={job.id} value={job.id}>{job.title} · {job.code}</option>
            ))}
          </select>
        ) : (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
            padding: '0.4rem 0.75rem',
            backgroundColor: 'var(--bg-base)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-subtle)',
            maxWidth: '520px',
            minWidth: 0,
            cursor: 'pointer',
          }}
          onClick={() => setCurrentView('convocatorias')}
          title="Cambiar convocatoria activa"
        >
          <Briefcase size={17} style={{ color: 'var(--primary-red)', flexShrink: 0 }} />
          <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span
                style={{
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {activeJob?.title || 'Seleccionar convocatoria'}
              </span>
              {activeJob && (
                <span className="hide-on-mobile"><Badge size="sm" variant="primary">
                  {activeJob.code}
                </Badge></span>
              )}
            </div>
            {activeJob && (
              <span
                style={{
                  fontSize: '0.725rem',
                  color: 'var(--text-muted)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {activeJob.department} · {activeJob.period}
              </span>
            )}
          </div>
          <ChevronDown size={14} style={{ color: 'var(--text-muted)', marginLeft: 'auto', flexShrink: 0 }} />
        </div>
        )}
      </div>

      {/* Lado derecho: Asistente GTH + Selector de Tema + Perfil GTHC */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        {/* Botón Asistente GTH */}
        <button
          onClick={() => toggleAssistant()}
          aria-label="Asistente GTH"
          className="focus-ring"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.45rem',
            padding: '0.45rem 0.85rem',
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-default)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--text-primary)',
            fontSize: '0.8125rem',
            fontWeight: 500,
            cursor: 'pointer',
            transition: 'all var(--transition-fast)',
          }}
          title="Abrir Asistente GTH · Google Gemini"
        >
          <Sparkles size={16} style={{ color: 'var(--primary-red)' }} />
          <span className="hide-on-mobile">Asistente GTH</span>
        </button>

        {/* Alternador de Tema */}
        <button
          onClick={handleNextTheme}
          className="focus-ring"
          aria-label="Cambiar tema de apariencia"
          title={`Tema actual: ${appState.theme}. Clic para cambiar.`}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '38px',
            height: '38px',
            backgroundColor: 'var(--bg-base)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            transition: 'all var(--transition-fast)',
          }}
        >
          {appState.theme === 'light' ? (
            <Sun size={17} style={{ color: '#D97706' }} />
          ) : appState.theme === 'dark' ? (
            <Moon size={17} style={{ color: '#A78BFA' }} />
          ) : (
            <Laptop size={17} />
          )}
        </button>

        {supabase && <Button variant="ghost" size="sm" aria-label="Cerrar sesión" title="Cerrar sesión" disabled={signingOut} onClick={signOut} icon={<LogOut size={17} />} />}
        {/* Perfil Único GTHC (mandatario Sección 2: Equipo de GTHC) */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.65rem',
            padding: '0.35rem 0.65rem',
            borderRadius: 'var(--radius-md)',
            borderLeft: '1px solid var(--border-subtle)',
          }}
        >
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: 'var(--radius-full)',
              backgroundColor: 'var(--primary-red)',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: '0.8125rem',
              letterSpacing: '0.5px',
            }}
          >
            ES
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }} className="hide-on-mobile">
            <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              Equipo de GTHC
            </span>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
              Universidad ESAN
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}

