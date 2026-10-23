import { TrayectoriaPanel } from './TrayectoriaPanel.tsx';
import { WhatsAppButton } from './WhatsAppButton.tsx';
import React, { useEffect, useState } from 'react';
import { PostulacionesPanel } from './PostulacionesPanel.tsx';
import { useApp } from '../../context/AppContext.tsx';
import { Drawer } from '../common/Drawer.tsx';
import { Button } from '../common/Button.tsx';
import { Badge } from '../common/Badge.tsx';
import { StageBadge } from './StageBadge.tsx';
import { DesgloseRequisitos } from './DesgloseRequisitos.tsx';
import { VisorCV } from './VisorCV.tsx';
import { Tabs } from '../common/Tabs.tsx';
import { AdvanceDecisionModal } from '../modals/AdvanceDecisionModal.tsx';
import { ReleaseModal } from '../modals/ReleaseModal.tsx';
import { EmailDraftModal } from '../modals/EmailDraftModal.tsx';
import {
  Mail,
  Calendar,
  StickyNote,
  History,
  CheckCircle2,
  Sparkles,
  Briefcase,
  FileText,
  UserCheck,
  AlertCircle,
  ExternalLink,
  ShieldCheck,
  Building,
} from 'lucide-react';
import { puedeAvanzar } from '../../services/recruitmentRules.ts';
import { formatEmbeddingScore } from '../../services/embeddingMatching.ts';
import { embeddingVigente, idsTopN, ordenarPorEmbeddings } from '../../services/rankingEmbeddings.ts';
import { perfilBumeran } from '../../services/perfilBumeran.ts';
import { cvPersonal } from '../../services/bumeranSync.ts';
import { ComparacionSalarial } from './ComparacionSalarial.tsx';

export function CandidateDrawer() {
  const {
    selectedCandidateForDrawer,
    candidateDrawerTab,
    openCandidateDrawer,
    activeJob,
    appState,
    handleAdvanceApplications,
    handleReleaseApplication,
    handleSaveEmailDraft,
    setCurrentView,
    setActiveJobPostingId,
  } = useApp();

  const [isAdvanceModalOpen, setIsAdvanceModalOpen] = useState(false);
  const [isReleaseModalOpen, setIsReleaseModalOpen] = useState(false);

  const [activeTab, setActiveTab] = useState('perfil');
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [verCv, setVerCv] = useState(false);
  useEffect(() => { setActiveTab(candidateDrawerTab); }, [selectedCandidateForDrawer?.id, candidateDrawerTab]);

  const app = selectedCandidateForDrawer;
  if (!app) return null;
  const currentJob = appState.jobPostings.find((j) => j.id === app.jobPostingId);
  if (!currentJob) return null;
  const candidate = appState.candidates.find((c) => c.id === app.candidateId);
  if (!candidate) return null;

  // Decisiones asociadas a esta postulación
  const appDecisions = appState.decisionLogs.filter((d) => d.applicationId === app.id);
  // Borradores de correo asociados
  const appDrafts = appState.emailDrafts.filter((d) => d.applicationId === app.id);

  // Ranking por Score Embeddings: posición, Top-N y si puede pasar a Preselección
  const delPuesto = appState.applications.filter((a) => a.jobPostingId === currentJob.id);
  const topIds = idsTopN(delPuesto, appState.candidates, currentJob, appState.topN);
  const ordenadas = ordenarPorEmbeddings(delPuesto, appState.candidates, currentJob);
  const posicion = ordenadas.findIndex((a) => a.id === app.id) + 1;
  const emb = embeddingVigente(app, currentJob);
  const enTop = topIds.has(app.id);
  const avanzable = puedeAvanzar(app, appState.selectedMethod, topIds);
  const perfil = perfilBumeran(candidate);
  const cv = cvPersonal(candidate.importedProfile?.records);
  // Iniciales
  const initials = candidate.name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();

  const drawerTabs = [
    { id: 'perfil', label: 'Perfil' },
    { id: 'puntaje', label: 'Por qué este puntaje' },
    { id: 'postulaciones', label: 'Postulaciones' },
    ...(candidate.potentialOpportunities?.length ? [{ id: 'oportunidades', label: 'Otras oportunidades' }] : []),
  ];

  return (
    <>
      <Drawer
        isOpen={Boolean(selectedCandidateForDrawer)}
        onClose={() => openCandidateDrawer(null)}
        width="660px"
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <div
              style={{
                width: '46px',
                height: '46px',
                borderRadius: 'var(--radius-full)',
                backgroundColor: 'var(--primary-red-subtle)',
                color: 'var(--primary-red)',
                border: '1px solid var(--primary-red-border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.1rem',
                fontWeight: 700,
                flexShrink: 0,
              }}
            >
              {initials}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  {candidate.name}
                </span>
                <StageBadge stage={app.stage} size="sm" />
              </div>
              <span style={{ fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
                {candidate.currentTitle} · {candidate.currentCompany}
              </span>
            </div>
          </div>
        }
        subtitle={
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', marginTop: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                <strong>Puesto:</strong> {currentJob.code} · {currentJob.title}
              </span>
              <Badge variant="neutral" size="sm">
                Fuente: {candidate.source}
              </Badge>
            </div>

            {/* Ranking por Score Embeddings */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginTop: '0.2rem', flexWrap: 'wrap' }}>
              {emb ? <>
                <span style={{ fontSize: '0.84rem', color: 'var(--text-primary)' }}>
                  Score Embeddings <strong className="tabular-nums">{formatEmbeddingScore(emb.score)}</strong>
                </span>
                <span style={{ fontSize: '0.84rem', color: 'var(--text-secondary)' }}>· puesto {posicion} de {ordenadas.length}</span>
                <Badge variant={enTop ? 'success' : 'neutral'} size="sm">{enTop ? 'Dentro del Top-N' : 'Fuera del Top-N'}</Badge>
              </> : <span style={{ fontSize: '0.84rem', color: 'var(--text-secondary)' }}>Aún sin Score Embeddings para este aviso.</span>}
            </div>

            {/* Información de contacto honesta (solo si existe) */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', marginTop: '0.25rem', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
              {candidate.email ? (
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <Mail size={13} style={{ color: 'var(--text-muted)' }} />
                  {candidate.email}
                </span>
              ) : (
                <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>
                  Sin correo registrado
                </span>
              )}
              <WhatsAppButton candidate={candidate} jobTitle={currentJob.title} />
              {candidate.phone && (
                <span style={{ whiteSpace: 'nowrap' }}>
                  <strong>Tel:</strong> {candidate.phone}
                </span>
              )}
            </div>


          </div>
        }
        footer={
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: '1rem' }}>
            <Button
              variant="danger"
              size="sm"
              onClick={() => setIsReleaseModalOpen(true)}
              disabled={app.stage === 'no_continua' || app.stage === 'contratado'}
            >
              {app.stage === 'no_continua' ? 'Postulación liberada' : 'Liberar postulación'}
            </Button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Button variant="ghost" size="sm" onClick={() => openCandidateDrawer(null)}>
                Cerrar
              </Button>

              {app.stage === 'postulado' && (
                <Button
                  variant="primary"
                  size="sm"
                  icon={<UserCheck size={16} />}
                  onClick={() => setIsAdvanceModalOpen(true)}
                  disabled={!avanzable || currentJob.status !== 'activa'}
                  title={!avanzable ? 'Solo los del Top-N pueden pasar a Preselección (agrégalo con la estrella)' : 'Avanzar a etapa de Preseleccionado'}
                >
                  Avanzar a Preseleccionado
                </Button>
              )}
            </div>
          </div>
        }
      >
        {/* Acciones rápidas */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem', paddingBottom: '1rem',
          borderBottom: '1px solid var(--border-subtle)', marginBottom: '1rem' }}>
          <Button variant="secondary" size="sm" icon={<Mail size={14} />} onClick={() => setIsEmailModalOpen(true)}
            title="Preparar borrador de correo para el candidato">
            Correo
          </Button>
          <Button variant="secondary" size="sm" icon={<FileText size={14} />} onClick={() => setVerCv(true)}
            title={cv.estado === 'disponible' ? 'Ver el CV personal que adjuntó en Bumeran' : cv.estado === 'sin_adjunto' ? 'No adjuntó CV personal' : 'CV personal aún no disponible'}>
            Ver CV personal
          </Button>
        </div>

        {/* Pestañas de detalle */}
        <ComparacionSalarial key={currentJob.id} job={currentJob} app={app} />
        <Tabs tabs={drawerTabs} activeTab={activeTab} onChange={setActiveTab} className="candidate-drawer-tabs" />

        <div style={{ marginTop: '1.25rem' }}>
          {activeTab === 'postulaciones' && <PostulacionesPanel key={app.id} candidate={candidate} job={currentJob} />}
          {/* 1. Por qué este puntaje: similitud y evidencia por requisito */}
          {activeTab === 'puntaje' && (
            emb ? <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                Similitud del perfil con cada requisito del aviso (0-100 dentro del aviso) y la parte del perfil que la respalda.
              </p>
              <DesgloseRequisitos app={app} candidate={candidate} job={currentJob} />
            </div> : <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)' }}>Este postulante todavía no tiene Score Embeddings para los requisitos actuales.</p>
          )}

          {/* 2. Perfil de Bumeran ordenado */}
          {activeTab === 'perfil' && (
            <div className="perfil-bumeran">
              <section>
                <h3>Experiencia laboral</h3>
                <TrayectoriaPanel key={app.id} aviso={currentJob.bumeran?.avisoId} postulante={candidate.importedProfile?.externalId} />
                {perfil.experiencias.length ? perfil.experiencias.map((e, i) => (
                  <article key={i}>
                    <strong>{e.puesto}</strong>
                    <span>{[e.empresa, e.periodo].filter(Boolean).join(' · ')}</span>
                    {e.area && <span>{e.area}</span>}
                    {e.descripcion && <p>{e.descripcion}</p>}
                  </article>
                )) : <p className="vacio">Sin experiencia registrada en Bumeran.</p>}
              </section>
              <section>
                <h3>Estudios</h3>
                {perfil.estudios.length ? perfil.estudios.map((e, i) => (
                  <article key={i}>
                    <strong>{e.titulo}</strong>
                    <span>{[e.institucion, [e.nivel, e.estado].filter(Boolean).join(', '), e.periodo].filter(Boolean).join(' · ')}</span>
                  </article>
                )) : <p className="vacio">Sin estudios registrados en Bumeran.</p>}
              </section>
              <section>
                <h3>Idiomas</h3>
                <p>{perfil.idiomas || <span className="vacio">Sin idiomas registrados.</span>}</p>
              </section>
              {perfil.ciudad && <section><h3>Ciudad</h3><p>{perfil.ciudad}</p></section>}
            </div>
          )}

          {/* 5. Historial de Decisiones */}
          {activeTab === 'historial' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {appDrafts.map((d) => (
                <div key={d.id} style={{ padding: '0.65rem 0.85rem', backgroundColor: 'var(--primary-red-subtle)', borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--primary-red-border)', fontSize: '0.8125rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '.5rem' }}>
                  <div><strong>{d.subject}</strong> · Para: {d.to || 'Sin correo'}</div>
                  <Badge variant="primary" size="sm">Borrador de correo</Badge>
                </div>
              ))}
              {appDecisions.length === 0 && appDrafts.length === 0 ? (
                <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)' }}>
                  Sin decisiones de auditoría registradas todavía para esta postulación.
                </p>
              ) : (
                appDecisions.map((dec) => (
                  <div
                    key={dec.id}
                    style={{
                      padding: '0.75rem',
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: 'var(--bg-base)',
                      border: '1px solid var(--border-subtle)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.25rem',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.84rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                        {dec.action}
                      </span>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        {new Date(dec.timestamp).toLocaleString()}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                      Criterios: {dec.criteriaVersion} · {dec.evaluationContext.viaTopN ? 'Top-N del ranking por Score Embeddings' : `Método: ${dec.evaluationContext.method}`}
                    </div>
                    {dec.notes && (
                      <p style={{ fontSize: '0.8125rem', color: 'var(--text-primary)', marginTop: '0.2rem' }}>
                        Nota: {dec.notes}
                      </p>
                    )}
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                      Registrado por: {dec.author}
                    </span>
                  </div>
                ))
              )}
            </div>
          )}

          {/* 6. Otras Oportunidades sugeridas */}
          {activeTab === 'oportunidades' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                Puestos sugeridos para este perfil; una sugerencia no equivale a una postulación:
              </p>
              {(candidate.potentialOpportunities && candidate.potentialOpportunities.length > 0) ? (
                candidate.potentialOpportunities.map((op, idx) => (
                  <div
                    key={idx}
                    style={{
                      padding: '0.75rem 1rem',
                      backgroundColor: 'var(--bg-surface)',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-subtle)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Briefcase size={16} style={{ color: 'var(--primary-red)' }} />
                      <span style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-primary)' }}>
                        {op}
                      </span>
                    </div>
                    <Badge variant="purple" size="sm">
                      Sugerencia
                    </Badge>
                  </div>
                ))
              ) : (
                <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)' }}>
                  No se han registrado sugerencias automáticas para este perfil.
                </p>
              )}
            </div>
          )}
        </div>
      </Drawer>

      {/* Modales rápidos anidados (con foco accesible) */}
      <EmailDraftModal
        isOpen={isEmailModalOpen}
        onClose={() => setIsEmailModalOpen(false)}
        candidate={candidate}
        application={app}
        job={currentJob}
        onSaveDraft={handleSaveEmailDraft}
      />

      <VisorCV nombre={verCv ? candidate.name : null} cv={cv} onClose={() => setVerCv(false)} />
      <AdvanceDecisionModal isOpen={isAdvanceModalOpen} onClose={() => setIsAdvanceModalOpen(false)}
        selectedApplications={[app]} candidates={appState.candidates} job={currentJob} method={appState.selectedMethod}
        onConfirmAdvance={(reject, message) => handleAdvanceApplications([app.id], reject, message)} topIds={topIds} />
      <ReleaseModal isOpen={isReleaseModalOpen} onClose={() => setIsReleaseModalOpen(false)} application={app} candidate={candidate} job={currentJob}
        onConfirmRelease={(id, reason) => handleReleaseApplication(id, reason)} />
    </>
  );
}

