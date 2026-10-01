import React, { useState } from 'react';
import { useApp } from '../context/AppContext.tsx';
import { Badge } from '../components/common/Badge.tsx';
import { Button } from '../components/common/Button.tsx';
import { Modal } from '../components/common/Modal.tsx';
import {
  Settings,
  Sun,
  Moon,
  Laptop,
  Eye,
  Database,
  RotateCcw,
  Download,
  Upload,
  CloudOff,
  Mail,
  Calendar,
  Cpu,
  FileText,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';

export function AjustesGeneralesView() {
  const {
    appState,
    setThemePreference,
    setReducedMotion,
    resetToInitialState,
    showToast,
  } = useApp();

  const [isResetModalOpen, setIsResetModalOpen] = useState(false);

  // Descarga del estado completo en JSON
  const handleExportBackup = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(appState, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `GTH_ESAN_BACKUP_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showToast('Copia de respaldo JSON generada exitosamente.', 'success');
  };

  const handleConfirmReset = () => {
    resetToInitialState();
    setIsResetModalOpen(false);
  };

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', width: '100%' }}>
      {/* Cabecera */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
          backgroundColor: 'var(--bg-surface)',
          padding: '1.25rem',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-subtle)',
          boxShadow: 'var(--shadow-sm)',
          marginBottom: '1.5rem',
        }}
      >
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
            }}
          >
            <Settings size={22} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              Configuración y Ajustes del Sistema
            </h1>
            <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
              Personalización de interfaz, accesibilidad, persistencia local y estado de conectores institucionales.
            </p>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {/* 1. Preferencias Visuales y Accesibilidad */}
        <div
          style={{
            backgroundColor: 'var(--bg-surface)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border-default)',
            boxShadow: 'var(--shadow-sm)',
            padding: '1.5rem',
          }}
        >
          <h2 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.35rem' }}>
            Tema Visual y Pantalla
          </h2>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
            Selecciona el tema que mejor se adapte a tu entorno de trabajo. Los cambios se guardan localmente.
          </p>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: '1rem',
              marginBottom: '1.5rem',
            }}
          >
            {[
              { id: 'light', label: 'Modo Claro', icon: <Sun size={18} />, desc: 'Superficies cálidas ESAN' },
              { id: 'dark', label: 'Modo Oscuro', icon: <Moon size={18} />, desc: 'Superficies carbón y alto contraste' },
              { id: 'system', label: 'Según el Equipo', icon: <Laptop size={18} />, desc: 'Sincronizar con el sistema operativo' },
            ].map((t) => {
              const isSelected = appState.theme === t.id;
              return (
                <div
                  key={t.id}
                  onClick={() => setThemePreference(t.id as any)}
                  style={{
                    padding: '1rem',
                    borderRadius: 'var(--radius-md)',
                    border: `2px solid ${isSelected ? 'var(--primary-red)' : 'var(--border-default)'}`,
                    backgroundColor: isSelected ? 'var(--primary-red-subtle)' : 'var(--bg-base)',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.35rem',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: isSelected ? 'var(--primary-red)' : 'var(--text-primary)', fontWeight: 600 }}>
                      {t.icon}
                      <span>{t.label}</span>
                    </div>
                    {isSelected && <CheckCircle2 size={16} style={{ color: 'var(--primary-red)' }} />}
                  </div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{t.desc}</span>
                </div>
              );
            })}
          </div>

          <div
            style={{
              paddingTop: '1.25rem',
              borderTop: '1px solid var(--border-subtle)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                Reducción de Movimiento y Animaciones
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                Minimiza las transiciones de paneles y efectos visuales para mayor comodidad o accesibilidad.
              </div>
            </div>

            <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', position: 'relative' }}>
              <input
                type="checkbox"
                checked={appState.reducedMotion}
                onChange={(e) => setReducedMotion(e.target.checked)}
                style={{ width: '18px', height: '18px', accentColor: 'var(--primary-red)' }}
              />
            </label>
          </div>
        </div>

        {/* 2. Persistencia y Respaldo de Datos */}
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
            <h2 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              Persistencia Local y Respaldo
            </h2>
            <Badge variant="purple" size="sm" icon={<Database size={12} />}>
              GTH_ESAN_STATE_V1
            </Badge>
          </div>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
            Los cambios, notas, postulantes generados y decisiones se almacenan en el navegador de manera persistente
            mediante almacenamiento estructurado versionado.
          </p>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
            <Button
              variant="secondary"
              size="md"
              icon={<Download size={16} />}
              onClick={handleExportBackup}
            >
              Exportar Copia de Seguridad (.JSON)
            </Button>

            <Button
              variant="danger"
              size="md"
              icon={<RotateCcw size={16} />}
              onClick={() => setIsResetModalOpen(true)}
            >
              Restablecer Datos de Demostración
            </Button>
          </div>
        </div>

        {/* 3. Conectores Institucionales y Servicios Externos (Secciones 22 y 25) */}
        <div
          style={{
            backgroundColor: 'var(--bg-surface)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border-default)',
            boxShadow: 'var(--shadow-sm)',
            padding: '1.5rem',
          }}
        >
          <h2 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.35rem' }}>
            Estado de Integraciones Institucionales
          </h2>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
            Diagnóstico transparente de servicios externos requeridos para la operación de producción.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
            {/* Google Workspace */}
            <div
              style={{
                padding: '1rem',
                backgroundColor: 'var(--bg-base)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-subtle)',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Mail size={16} style={{ color: 'var(--primary-red)' }} />
                  <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                    Google Workspace (Gmail & Calendar)
                  </span>
                </div>
                <Badge variant="warning" size="sm">
                  Simulado Local
                </Badge>
              </div>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
                Los borradores de correo y fechas de entrevista se generan localmente en memoria. La sincronización
                directa con Google Workspace requerirá autorización OAuth2 institucional en ESAN.
              </p>
            </div>

            {/* OCR Engine */}
            <div
              style={{
                padding: '1rem',
                backgroundColor: 'var(--bg-base)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-subtle)',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <FileText size={16} style={{ color: 'var(--accent-gold)' }} />
                  <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                    Motor OCR y Análisis Curricular
                  </span>
                </div>
                <Badge variant="info" size="sm">
                  Modo Prototipo
                </Badge>
              </div>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
                La importación admite archivos CSV estructurados con validación instantánea y generación de lotes
                sintéticos de prueba (25, 100 y 500 registros).
              </p>
            </div>

            {/* IA Server */}
            <div
              style={{
                padding: '1rem',
                backgroundColor: 'var(--bg-base)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-subtle)',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Cpu size={16} style={{ color: 'var(--method-llm-color)' }} />
                  <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                    Servicio de Inferencia ML / LLM
                  </span>
                </div>
                <Badge variant="purple" size="sm">
                  Offline Determinista
                </Badge>
              </div>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
                Puntajes de Machine Learning y LLM estructurados con cálculo de ponderaciones matemático en cliente.
                Cero dependencia de APIs de nube externas en esta versión.
              </p>
            </div>
          </div>
        </div>

        {/* 4. Información del Sistema */}
        <div
          style={{
            padding: '1.25rem',
            backgroundColor: 'var(--bg-surface)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border-default)',
            fontSize: '0.8125rem',
            color: 'var(--text-secondary)',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.4rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-primary)', fontWeight: 600 }}>
            <ShieldCheck size={18} style={{ color: 'var(--primary-red)' }} />
            <span>TalentAI · Gestión del Talento Humano y Colaboradores (GTHC)</span>
          </div>
          <div>
            Desarrollado para <strong>ESAN Graduate School of Business</strong> en la rama experimental <code>GEM</code>.
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Tecnología: React 19 · TypeScript 5.7 · Vite 6 · Lucide Icons · Almacenamiento Seguro UTF-8 BOM
          </div>
        </div>
      </div>

      {/* Modal de Confirmación de Restablecimiento */}
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
              Sí, restablecer demo
            </Button>
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--status-failed-text)' }}>
            <AlertTriangle size={24} />
            <span style={{ fontWeight: 600 }}>Esta acción reiniciará todo el estado local</span>
          </div>
          <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            Se perderán las convocatorias creadas manualmente, los candidatos cargados mediante CSV o generador de lotes,
            las notas agregadas y los registros de auditoría recientes. Los datos volverán al lote inicial de 18
            convocatorias y 16 candidatos.
          </p>
        </div>
      </Modal>
    </div>
  );
}
