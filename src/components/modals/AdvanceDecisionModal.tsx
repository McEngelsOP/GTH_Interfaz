import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal.tsx';
import { Button } from '../common/Button.tsx';
import { Badge } from '../common/Badge.tsx';
import { ScoreBadge } from '../candidate/ScoreBadge.tsx';
import { Application, Candidate, JobPosting, EvaluationMethod } from '../../types/index.ts';
import { isEligibleForTopN } from '../../services/recruitmentRules.ts';
import { UserCheck, Eye, Info, CheckCircle2 } from 'lucide-react';

interface AdvanceDecisionModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedApplications: Application[];
  candidates: Candidate[];
  job: JobPosting;
  method: EvaluationMethod;
  onConfirmAdvance: (rejectOthers: boolean, customMessage: string) => void;
}

export function AdvanceDecisionModal({
  isOpen,
  onClose,
  selectedApplications,
  candidates,
  job,
  method,
  onConfirmAdvance,
}: AdvanceDecisionModalProps) {
  const [rejectOthers, setRejectOthers] = useState(false);
  const [customMessage, setCustomMessage] = useState(
    `Estimado(a) {nombre},\n\nNos complace comunicarle que su postulación para la convocatoria "{puesto}" ha avanzado a la etapa de Preseleccionado.\n\nPróximamente el equipo de GTHC de la Universidad ESAN se comunicará con usted para coordinar las siguientes etapas.\n\nAtentamente,\nEquipo de GTHC · Universidad ESAN`
  );
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => { if (isOpen) { setRejectOthers(false); setShowPreview(false); } }, [isOpen, job.id]);
  if (!isOpen) return null;

  const validSelection = selectedApplications.length > 0 && selectedApplications.every((app) => app.jobPostingId === job.id && isEligibleForTopN(app, method).eligible) && job.status === 'activa';
  const count = selectedApplications.length;

  const handleConfirm = () => {
    onConfirmAdvance(rejectOthers, customMessage);
    onClose();
  };

  const sampleCandidate = candidates.find(
    (c) => c.id === selectedApplications[0]?.candidateId
  ) || { name: 'Carlos Mendoza' };

  const previewMessage = customMessage
    .replace(/{nombre}/g, sampleCandidate.name)
    .replace(/{puesto}/g, job.title);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Revisar decisión de avance de candidatos"
      subtitle={`Puesto: ${job.code} · ${job.title} · Método: ${method}`}
      maxWidth="680px"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            variant="primary"
            icon={<UserCheck size={16} />}
            onClick={handleConfirm}
            disabled={!validSelection || !customMessage.trim()}
          >
            Confirmar avance ({count} {count === 1 ? 'perfil' : 'perfiles'})
          </Button>
        </>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {/* Explicación transparente de efectos (Sección 11) */}
        <div
          style={{
            padding: '0.85rem 1rem',
            backgroundColor: 'var(--bg-base)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-subtle)',
            fontSize: '0.84rem',
            color: 'var(--text-secondary)',
            lineHeight: 1.45,
          }}
        >
          {!validSelection && <p role="alert">Revise la selección: todos los expedientes deben estar pendientes, verificados y evaluados.</p>}
          <strong style={{ color: 'var(--text-primary)' }}>Efectos de esta decisión:</strong>
          <ul style={{ paddingLeft: '1.25rem', marginTop: '0.35rem', display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
            <li>Los perfiles elegidos pasarán de <em>Postulado</em> a <strong>Preseleccionado</strong>.</li>
            <li>Dejarán la pestaña <em>Top-N pendientes</em> (ya recibieron decisión), y otros pendientes ocuparán sus posiciones.</li>
            <li>Seguirán activos en <em>En proceso</em>, <em>Todos</em> y en el tablero <em>Avance de candidatos</em>.</li>
            <li>Los mensajes se guardarán como borradores locales (no se enviarán correos reales).</li>
          </ul>
        </div>

        {/* Lista de perfiles a avanzar */}
        <div>
          <h4 style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--text-primary)' }}>
            Perfiles que avanzarán a Preseleccionado ({count}):
          </h4>
          <div
            style={{
              maxHeight: '160px',
              overflowY: 'auto',
              border: '1px solid var(--border-default)',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--bg-surface)',
            }}
          >
            {selectedApplications.map((app) => {
              const cand = candidates.find((c) => c.id === app.candidateId);
              return (
                <div
                  key={app.id}
                  style={{
                    padding: '0.6rem 0.85rem',
                    borderBottom: '1px solid var(--border-subtle)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {cand?.name || 'Candidato'}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      {cand?.currentTitle} · {cand?.currentCompany}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <ScoreBadge score={app.mlScore} method="ML" size="sm" />
                    <ScoreBadge score={app.llmScore} method="LLM" size="sm" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Opción explícita: Los otros evaluados no avanzan (Sección 11) */}
        <label
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '0.65rem',
            padding: '0.75rem',
            backgroundColor: 'var(--bg-surface)',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border-default)',
            cursor: 'pointer',
          }}
        >
          <input
            type="checkbox"
            checked={rejectOthers}
            onChange={(e) => setRejectOthers(e.target.checked)}
            style={{ marginTop: '0.2rem', accentColor: 'var(--primary-red)' }}
          />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
            <span style={{ fontSize: '0.84rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              Los otros perfiles evaluados no avanzan (No continúa)
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              Solo afecta a otros candidatos pendientes evaluados del mismo puesto. Los perfiles con requisitos o datos
              pendientes seguirán pendientes de evaluación.
            </span>
          </div>
        </label>

        {/* Mensaje de notificación personalizable */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              Mensaje del borrador (variables {'{nombre}'} y {'{puesto}'})
            </label>
            <button
              type="button"
              onClick={() => setShowPreview(!showPreview)}
              className="focus-ring"
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--primary-red)',
                fontSize: '0.78rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.3rem',
              }}
            >
              <Eye size={13} />
              {showPreview ? 'Editar texto' : 'Vista previa'}
            </button>
          </div>

          {showPreview ? (
            <div
              style={{
                padding: '0.85rem',
                backgroundColor: 'var(--bg-base)',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-default)',
                fontSize: '0.84rem',
                whiteSpace: 'pre-wrap',
                lineHeight: 1.5,
              }}
            >
              {previewMessage}
            </div>
          ) : (
            <textarea
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              rows={4}
              className="focus-ring"
              style={{
                width: '100%',
                padding: '0.6rem 0.75rem',
                fontSize: '0.84rem',
                color: 'var(--text-primary)',
                backgroundColor: 'var(--bg-surface)',
                border: '1px solid var(--border-default)',
                borderRadius: 'var(--radius-sm)',
                outline: 'none',
                fontFamily: 'inherit',
              }}
            />
          )}
        </div>
      </div>
    </Modal>
  );
}

