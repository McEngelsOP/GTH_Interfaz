import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext.tsx';
import { Candidate, Application } from '../types/index.ts';
import { Button } from '../components/common/Button.tsx';
import { Badge } from '../components/common/Badge.tsx';
import { LinkToJobModal } from '../components/modals/LinkToJobModal.tsx';
import {
  exportCandidatesCSV,
  exportComparisonCSV,
  exportTalentPoolCSV,
  exportProfileCatalogCSV,
} from '../services/exportService.ts';
import { INITIAL_PROFILE_TEMPLATES } from '../data/initialData.ts';
import {
  Database,
  Search,
  Download,
  Link2,
  Eye,
  Briefcase,
  Sparkles,
  FileSpreadsheet,
  Building,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Info,
} from 'lucide-react';
import { Modal } from '../components/common/Modal.tsx';
import { getScoreByMethod, isEligibleForTopN } from '../services/recruitmentRules.ts';

export function BancoTalentoView() {
  const {
    appState,
    activeJob,
    activeJobApplications,
    selectedApplicationIds,
    openCandidateDrawer,
    handleLinkCandidateToJob,
    showToast,
  } = useApp();

  const [profileToView, setProfileToView] = useState<Candidate | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCandidateForLink, setSelectedCandidateForLink] = useState<Candidate | null>(null);

  // Selector de alcance para la descarga de la convocatoria activa (Sección 18)
  const [downloadScope, setDownloadScope] = useState<'todos' | 'mejores' | 'marcados'>('todos');

  // Paginación del Banco de Talento
  const [pageSize, setPageSize] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Perfiles del banco de talento (guardados manualmente + liberados)
  const talentPoolCandidates = useMemo(() => {
    return appState.candidates.filter((c) => c.savedInTalentPool);
  }, [appState.candidates]);

  // Filtrado de búsqueda
  const filteredTalent = useMemo(() => {
    return talentPoolCandidates.filter((c) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        c.name.toLowerCase().includes(q) ||
        c.currentTitle.toLowerCase().includes(q) ||
        c.currentCompany.toLowerCase().includes(q) ||
        (c.talentPoolOriginJob && c.talentPoolOriginJob.toLowerCase().includes(q))
      );
    });
  }, [talentPoolCandidates, searchQuery]);

  // Paginación
  const totalItems = filteredTalent.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const validPage = Math.min(currentPage, totalPages);
  const paginatedTalent = filteredTalent.slice((validPage - 1) * pageSize, validPage * pageSize);

  // --------------------------------------------------------------------------
  // Lógica de Descargas Centrales (Sección 18)
  // --------------------------------------------------------------------------
  // Conjunto a exportar según el alcance elegido
  const applicationsToExport = useMemo(() => {
    if (!activeJob) return [];
    if (downloadScope === 'marcados') {
      return activeJobApplications.filter((a) => selectedApplicationIds.includes(a.id));
    }
    if (downloadScope === 'mejores') {
      const eligible = activeJobApplications.filter((a) => isEligibleForTopN(a, appState.selectedMethod).eligible);
      return [...eligible]
        .sort((a, b) => (getScoreByMethod(b, appState.selectedMethod) ?? 0) - (getScoreByMethod(a, appState.selectedMethod) ?? 0))
        .slice(0, appState.topN);
    }
    return activeJobApplications;
  }, [activeJob, activeJobApplications, downloadScope, selectedApplicationIds, appState.selectedMethod, appState.topN]);

  // Los mejores perfiles de esta descarga (Sección 18)
  const topOfThisDownload = useMemo(() => {
    const valid = applicationsToExport.filter((a) => {
      const score = getScoreByMethod(a, appState.selectedMethod);
      return a.stage !== 'no_continua' && a.mandatoryRequirementStatus === 'verificado' && score !== null;
    });

    return [...valid].sort(
      (a, b) => (getScoreByMethod(b, appState.selectedMethod) ?? 0) - (getScoreByMethod(a, appState.selectedMethod) ?? 0)
    );
  }, [applicationsToExport, appState.selectedMethod]);

  const handleDownloadJobCandidates = () => {
    if (!activeJob) return;
    if (applicationsToExport.length === 0) {
      showToast('No hay registros en el conjunto seleccionado para exportar.', 'warning');
      return;
    }
    exportCandidatesCSV({
      emailDrafts: appState.emailDrafts,
      applications: applicationsToExport,
      candidates: appState.candidates,
      job: activeJob,
      method: appState.selectedMethod,
      scopeName: downloadScope,
    });
    showToast(`Archivo CSV generado con ${applicationsToExport.length} candidatos de ${activeJob.code}.`, 'success');
  };

  const handleDownloadDetailedComparison = () => {
    if (!activeJob) return;
    if (topOfThisDownload.length === 0) {
      showToast('No hay perfiles evaluados con requisitos verificados en este conjunto.', 'warning');
      return;
    }
    exportComparisonCSV({
      applications: topOfThisDownload,
      candidates: appState.candidates,
      job: activeJob,
      method: appState.selectedMethod,
    });
    showToast(`Comparativa CSV generada con los ${topOfThisDownload.length} mejores de la descarga.`, 'success');
  };

  const handleDownloadTalentPool = () => {
    exportTalentPoolCSV(talentPoolCandidates);
    showToast(`Banco de Talento descargado en CSV (${talentPoolCandidates.length} registros).`, 'success');
  };

  const handleDownloadCatalog = () => {
    exportProfileCatalogCSV(INITIAL_PROFILE_TEMPLATES);
    showToast('Catálogo de 7 perfiles descargado en CSV (4 columnas exactas).', 'success');
  };

  // Abrir ficha buscando la postulación más reciente o creando visualización
  const handleOpenCandidateDetails = (cand: Candidate) => {
    const app = appState.applications.find((a) => a.candidateId === cand.id);
    if (app) {
      openCandidateDrawer(app);
    } else {
      setProfileToView(cand);
    }
  };

  return (
    <div style={{ maxWidth: '1440px', margin: '0 auto', width: '100%', display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      {/* Cabecera del Banco de Talento */}
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
            <Database size={22} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              Banco de Talento Institucional
            </h1>
            <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
              Conservación de perfiles destacados, postulaciones liberadas y vinculación a nuevas convocatorias de ESAN.
            </p>
          </div>
        </div>

        <Button
          variant="secondary"
          size="sm"
          icon={<Download size={15} />}
          onClick={handleDownloadTalentPool}
        >
          Descargar Banco en CSV
        </Button>
      </div>

      {/* SECCIÓN 1: Centro de Descargas CSV y Comparativas (Sección 18) */}
      {activeJob && (
        <div
          style={{
            backgroundColor: 'var(--bg-surface)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border-default)',
            boxShadow: 'var(--shadow-sm)',
            padding: '1.5rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.25rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '0.25rem' }}>
                <FileSpreadsheet size={18} style={{ color: 'var(--primary-red)' }} />
                <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Centro de Exportación CSV · Convocatoria {activeJob.code}
                </h2>
              </div>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                Archivos con codificación UTF-8 con BOM y delimitador ';' listos para Excel. Columnas acordadas con
                puntajes ML y LLM separados.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <Button variant="outline" size="sm" onClick={handleDownloadCatalog}>
                Catálogo de perfiles (4 col)
              </Button>
              <Button
                variant="primary"
                size="sm"
                icon={<Download size={15} />}
                onClick={handleDownloadJobCandidates}
              >
                Descargar candidatos ({applicationsToExport.length})
              </Button>
            </div>
          </div>

          {/* Selector de Alcance */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
              padding: '0.75rem 1rem',
              backgroundColor: 'var(--bg-base)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)',
              flexWrap: 'wrap',
            }}
          >
            <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              Conjunto a exportar:
            </span>

            <div style={{ display: 'flex', gap: '0.4rem' }}>
              {[
                { id: 'todos', label: `Todos (${activeJobApplications.length})` },
                { id: 'mejores', label: `Mejores perfiles (Top ${appState.topN})` },
                { id: 'marcados', label: `Marcados (${selectedApplicationIds.length})` },
              ].map((scope) => (
                <button
                  key={scope.id}
                  onClick={() => setDownloadScope(scope.id as any)}
                  className="focus-ring"
                  style={{
                    padding: '0.35rem 0.75rem',
                    fontSize: '0.8125rem',
                    fontWeight: downloadScope === scope.id ? 600 : 500,
                    borderRadius: 'var(--radius-sm)',
                    border: `1px solid ${downloadScope === scope.id ? 'var(--primary-red)' : 'var(--border-default)'}`,
                    backgroundColor: downloadScope === scope.id ? 'var(--primary-red-subtle)' : 'var(--bg-surface)',
                    color: downloadScope === scope.id ? 'var(--primary-red)' : 'var(--text-secondary)',
                    cursor: 'pointer',
                  }}
                >
                  {scope.label}
                </button>
              ))}
            </div>

            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginLeft: 'auto' }}>
              Puesto de origen: <strong>{activeJob.title}</strong>
            </span>
          </div>

          {/* Bloque: Los mejores perfiles de esta descarga (Sección 18) */}
          <div
            style={{
              padding: '1rem',
              backgroundColor: 'var(--bg-surface)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div>
                <span style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Los mejores perfiles de esta descarga ({topOfThisDownload.length} elegibles activos):
                </span>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                  Ordenados por {appState.selectedMethod} con requisitos verificados. Puede incluir personas que ya
                  avanzaron.
                </p>
              </div>

              <Button
                variant="secondary"
                size="sm"
                icon={<FileSpreadsheet size={14} />}
                onClick={handleDownloadDetailedComparison}
                disabled={topOfThisDownload.length === 0}
              >
                Descargar comparativa CSV detallada
              </Button>
            </div>

            {/* Muestra de los 3 primeros perfiles */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '0.65rem' }}>
              {topOfThisDownload.slice(0, 3).map((app, idx) => {
                const cand = appState.candidates.find((c) => c.id === app.candidateId);
                return (
                  <div
                    key={app.id}
                    style={{
                      padding: '0.65rem 0.85rem',
                      backgroundColor: 'var(--bg-base)',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border-subtle)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.2rem',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary-red)' }}>
                        #{idx + 1}
                      </span>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{app.stage}</span>
                    </div>
                    <span style={{ fontSize: '0.84rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {cand?.name}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      ML: {app.mlScore ?? 'N/D'} | LLM: {app.llmScore ?? 'N/D'}
                    </span>
                  </div>
                );
              })}
              {topOfThisDownload.length === 0 && (
                <div style={{ padding: '0.75rem', color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
                  No hay candidatos evaluados con requisitos verificados en este subconjunto.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* SECCIÓN 2: Lista de Perfiles en el Banco de Talento */}
      <div
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-default)',
          boxShadow: 'var(--shadow-sm)',
          padding: '1.5rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              Perfiles Almacenados ({filteredTalent.length})
            </h2>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
              Incluye candidatos guardados manualmente y aquellos cuyas postulaciones fueron liberadas.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
            <Button
              variant="secondary"
              size="sm"
              icon={<Download size={14} />}
              onClick={() => {
                if (filteredTalent.length === 0) {
                  showToast('No hay perfiles almacenados para exportar.', 'warning');
                  return;
                }
                exportTalentPoolCSV(filteredTalent);
                showToast(`Descargando ${filteredTalent.length} perfiles almacenados en CSV.`, 'success');
              }}
              title="Descargar todos los perfiles almacenados filtrados en formato CSV"
            >
              Exportar Almacenados CSV ({filteredTalent.length})
            </Button>

            <div style={{ position: 'relative', width: '260px' }}>
              <Search
                size={15}
                style={{
                  position: 'absolute',
                  left: '0.75rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-muted)',
                }}
              />
              <input
                type="text"
                placeholder="Buscar en Banco de Talento..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="focus-ring"
                style={{
                  width: '100%',
                  padding: '0.4rem 0.75rem 0.4rem 2.2rem',
                  fontSize: '0.8125rem',
                  backgroundColor: 'var(--bg-base)',
                  border: '1px solid var(--border-default)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--text-primary)',
                  outline: 'none',
                }}
              />
            </div>
          </div>
        </div>

        {/* Tabla del Banco de Talento */}
        <div style={{ overflowX: 'auto', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.84rem' }}>
            <thead>
              <tr style={{ backgroundColor: 'var(--bg-base)', borderBottom: '1px solid var(--border-default)', color: 'var(--text-secondary)', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                <th style={{ padding: '0.75rem 1rem' }}>Candidato</th>
                <th style={{ padding: '0.75rem 1rem' }}>Experiencia / Organización</th>
                <th style={{ padding: '0.75rem 1rem' }}>Puesto de procedencia</th>
                <th style={{ padding: '0.75rem 1rem' }}>Motivo de conservación</th>
                <th style={{ padding: '0.75rem 1rem', minWidth: '190px', textAlign: 'right' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {paginatedTalent.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                    No hay perfiles en el Banco de Talento que coincidan con la búsqueda.
                  </td>
                </tr>
              ) : (
                paginatedTalent.map((cand) => (
                  <tr key={cand.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontWeight: 600, color: 'var(--primary-red)' }}>{cand.name}</span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {cand.email || 'Sin correo registrado'}
                        </span>
                      </div>
                    </td>

                    <td style={{ padding: '0.75rem 1rem' }}>
                      <div>{cand.currentTitle}</div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{cand.currentCompany}</span>
                    </td>

                    <td style={{ padding: '0.75rem 1rem', color: 'var(--text-secondary)' }}>
                      {cand.talentPoolOriginJob || 'Archivo de talento institucional'}
                    </td>

                    <td style={{ padding: '0.75rem 1rem', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                      {cand.talentPoolNotes || 'Perfil con potencial para convocatorias institucionales'}
                    </td>

                    <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.4rem', flexWrap: 'nowrap' }}>
                        <Button
                          variant="ghost"
                          size="sm"
                          icon={<Eye size={13} />}
                          onClick={() => handleOpenCandidateDetails(cand)}
                          title="Ver ficha técnica"
                        >
                          Ficha
                        </Button>

                        {/* Exportar este perfil individual a CSV */}
                        <Button
                          variant="ghost"
                          size="sm"
                          icon={<Download size={13} />}
                          onClick={() => {
                            exportTalentPoolCSV([cand]);
                            showToast(`Perfil de ${cand.name} descargado en CSV.`, 'success');
                          }}
                          title={`Descargar expediente de ${cand.name} en CSV`}
                        >
                          CSV
                        </Button>

                        <Button
                          variant="secondary"
                          size="sm"
                          icon={<Link2 size={13} />}
                          onClick={() => setSelectedCandidateForLink(cand)}
                          title="Crear postulación pendiente en otro puesto; conservar el perfil en el Banco"
                        >
                          Vincular a puesto
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Paginación */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8125rem', color: 'var(--text-muted)', paddingTop: '0.25rem' }}>
          <span>
            Mostrando <strong>{paginatedTalent.length}</strong> de {filteredTalent.length} talentos
          </span>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span>Página {validPage} de {totalPages}</span>
            <Button
              variant="secondary"
              size="sm"
              icon={<ChevronLeft size={14} />}
              disabled={validPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            />
            <Button
              variant="secondary"
              size="sm"
              icon={<ChevronRight size={14} />}
              disabled={validPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            />
          </div>
        </div>
      </div>

      {/* Modal para vincular candidato a nueva convocatoria */}
      <LinkToJobModal
        isOpen={Boolean(selectedCandidateForLink)}
        onClose={() => setSelectedCandidateForLink(null)}
        candidate={selectedCandidateForLink}
        jobs={appState.jobPostings}
        activeJobId={activeJob?.id || ''}
        onConfirmLink={handleLinkCandidateToJob}
      />
      {profileToView && <Modal isOpen onClose={() => setProfileToView(null)} title={profileToView.name}
        subtitle="Banco de Talento · Perfil sin postulación" maxWidth="660px"
        footer={<><Button variant="ghost" onClick={() => setProfileToView(null)}>Cerrar</Button>
          <Button onClick={() => { setSelectedCandidateForLink(profileToView); setProfileToView(null); }}>Vincular a puesto</Button></>}>
        <p><strong>{profileToView.currentTitle}</strong> · {profileToView.currentCompany}</p>
        <p style={{ marginTop: '0.75rem' }}>{profileToView.summary}</p>
        <p style={{ marginTop: '0.75rem' }}>Correo: {profileToView.email || 'No registrado'} · Teléfono: {profileToView.phone || 'No registrado'}</p>
        <p style={{ marginTop: '0.75rem' }}>{profileToView.talentPoolNotes}</p>
        <h3 style={{ marginTop: '1.25rem', marginBottom: '0.5rem' }}>CV registrado</h3>
        <div style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', color: 'var(--text-secondary)' }}>{profileToView.rawCvText || 'Sin documento registrado'}</div>
        <p style={{ marginTop: '1rem', color: 'var(--text-muted)' }}>Al vincularlo a un puesto se crea un expediente independiente con evaluación pendiente.</p>
      </Modal>}
    </div>
  );
}

