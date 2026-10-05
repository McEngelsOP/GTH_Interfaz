import { useEffect, useState } from 'react';
import { Modal } from '../common/Modal.tsx';
import { Button } from '../common/Button.tsx';
import type { Application, Candidate, JobPosting } from '../../types/index.ts';
import { UserX } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  applications: Application[];
  expectedCount: number;
  candidates: Candidate[];
  job: JobPosting;
  onConfirm: (ids: string[], reason: string) => boolean;
}

export function BulkReleaseModal({ isOpen, onClose, applications, expectedCount, candidates, job, onConfirm }: Props) {
  const [reason, setReason] = useState('');
  useEffect(() => { if (isOpen) setReason(''); }, [isOpen, job.id]);
  const valid = applications.length > 0 && applications.length === expectedCount && job.status === 'activa' && applications.every(app =>
    app.jobPostingId === job.id && app.stage !== 'no_continua' && app.stage !== 'contratado');
  return <Modal isOpen={isOpen} onClose={onClose} title="Descartar postulantes marcados"
    subtitle={`${applications.length} postulaciones · ${job.code}`} maxWidth="600px" footer={<>
      <Button variant="ghost" onClick={onClose}>Cancelar</Button>
      <Button variant="danger" icon={<UserX size={16} />} disabled={!valid || !reason.trim()}
        onClick={() => { if (onConfirm(applications.map(app => app.id), reason.trim())) onClose(); }}>
        Confirmar descarte ({applications.length})
      </Button>
    </>}>
    <p style={{ fontSize:'.875rem', color:'var(--text-secondary)', marginBottom:'1rem' }}>
      Estas postulaciones pasarán a No continúan. Se conservan los perfiles, evaluaciones y evidencias, y se registra el motivo por cada expediente.
    </p>
    {!valid && <p role="alert">El lote cambió o contiene expedientes cerrados. Cierra este diálogo y revisa la selección.</p>}
    <ul aria-label="Postulantes a descartar" style={{ maxHeight:'200px', overflowY:'auto', paddingLeft:'1.25rem', marginBottom:'1rem', fontSize:'.875rem' }}>
      {applications.map(app => <li key={app.id}>{candidates.find(candidate => candidate.id === app.candidateId)?.name || 'Candidato'}</li>)}
    </ul>
    <label htmlFor="bulk-release-reason" style={{ display:'block', fontSize:'.875rem', fontWeight:600, marginBottom:'.5rem' }}>Motivo del descarte</label>
    <textarea id="bulk-release-reason" value={reason} onChange={event => setReason(event.target.value)} rows={3} className="focus-ring"
      style={{ width:'100%', padding:'.75rem', color:'var(--text-primary)', background:'var(--bg-surface)', border:'1px solid var(--border-default)', borderRadius:'var(--radius-sm)', font:'inherit' }} />
  </Modal>;
}
