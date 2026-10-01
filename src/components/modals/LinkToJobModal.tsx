import React, { useState } from 'react';
import { Modal } from '../common/Modal.tsx';
import { Button } from '../common/Button.tsx';
import { Select } from '../common/Select.tsx';
import { Candidate, JobPosting } from '../../types/index.ts';
import { ArrowRight, Info, Building } from 'lucide-react';

interface LinkToJobModalProps {
  isOpen: boolean;
  onClose: () => void;
  candidate: Candidate | null;
  jobs: JobPosting[];
  activeJobId: string;
  onConfirmLink: (candidateId: string, targetJobId: string) => void;
}

export function LinkToJobModal({
  isOpen,
  onClose,
  candidate,
  jobs,
  activeJobId,
  onConfirmLink,
}: LinkToJobModalProps) {
  const [targetJobId, setTargetJobId] = useState(activeJobId);

  if (!isOpen || !candidate) return null;

  const handleLink = () => {
    onConfirmLink(candidate.id, targetJobId);
    onClose();
  };

  const jobOptions = jobs
    .filter((j) => j.status === 'activa')
    .map((j) => ({
      value: j.id,
      label: `${j.code} · ${j.title} (${j.category})`,
    }));

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Vincular perfil a nueva convocatoria"
      subtitle={`Candidato: ${candidate.name}`}
      maxWidth="560px"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button variant="primary" icon={<ArrowRight size={15} />} onClick={handleLink}>
            Crear nueva postulación
          </Button>
        </>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
        {/* Aviso de regla fundamental de negocio (Sección 17) */}
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '0.65rem',
            padding: '0.85rem',
            backgroundColor: 'var(--bg-base)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-subtle)',
            fontSize: '0.8125rem',
            color: 'var(--text-secondary)',
            lineHeight: 1.45,
          }}
        >
          <Info size={17} style={{ color: 'var(--primary-red)', flexShrink: 0, marginTop: '0.1rem' }} />
          <div>
            <strong style={{ color: 'var(--text-primary)' }}>Regla de evaluación independiente:</strong> Al
            vincular a esta persona se creará una <em>nueva postulación</em> con evaluación pendiente para el nuevo puesto.
            Nunca se reutilizan ni copian los puntajes de la convocatoria anterior como si fueran una evaluación nueva.
          </div>
        </div>

        <Select
          label="Seleccione la convocatoria de destino"
          value={targetJobId}
          onChange={(e) => setTargetJobId(e.target.value)}
          options={jobOptions}
          required
        />
      </div>
    </Modal>
  );
}
