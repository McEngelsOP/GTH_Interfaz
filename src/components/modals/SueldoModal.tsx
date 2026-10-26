import { useState } from 'react';
import type { Application, Candidate, JobPosting } from '../../types/index.ts';
import type { SueldoAviso } from '../../services/useSueldoAviso.ts';
import { Modal } from '../common/Modal.tsx';
import { ComparacionSalarial } from '../candidate/ComparacionSalarial.tsx';

export function SueldoModal({ job, applications, candidates, applicationId, sueldo, onClose }: {
  job: JobPosting; applications: Application[]; candidates: Candidate[]; applicationId: string | null; sueldo: SueldoAviso; onClose: () => void;
}) {
  const [seleccion, setSeleccion] = useState(applicationId || applications[0]?.id || '');
  const app = applications.find(a => a.id === seleccion);
  const nombres = new Map(candidates.map(c => [c.id, c.name]));
  return <Modal isOpen onClose={onClose} title="Sueldo" subtitle={`${job.code} · ${job.title}`} maxWidth="660px">
    <div className="sueldo-selector">
      <label htmlFor="postulacion-sueldo">Postulante</label>
      <select id="postulacion-sueldo" className="focus-ring" value={app?.id || ''} onChange={e => setSeleccion(e.target.value)} disabled={!applications.length}>
        {!app && <option value="">{applications.length ? 'Selecciona un postulante' : 'Aún no hay postulantes'}</option>}
        {applications.map(a => <option key={a.id} value={a.id}>{nombres.get(a.candidateId) || 'Candidato'}</option>)}
      </select>
    </div>
    <ComparacionSalarial job={job} app={app} sueldo={sueldo} />
  </Modal>;
}
