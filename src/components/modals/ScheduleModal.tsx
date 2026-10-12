import React, { useState } from 'react';
import { Modal } from '../common/Modal.tsx';
import { Button } from '../common/Button.tsx';
import { Input } from '../common/Input.tsx';
import { Calendar, Info } from 'lucide-react';

interface ScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  candidateName: string;
  onSchedule: (data: { title: string; scheduledAt: string; locationOrLink: string; notes?: string }) => void;
}

export function ScheduleModal({ isOpen, onClose, candidateName, onSchedule }: ScheduleModalProps) {
  const [title, setTitle] = useState('Entrevista de Evaluación de Competencias');
  const [scheduledAt, setScheduledAt] = useState('');
  const [locationOrLink, setLocationOrLink] = useState('Campus Monterrico - Pabellón A / Aula 204');
  const [notes, setNotes] = useState('');
  const [dateError, setDateError] = useState('');

  const handleSave = () => {
    if (!title.trim() || !locationOrLink.trim() || !scheduledAt || !Number.isFinite(new Date(scheduledAt).getTime())) {
      setDateError('Ingrese el título, lugar y una fecha y hora válidos para la entrevista');
      return;
    }
    setDateError('');

    onSchedule({
      title,
      scheduledAt,
      locationOrLink,
      notes,
    });

    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Agendar entrevista de evaluación"
      subtitle={`Candidato: ${candidateName}`}
      maxWidth="540px"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button variant="primary" icon={<Calendar size={16} />} onClick={handleSave} disabled={!title.trim() || !locationOrLink.trim() || !scheduledAt}>
            Guardar registro de entrevista
          </Button>
        </>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {/* Aviso transparente de no-automatización */}
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '0.65rem',
            padding: '0.75rem',
            backgroundColor: 'var(--bg-base)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-subtle)',
            fontSize: '0.8125rem',
            color: 'var(--text-secondary)',
          }}
        >
          <Info size={16} style={{ color: 'var(--text-muted)', flexShrink: 0, marginTop: '0.1rem' }} />
          <span>
          Registrar esta entrevista crea un registro local con estado «Invitación pendiente». No envía
            invitaciones por correo, no conecta un calendario externo ni mueve automáticamente a la persona a la etapa
            «En entrevista».
          </span>
        </div>

        <Input
          label="Título de la sesión"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />

        <Input
          label="Fecha y hora de la cita"
          type="datetime-local"
          value={scheduledAt}
          onChange={(e) => {
            setScheduledAt(e.target.value);
            setDateError('');
          }}
          error={dateError}
          required
        />

        <Input
          label="Lugar o enlace virtual"
          value={locationOrLink}
          onChange={(e) => setLocationOrLink(e.target.value)}
          placeholder="Ej: Sala Zoom, Google Meet o Campus Monterrico"
          required
        />

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
          <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)' }}>
            Observaciones o panel evaluador (opcional)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Comité evaluador, temas prioritarios a profundizar..."
            className="focus-ring"
            style={{
              width: '100%',
              padding: '0.6rem 0.75rem',
              fontSize: '0.875rem',
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


