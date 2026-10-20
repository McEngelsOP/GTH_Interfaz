import { useState } from 'react';
import { Save } from 'lucide-react';
import { Modal } from '../common/Modal.tsx';
import { Button } from '../common/Button.tsx';
import type { Application, Candidate, JobPosting } from '../../types/index.ts';
import { faltantesRegistro, procesoSugerido, PROCESOS_MULTITEST, registroMultitest, type AsignacionMultitest } from '../../services/multitest.ts';

interface Props {
  job: JobPosting;
  applications: Application[];
  candidates: Map<string, Candidate>;
  asignacion: AsignacionMultitest;
  /** Postulaciones a las que ya se envió Multitest. */
  enviados: Set<string>;
  onSave: (asignacion: AsignacionMultitest) => void;
  onClose: () => void;
}

/** Proceso de Multitest de cada preseleccionado. El envío lo hace «Enviar Multitest». */
export function MultitestConfigModal({ job, applications, candidates, asignacion, enviados, onSave, onClose }: Props) {
  const sugerido = procesoSugerido(job.title);
  const [procesos, setProcesos] = useState<AsignacionMultitest>(() =>
    Object.fromEntries(applications.map((a) => [a.id, asignacion[a.id] || sugerido])));

  const filas = applications.map((app) => {
    const candidate = candidates.get(app.candidateId);
    const faltan = candidate ? faltantesRegistro(registroMultitest(candidate, procesos[app.id] || '')) : ['datos del candidato'];
    return { app, candidate, faltan };
  });

  return <Modal isOpen onClose={onClose} title="Configurar Multitest" subtitle={job.title} maxWidth="780px"
    footer={<>
      <Button variant="ghost" onClick={onClose}>Cerrar</Button>
      <Button icon={<Save size={16} />} onClick={() => { onSave(procesos); onClose(); }} disabled={!filas.length}>Guardar</Button>
    </>}>
    <div className="workflow-compose">
      <p className="workflow-help">Elige el proceso de Multitest de cada preseleccionado. Al usar «Enviar Multitest», cada candidato se agrega
        a su proceso y Multitest le envía el correo con la prueba.</p>
      <div className="workflow-recipient-heading"><h3>Preseleccionados · {filas.length}</h3></div>
      {!filas.length && <p className="workflow-help">No hay candidatos en Preseleccionado.</p>}
      {filas.length > 0 && <ul className="multitest-asignacion" aria-label="Proceso de Multitest por candidato">
        {filas.map(({ app, candidate, faltan }) => <li key={app.id} className="multitest-fila">
          <div className="multitest-candidato">
            <strong>{candidate?.name || 'Candidato'}</strong>
            <small>Puesto: {job.title}</small>
            {enviados.has(app.id) && <small>Multitest ya enviado</small>}
            {faltan.length > 0 && !enviados.has(app.id) && <small className="multitest-falta">Falta: {faltan.join(', ')}</small>}
          </div>
          <select aria-label={`Proceso de Multitest para ${candidate?.name || 'el candidato'}`} value={procesos[app.id] || ''}
            onChange={(e) => setProcesos((prev) => ({ ...prev, [app.id]: e.target.value }))}>
            <option value="">Elegir proceso…</option>
            {PROCESOS_MULTITEST.map((p) => <option key={p.id} value={p.id}>{p.id} · {p.nombre}</option>)}
          </select>
        </li>)}
      </ul>}
    </div>
  </Modal>;
}
