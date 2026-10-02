import React, { useState } from 'react';
import { Modal } from '../common/Modal.tsx';
import { Button } from '../common/Button.tsx';
import { StickyNote } from 'lucide-react';

interface NoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  candidateName: string;
  onSaveNote: (note: string) => void;
}

export function NoteModal({ isOpen, onClose, candidateName, onSaveNote }: NoteModalProps) {
  const [note, setNote] = useState('');
  const [error, setError] = useState('');

  const handleSave = () => {
    if (!note.trim()) {
      setError('Por favor escriba el texto de la nota');
      return;
    }
    onSaveNote(note.trim());
    setNote('');
    setError('');
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Añadir nota de evaluación"
      subtitle={`Candidato: ${candidateName}`}
      maxWidth="500px"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button variant="primary" icon={<StickyNote size={15} />} onClick={handleSave}>
            Guardar nota
          </Button>
        </>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
        <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
          Esta nota quedará registrada con fecha, hora y autor en la pestaña de Actividad de esta postulación.
        </p>

        <textarea
          value={note}
          onChange={(e) => {
            setNote(e.target.value);
            setError('');
          }}
          placeholder="Escriba aquí observaciones de la entrevista, validaciones telefónicas o acuerdos del comité..."
          rows={5}
          className="focus-ring"
          style={{
            width: '100%',
            padding: '0.75rem',
            fontSize: '0.875rem',
            color: 'var(--text-primary)',
            backgroundColor: 'var(--bg-surface)',
            border: `1px solid ${error ? '#DC2626' : 'var(--border-default)'}`,
            borderRadius: 'var(--radius-sm)',
            outline: 'none',
            fontFamily: 'inherit',
          }}
        />

        {error && <span style={{ fontSize: '0.75rem', color: '#DC2626', fontWeight: 500 }}>{error}</span>}
      </div>
    </Modal>
  );
}
