import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext.tsx';
import { INITIAL_PROFILE_TEMPLATES } from '../data/initialData.ts';
import { ProfileTemplate, JobCategory } from '../types/index.ts';
import { Badge } from '../components/common/Badge.tsx';
import { Button } from '../components/common/Button.tsx';
import { exportProfileCatalogCSV } from '../services/exportService.ts';
import {
  BookOpen,
  ArrowRight,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  Download,
  Info,
} from 'lucide-react';

export function PerfilesPuestosView() {
  const { setCurrentView, showToast } = useApp();

  const [selectedFilter, setSelectedFilter] = useState<string>('ALL');
  const [expandedTemplateId, setExpandedTemplateId] = useState<string | null>(null);

  const filteredTemplates = useMemo(() => {
    if (selectedFilter === 'ALL') return INITIAL_PROFILE_TEMPLATES;
    return INITIAL_PROFILE_TEMPLATES.filter((tpl) => tpl.category === selectedFilter);
  }, [selectedFilter]);

  const handleUseTemplate = (tpl: ProfileTemplate) => {
    // Almacenar temporalmente plantilla elegida para NuevaConvocatoria
    sessionStorage.setItem('SELECTED_TEMPLATE_ID', tpl.id);
    setCurrentView('nueva_convocatoria');
    showToast(`Plantilla "${tpl.name}" seleccionada para nueva convocatoria.`, 'info');
  };

  const handleDownloadCatalog = () => {
    exportProfileCatalogCSV(INITIAL_PROFILE_TEMPLATES);
    showToast('Catálogo de perfiles de puesto descargado en CSV (UTF-8 con BOM).', 'success');
  };

  return (
    <div style={{ maxWidth: '1440px', margin: '0 auto', width: '100%' }}>
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
            <BookOpen size={22} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              Biblioteca de Perfiles de Puestos
            </h1>
            <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
              Catálogo estandarizado de 7 plantillas de requisitos, criterios y ponderaciones al 100% de ESAN.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <Button
            variant="outline"
            size="sm"
            icon={<Download size={15} />}
            onClick={handleDownloadCatalog}
            title="Descargar catálogo en CSV (4 columnas exactas: ID, Perfil, Categoría, Requisito)"
          >
            Descargar catálogo CSV
          </Button>
        </div>
      </div>

      {/* Nota aclaratoria fundamental (Sección 7) */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: '0.65rem',
          padding: '0.75rem 1rem',
          backgroundColor: 'var(--bg-surface)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-subtle)',
          marginBottom: '1.25rem',
          fontSize: '0.8125rem',
          color: 'var(--text-secondary)',
        }}
      >
        <Info size={16} style={{ color: 'var(--primary-red)', flexShrink: 0, marginTop: '0.1rem' }} />
        <span>
          <strong>Diferencia conceptual:</strong> Un perfil de puesto es una plantilla de requisitos y ponderaciones
          para iniciar convocatorias; no es un candidato. Los resultados históricos sin registros de seguimiento se
          muestran como pendientes.
        </span>
      </div>

      {/* Filtros de Categoría */}
      <div
        style={{
          display: 'flex',
          gap: '0.5rem',
          marginBottom: '1.5rem',
          overflowX: 'auto',
          paddingBottom: '0.25rem',
        }}
      >
        {[
          { id: 'ALL', label: 'Todos los perfiles' },
          { id: 'docente', label: 'Docentes e investigadores' },
          { id: 'administrativo', label: 'Administrativos y gestión' },
          { id: 'operativo', label: 'Operativos y soporte' },
          { id: 'directivo', label: 'Directivos' },
        ].map((f) => (
          <button
            key={f.id}
            onClick={() => setSelectedFilter(f.id)}
            className="focus-ring"
            style={{
              padding: '0.45rem 0.85rem',
              fontSize: '0.8125rem',
              fontWeight: selectedFilter === f.id ? 600 : 500,
              borderRadius: 'var(--radius-full)',
              border: `1px solid ${selectedFilter === f.id ? 'var(--primary-red)' : 'var(--border-default)'}`,
              backgroundColor: selectedFilter === f.id ? 'var(--primary-red)' : 'var(--bg-surface)',
              color: selectedFilter === f.id ? '#FFFFFF' : 'var(--text-secondary)',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'all var(--transition-fast)',
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Lista de Plantillas */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {filteredTemplates.map((tpl) => {
          const isExpanded = expandedTemplateId === tpl.id;

          return (
            <div
              key={tpl.id}
              style={{
                backgroundColor: 'var(--bg-surface)',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--border-default)',
                boxShadow: 'var(--shadow-sm)',
                padding: '1.25rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', flex: 1, minWidth: '280px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <Badge variant="primary" size="sm">
                      {tpl.code}
                    </Badge>
                    <Badge
                      size="sm"
                      variant={
                        tpl.category === 'docente'
                          ? 'purple'
                          : tpl.category === 'administrativo'
                          ? 'info'
                          : tpl.category === 'directivo'
                          ? 'warning'
                          : 'neutral'
                      }
                    >
                      {tpl.category.charAt(0).toUpperCase() + tpl.category.slice(1)}
                    </Badge>
                  </div>

                  <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    {tpl.name}
                  </h3>

                  <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
                    {tpl.description}
                  </p>
                </div>

                <Button
                  variant="primary"
                  size="sm"
                  icon={<ArrowRight size={14} />}
                  iconPosition="right"
                  onClick={() => handleUseTemplate(tpl)}
                >
                  Usar este perfil
                </Button>
              </div>

              {/* Requisito obligatorio del ejemplo */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  padding: '0.55rem 0.85rem',
                  backgroundColor: 'var(--bg-base)',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-subtle)',
                  fontSize: '0.8125rem',
                  color: 'var(--text-secondary)',
                }}
              >
                <ShieldCheck size={16} style={{ color: 'var(--primary-red)', flexShrink: 0 }} />
                <span>
                  <strong>Requisito obligatorio:</strong> {tpl.knockoutRule}
                </span>
              </div>

              {/* Botón para expandir detalle de criterios */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.25rem' }}>
                <button
                  onClick={() => setExpandedTemplateId(isExpanded ? null : tpl.id)}
                  className="focus-ring"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--primary-red)',
                    fontSize: '0.8125rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    padding: '0.2rem 0',
                  }}
                >
                  <span>{isExpanded ? 'Ocultar criterios ponderados' : `Ver criterios de evaluación (${tpl.criteria.length})`}</span>
                  {isExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                </button>

                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Ponderación total: 100%
                </span>
              </div>

              {/* Desglose de Criterios Expandible */}
              {isExpanded && (
                <div
                  style={{
                    marginTop: '0.5rem',
                    padding: '1rem',
                    backgroundColor: 'var(--bg-base)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-subtle)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.65rem',
                    animation: 'fadeIn 150ms ease-out',
                  }}
                >
                  <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    Criterios configurados para esta plantilla:
                  </span>
                  {tpl.criteria.map((crit, idx) => (
                    <div
                      key={crit.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0.5rem 0.75rem',
                        backgroundColor: 'var(--bg-surface)',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid var(--border-subtle)',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                          #{idx + 1}
                        </span>
                        <span style={{ fontSize: '0.84rem', fontWeight: 500, color: 'var(--text-primary)' }}>
                          {crit.label}
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Badge size="sm" variant={'purple'}>
                          {crit.type}
                        </Badge>
                        <span style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--primary-red)' }}>
                          {crit.weightPct}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
