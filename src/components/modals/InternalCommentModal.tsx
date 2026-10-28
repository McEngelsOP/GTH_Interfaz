import React, { useId, useState } from 'react';
import { Flag } from 'lucide-react';
import { Modal } from '../common/Modal.tsx';
import { Button } from '../common/Button.tsx';
import { COMMENT_MAX_LENGTH, type Bandera } from '../../services/internalComments.ts';

export const NOMBRE_BANDERA: Record<Bandera, string> = { roja: 'Red flag', verde: 'Green flag' };

/** Bandera del comentario como ícono (tabla del ranking, Base centralizada). */
export function IconoBandera({ bandera }: { bandera?: Bandera | null }) {
  if (!bandera) return null;
  return <Flag size={14} className={`comentario-bandera comentario-bandera--${bandera}`} aria-label={NOMBRE_BANDERA[bandera]} role="img"
    fill="currentColor" />;
}

export function InternalCommentModal({ name, initialText, initialFlag = null, onSave, onClose, shared = false }: {
  name: string; initialText: string; initialFlag?: Bandera | null; shared?: boolean;
  onSave: (text: string, flag: Bandera | null) => void | Promise<void>; onClose: () => void;
}) {
  const [text, setText] = useState(initialText);
  const [flag, setFlag] = useState<Bandera | null>(initialFlag);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const save = async () => {
    setSaving(true); setError('');
    try { await onSave(text, flag); onClose(); }
    catch (err) { setError(err instanceof Error ? err.message : 'No se pudo guardar. Reintenta.'); }
    finally { setSaving(false); }
  };
  const inputId = useId();
  const borra = (initialText || initialFlag) && !text.trim() && !flag;
  return <Modal isOpen onClose={() => { if (!saving) onClose(); }} title="Comentario interno" subtitle={`Candidato: ${name}`} maxWidth="500px"
    footer={<><Button variant="ghost" disabled={saving} onClick={onClose}>Cancelar</Button><Button variant="primary" disabled={saving} onClick={() => void save()}>{saving ? 'Guardando…' : borra ? 'Eliminar comentario' : 'Guardar comentario'}</Button></>}>
    <p style={{ marginBottom: '0.8rem', fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>{shared ? 'Se comparte con el equipo en Supabase. El postulante no lo ve.' : 'Solo se guarda en esta computadora, en este navegador.'} Deja el campo vacío y sin bandera para borrar el comentario.</p>
    {error && <p role="alert" style={{ color: 'var(--status-failed-text)', marginBottom: '0.8rem' }}>No se guardó el comentario. {error} Tu texto sigue aquí para reintentar.</p>}
    <div role="group" aria-label="Bandera del comentario" className="comentario-banderas">
      {(['roja', 'verde'] as Bandera[]).map((b) => (
        <button key={b} type="button" disabled={saving} aria-pressed={flag === b} onClick={() => setFlag(flag === b ? null : b)}
          className={`comentario-bandera-opcion comentario-bandera-opcion--${b} focus-ring`}
          title={flag === b ? 'Quitar la bandera' : `Marcar ${NOMBRE_BANDERA[b]}`}>
          <Flag size={14} fill={flag === b ? 'currentColor' : 'none'} /> {NOMBRE_BANDERA[b]}
        </button>
      ))}
    </div>
    <label htmlFor={inputId} style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.8125rem', color: 'var(--text-primary)' }}>Comentario</label>
    <textarea id={inputId} disabled={saving} value={text} maxLength={COMMENT_MAX_LENGTH} rows={5} className="focus-ring" onChange={(event) => setText(event.target.value)}
      style={{ width: '100%', padding: '0.75rem', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)', background: 'var(--bg-surface)', color: 'var(--text-primary)', font: 'inherit', resize: 'vertical' }} />
    <p style={{ marginTop: '0.4rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{text.length} / {COMMENT_MAX_LENGTH}</p>
  </Modal>;
}
