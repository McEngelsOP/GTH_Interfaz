import React, { useState } from 'react';
import { useApp } from '../../context/AppContext.tsx';
import { Drawer } from '../common/Drawer.tsx';
import { Button } from '../common/Button.tsx';
import { Badge } from '../common/Badge.tsx';
import { StageBadge } from './StageBadge.tsx';
import { RequirementPill } from './RequirementPill.tsx';
import { ScoreBadge } from './ScoreBadge.tsx';
import { Tabs } from '../common/Tabs.tsx';
import { AdvanceDecisionModal } from '../modals/AdvanceDecisionModal.tsx';
import { ReleaseModal } from '../modals/ReleaseModal.tsx';
import { EmailDraftModal } from '../modals/EmailDraftModal.tsx';
import { ScheduleModal } from '../modals/ScheduleModal.tsx';
import { NoteModal } from '../modals/NoteModal.tsx';
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
import { isEligibleForTopN } from '../../services/recruitmentRules.ts';

export function CandidateDrawer() {
  const {
    selectedCandidateForDrawer,
    openCandidateDrawer,
    activeJob,
    appState,
    handleAdvanceApplications,
    handleReleaseApplication,
    handleAddNote,
    handleScheduleInterview,
    handleSaveEmailDraft,
    setCurrentView,
    setActiveJobPostingId,
  } = useApp();

  const [isAdvanceModalOpen, setIsAdvanceModalOpen] = useState(false);
  const [isReleaseModalOpen, setIsReleaseModalOpen] = useState(false);

  const [activeTab, setActiveTab] = useState('puntaje');
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);

  const app = selectedCandidateForDrawer;
  if (!app) return null;
  const currentJob = appState.jobPostings.find((j) => j.id === app.jobPostingId);
  if (!currentJob) return null;
  const candidate = appState.candidates.find((c) => c.id === app.candidateId);
  if (!candidate) return null;

  // Actividades asociadas a esta postulación
  const appActivities = appState.activities.filter((a) => a.applicationId === app.id);
  // Decisiones asociadas a esta postulación
  const appDecisions = appState.decisionLogs.filter((d) => d.applicationId === app.id);
  // Borradores de correo asociados
  const appDrafts = appState.emailDrafts.filter((d) => d.applicationId === app.id);

  // Otras postulaciones reales de esta misma persona en el sistema (Sección 11 y 13)
  const otherApplications = appState.applications
    .filter((a) => a.candidateId === candidate.id && a.id !== app.id)
    .map((otherApp) => {
      const job = appState.jobPostings.find((j) => j.id === otherApp.jobPostingId);
      return {
        application: otherApp,
        job,
      };
    });

  // Elegibilidad para avance
  const eligibility = isEligibleForTopN(app, appState.selectedMethod);

  // Iniciales
  const initials = candidate.name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();

  const drawerTabs = [
    { id: 'puntaje', label: 'Por qué este puntaje' },
    { id: 'criterios', label: 'Detalle de criterios' },
    { id: 'cv', label: 'Ver CV' },
    { id: 'actividad', label: 'Actividad', count: appActivities.length },
    { id: 'historial', label: 'Historial', count: appDecisions.length },
    { id: 'oportunidades', label: 'Otras oportunidades' },
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

            {/* Puntaje LLM */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginTop: '0.2rem' }}>
              <ScoreBadge score={app.llmScore} method="LLM" />
              <RequirementPill
                status={app.mandatoryRequirementStatus}
                justification={app.requirementJustification}
                criteriaBreakdown={app.criteriaBreakdown}
              />
            </div>

            {/* Información de contacto honesta (solo si existe) */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '0.25rem', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
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
              {candidate.phone && (
                <span>
                  <strong>Tel:</strong> {candidate.phone}
                </span>
              )}
            </div>

            {/* Otras postulaciones reales de la misma persona */}
            {otherApplications.length > 0 && (
              <div
                style={{
                  marginTop: '0.4rem',
                  padding: '0.45rem 0.65rem',
                  backgroundColor: 'var(--bg-base)',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-subtle)',
                  fontSize: '0.75rem',
                }}
              >
                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                  Otras postulaciones registradas de esta persona ({otherApplications.length}):
                </span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', marginTop: '0.25rem' }}>
                  {otherApplications.map((item) => (
                    <div
                      key={item.application.id}
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                    >
                      <span style={{ color: 'var(--text-secondary)' }}>
                        {item.job?.code} · {item.job?.title}
                      </span>
                      <StageBadge stage={item.application.stage} size="sm" />
                    </div>
                  ))}
                </div>
              </div>
            )}
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
                  disabled={!eligibility.eligible || currentJob.status !== 'activa'}
                  title={!eligibility.eligible ? eligibility.reason : 'Avanzar a etapa de Preseleccionado'}
                >
                  Avanzar a Preseleccionado
                </Button>
              )}
            </div>
          </div>
        }
      >
        {/* Barra de Acciones Rápidas */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '0.5rem',
            paddingBottom: '1rem',
            borderBottom: '1px solid var(--border-subtle)',
            marginBottom: '1rem',
          }}
        >
          <Button
            variant="secondary"
            size="sm"
            icon={<Mail size={14} />}
            onClick={() => setIsEmailModalOpen(true)}
            title="Preparar borrador de correo para el candidato"
          >
            Correo
          </Button>
          <Button
            variant="secondary"
            size="sm"
            icon={<Calendar size={14} />}
            onClick={() => setIsScheduleModalOpen(true)}
            title="Agendar entrevista demostrativa"
          >
            Entrevista
          </Button>
          <Button
            variant="secondary"
            size="sm"
            icon={<StickyNote size={14} />}
            onClick={() => setIsNoteModalOpen(true)}
            title="Añadir nota de evaluación"
          >
            Nota
          </Button>
          <Button
            variant="secondary"
            size="sm"
            icon={<History size={14} />}
            onClick={() => setActiveTab('actividad')}
            title="Ver bitácora de actividad"
          >
            Actividad
          </Button>
        </div>

        {/* Pestañas de detalle */}
        <Tabs tabs={drawerTabs} activeTab={activeTab} onChange={setActiveTab} />

        <div style={{ marginTop: '1.25rem' }}>
          {/* 1. Por qué este puntaje */}
          {activeTab === 'puntaje' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div
                style={{
                  padding: '1rem',
                  backgroundColor: 'var(--bg-base)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '0.5rem' }}>
                  <Sparkles size={16} style={{ color: 'var(--primary-red)' }} />
                  <h3 style={{ fontSize: '0.95rem', fontWeight: 600 }}>Explicación del Puntaje</h3>
                </div>
                <p style={{ fontSize: '0.875rem', lineHeight: 1.5, color: 'var(--text-primary)' }}>
                  {app.whyScoreNotes.explanation}
                </p>
              </div>

              <div>
                <h4 style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>
                  Fortalezas Destacadas
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  {app.whyScoreNotes.strengths.map((str, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        fontSize: '0.84rem',
                        color: 'var(--text-primary)',
                      }}
                    >
                      <CheckCircle2 size={15} style={{ color: 'var(--status-verified-text)', flexShrink: 0 }} />
                      <span>{str}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h4 style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.4rem', color: 'var(--text-secondary)' }}>
                  Resumen de Evidencias Verificadas
                </h4>
                <p style={{ fontSize: '0.84rem', color: 'var(--text-primary)', lineHeight: 1.5 }}>
                  {app.whyScoreNotes.evidenceSummary}
                </p>
              </div>
            </div>
          )}

          {/* 2. Detalle de criterios */}
          {activeTab === 'criterios' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                Evaluación individual por cada criterio del perfil ({currentJob.code}) sumando 100%:
              </p>
              {currentJob.criteria.map((crit) => {
                const breakdown = app.criteriaBreakdown[crit.id];
                return (
                  <div
                    key={crit.id}
                    style={{
                      padding: '0.85rem',
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: 'var(--bg-surface)',
                      border: '1px solid var(--border-subtle)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.35rem',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                        {crit.label}
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Badge size="sm" variant={'purple'}>
                          {crit.type} ({crit.weightPct}%)
                        </Badge>
                        <span style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--primary-red)' }}>
                          {breakdown ? `${breakdown.score}/100` : 'Sin datos'}
                        </span>
                      </div>
                    </div>
                    <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                      <strong>Evidencia:</strong> {breakdown?.evidence || 'Pendiente de acreditación documental'}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* 3. Ver CV */}
          {activeTab === 'cv' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.5rem 0.75rem',
                  backgroundColor: 'var(--bg-base)',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.78rem',
                  color: 'var(--text-secondary)',
                }}
              >
                <span>Documento: CV_{candidate.name.replace(/\s+/g, '_')}.pdf</span>
                <span style={{ color: 'var(--status-verified-text)', fontWeight: 600 }}>Texto extraído local</span>
              </div>
              <div
                style={{
                  padding: '1.25rem',
                  backgroundColor: 'var(--bg-base)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-subtle)',
                  fontFamily: 'monospace',
                  fontSize: '0.84rem',
                  lineHeight: 1.6,
                  whiteSpace: 'pre-wrap',
                  color: 'var(--text-primary)',
                  maxHeight: '450px',
                  overflowY: 'auto',
                }}
              >
                {candidate.rawCvText}
              </div>
            </div>
          )}

          {/* 4. Actividad */}
          {activeTab === 'actividad' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {/* Borradores guardados si existen */}
              {appDrafts.length > 0 && (
                <div style={{ marginBottom: '0.5rem' }}>
                  <h4 style={{ fontSize: '0.84rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
                    Borradores de Correo Pendientes
                  </h4>
                  {appDrafts.map((d) => (
                    <div
                      key={d.id}
                      style={{
                        padding: '0.65rem 0.85rem',
                        backgroundColor: 'var(--primary-red-subtle)',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid var(--primary-red-border)',
                        fontSize: '0.8125rem',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <div>
                        <strong>{d.subject}</strong> · Destinatario: {d.to || 'Sin correo'}
                      </div>
                      <Badge variant="primary" size="sm">
                        Borrador local
                      </Badge>
                    </div>
                  ))}
                </div>
              )}

              {appActivities.length === 0 ? (
                <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)' }}>
                  Aún no hay actividad registrada para esta postulación. Puede añadir una nota o agendar una entrevista.
                </p>
              ) : (
                appActivities.map((act) => (
                  <div
                    key={act.id}
                    style={{
                      padding: '0.75rem',
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: 'var(--bg-surface)',
                      border: '1px solid var(--border-subtle)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.25rem',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.84rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                        {act.title}
                      </span>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        {new Date(act.timestamp).toLocaleString()}
                      </span>
                    </div>
                    <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                      {act.details}
                    </p>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                      Por: {act.author}
                    </span>
                  </div>
                ))
              )}
            </div>
          )}

          {/* 5. Historial de Decisiones */}
          {activeTab === 'historial' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {appDecisions.length === 0 ? (
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
                      Criterios: {dec.criteriaVersion} · Método: {dec.evaluationContext.method}
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
                Puestos sugeridos por afinidad de perfil demostrativo (distinguidos de postulaciones efectivas):
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
                      Sugerencia demostrativa
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

      <ScheduleModal
        isOpen={isScheduleModalOpen}
        onClose={() => setIsScheduleModalOpen(false)}
        candidateName={candidate.name}
        onSchedule={(data) => handleScheduleInterview(app.id, data)}
      />

      <NoteModal
        isOpen={isNoteModalOpen}
        onClose={() => setIsNoteModalOpen(false)}
        candidateName={candidate.name}
        onSaveNote={(note) => handleAddNote(app.id, note)}
      />
      <AdvanceDecisionModal isOpen={isAdvanceModalOpen} onClose={() => setIsAdvanceModalOpen(false)}
        selectedApplications={[app]} candidates={appState.candidates} job={currentJob} method={appState.selectedMethod}
        onConfirmAdvance={(reject, message) => handleAdvanceApplications([app.id], reject, message)} />
      <ReleaseModal isOpen={isReleaseModalOpen} onClose={() => setIsReleaseModalOpen(false)} application={app} candidate={candidate} job={currentJob}
        onConfirmRelease={(id, reason) => handleReleaseApplication(id, reason)} />
    </>
  );
}

