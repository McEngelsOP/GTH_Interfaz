import React, { useState } from 'react';
import { Modal } from '../common/Modal.tsx';
import { Button } from '../common/Button.tsx';
import { Application, Stage } from '../../types/index.ts';
import { StageBadge } from '../candidate/StageBadge.tsx';

export function StageDecisionModal({ application, target, candidateName, onClose, onConfirm }: {
  application: Application; target: Stage; candidateName: string; onClose: () => void; onConfirm: (reason: string) => void;
}) {
  const [reason, setReason] = useState('');
  return <Modal isOpen onClose={onClose} title="Confirmar cambio de etapa" subtitle={candidateName}
    footer={<><Button variant="ghost" onClick={onClose}>Cancelar</Button>
      <Button disabled={!reason.trim()} onClick={() => { onConfirm(reason.trim()); onClose(); }}>Confirmar cambio</Button></>}>
    <p style={{ marginBottom: '1rem' }}>El expediente pasará de <StageBadge stage={application.stage} /> a <StageBadge stage={target} />. La decisión quedará registrada en el historial.</p>
    <label style={{ display: 'grid', gap: '0.5rem' }}>Motivo de la decisión
      <textarea className="focus-ring" value={reason} onChange={(e) => setReason(e.target.value)} rows={3}
        style={{ padding: '0.75rem', color: 'var(--text-primary)', background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)' }} />
    </label>
  </Modal>;
}
