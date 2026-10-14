import React, { useId, useState } from 'react';
import { Modal } from '../common/Modal.tsx';
import { Button } from '../common/Button.tsx';
import { COMMENT_MAX_LENGTH } from '../../services/internalComments.ts';

export function InternalCommentModal({ name, initialText, onSave, onClose }: { name: string; initialText: string; onSave: (text: string) => void; onClose: () => void }) {
  const [text, setText] = useState(initialText);
  const inputId = useId();
  return <Modal isOpen onClose={onClose} title="Comentario interno" subtitle={`Candidato: ${name}`} maxWidth="500px"
    footer={<><Button variant="ghost" onClick={onClose}>Cancelar</Button><Button variant="primary" onClick={() => { onSave(text); onClose(); }}>{initialText && !text.trim() ? 'Eliminar comentario' : 'Guardar comentario'}</Button></>}>
    <p style={{ marginBottom: '0.8rem', fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>Solo se guarda en esta computadora, en este navegador. No lo ve el postulante ni el resto del equipo. Deja el campo vacío para borrar el comentario.</p>
    <label htmlFor={inputId} style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.8125rem', color: 'var(--text-primary)' }}>Comentario</label>
    <textarea id={inputId} value={text} maxLength={COMMENT_MAX_LENGTH} rows={5} className="focus-ring" onChange={(event) => setText(event.target.value)}
      style={{ width: '100%', padding: '0.75rem', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)', background: 'var(--bg-surface)', color: 'var(--text-primary)', font: 'inherit', resize: 'vertical' }} />
    <p style={{ marginTop: '0.4rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{text.length} / {COMMENT_MAX_LENGTH}</p>
  </Modal>;
}
