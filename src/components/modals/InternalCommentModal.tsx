import React, { useId, useState } from 'react';
import { Modal } from '../common/Modal.tsx';
import { Button } from '../common/Button.tsx';
import { COMMENT_MAX_LENGTH } from '../../services/internalComments.ts';

export function InternalCommentModal({ name, initialText, onSave, onClose, shared = false }: { name: string; initialText: string; shared?: boolean; onSave: (text: string) => void | Promise<void>; onClose: () => void }) {
  const [text, setText] = useState(initialText);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const save = async () => {
    setSaving(true); setError('');
    try { await onSave(text); onClose(); }
    catch (err) { setError(err instanceof Error ? err.message : 'No se pudo guardar. Reintenta.'); }
    finally { setSaving(false); }
  };
  const inputId = useId();
  return <Modal isOpen onClose={() => { if (!saving) onClose(); }} title="Comentario interno" subtitle={`Candidato: ${name}`} maxWidth="500px"
    footer={<><Button variant="ghost" disabled={saving} onClick={onClose}>Cancelar</Button><Button variant="primary" disabled={saving} onClick={() => void save()}>{saving ? 'Guardando…' : initialText && !text.trim() ? 'Eliminar comentario' : 'Guardar comentario'}</Button></>}>
    <p style={{ marginBottom: '0.8rem', fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>{shared ? 'Se comparte con el equipo en Supabase. El postulante no lo ve.' : 'Solo se guarda en esta computadora, en este navegador.'} Deja el campo vacío para borrar el comentario.</p>
    {error && <p role="alert" style={{ color: 'var(--status-failed-text)', marginBottom: '0.8rem' }}>No se guardó el comentario. {error} Tu texto sigue aquí para reintentar.</p>}
    <label htmlFor={inputId} style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.8125rem', color: 'var(--text-primary)' }}>Comentario</label>
    <textarea id={inputId} disabled={saving} value={text} maxLength={COMMENT_MAX_LENGTH} rows={5} className="focus-ring" onChange={(event) => setText(event.target.value)}
      style={{ width: '100%', padding: '0.75rem', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)', background: 'var(--bg-surface)', color: 'var(--text-primary)', font: 'inherit', resize: 'vertical' }} />
    <p style={{ marginTop: '0.4rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{text.length} / {COMMENT_MAX_LENGTH}</p>
  </Modal>;
}
