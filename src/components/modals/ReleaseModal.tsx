import React, { useState } from 'react';
import { Modal } from '../common/Modal.tsx';
import { Button } from '../common/Button.tsx';
import { Application, Candidate, JobPosting } from '../../types/index.ts';
import { UserX, AlertTriangle } from 'lucide-react';

interface ReleaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  application: Application | null;
  candidate: Candidate | null;
  job: JobPosting;
  onConfirmRelease: (applicationId: string, reason: string) => Promise<boolean>;
}

export function ReleaseModal({
  isOpen,
  onClose,
  application,
  candidate,
  job,
  onConfirmRelease,
}: ReleaseModalProps) {
  const [busy, setBusy] = useState(false);
  const [reason, setReason] = useState('Perfil no se ajusta al requerimiento de la cátedra');

  if (!isOpen || !application || !candidate) return null;

  const handleConfirm = async () => {
    if (busy) return;
    setBusy(true);
    try { if (await onConfirmRelease(application.id, reason)) onClose(); } finally { setBusy(false); }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Confirmar liberación de postulación"
      subtitle={`Candidato: ${candidate.name} · Convocatoria: ${job.code}`}
      maxWidth="520px"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button variant="danger" icon={<UserX size={15} />} onClick={handleConfirm} disabled={busy || !reason.trim()}>
            Confirmar liberación
          </Button>
        </>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '0.75rem',
            padding: '0.85rem',
            backgroundColor: 'var(--status-partial-bg)',
            color: 'var(--status-partial-text)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--status-partial-border)',
            fontSize: '0.84rem',
            lineHeight: 1.45,
          }}
        >
          <AlertTriangle size={18} style={{ flexShrink: 0, marginTop: '0.1rem' }} />
          <div>
            <strong>Consecuencias de liberar esta postulación:</strong>
            <ul style={{ paddingLeft: '1.15rem', marginTop: '0.35rem', display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
              <li>Saldrá inmediatamente de <em>En proceso</em> y de los mejores perfiles del puesto.</li>
              <li>Se recalcularán el ranking, conteos e indicadores de la convocatoria en tiempo real.</li>
              <li>El perfil se conservará en la pestaña <strong>No continúan</strong> y en el <strong>Banco de Talento</strong>.</li>
              <li>No se envía ningún correo electrónico de forma automática.</li>
            </ul>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
          <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)' }}>
            Motivo de la liberación (registrado en auditoría)
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
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
        </div>
      </div>
    </Modal>
  );
}

