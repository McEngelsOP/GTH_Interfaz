import { History } from 'lucide-react';
import { useApp } from '../../context/AppContext.tsx';
import type { Candidate, JobPosting } from '../../types/index.ts';
import { useHistorialPostulaciones } from '../../services/postulaciones.ts';
import { fechaHora } from '../../services/bumeranSync.ts';
import { formatEmbeddingScore } from '../../services/embeddingMatching.ts';
import { Button } from '../common/Button.tsx';
import '../../styles/postulaciones.css';

export function PostulacionesPanel({ candidate, job }: { candidate: Candidate; job: JobPosting }) {
  const { appState } = useApp();
  const { rows, loading, error, remoto, reload } = useHistorialPostulaciones(candidate, job, appState);
  return <section className="postulaciones" aria-label="Historial de postulaciones" aria-busy={loading}>
    <div className="postulaciones-intro">
      <h3>Historial de postulaciones</h3>
      <p>{remoto ? 'Procesos registrados que tienes permiso para consultar, del más reciente al más antiguo.' : 'Postulaciones y fechas registradas en este dispositivo.'}</p>
    </div>
    {loading ? <div role="status" className="postulaciones-cargando">
      <span>Cargando postulaciones…</span>
      {[0, 1, 2].map((n) => <div key={n} className="postulaciones-esqueleto" aria-hidden="true" />)}
    </div> : error ? <div className="postulaciones-mensaje" role="alert">
      <p>{error}</p><Button variant="secondary" size="sm" onClick={reload}>Reintentar</Button>
    </div> : rows.length ? <>
      <p className="postulaciones-total" role="status"><History size={15} aria-hidden="true" />
        {rows.length === 1 ? '1 proceso registrado' : `${rows.length} procesos registrados`}
      </p>
      <ol className="postulaciones-lista">
        {rows.map((row) => <li key={row.aviso_id}>
          <div className="postulaciones-datos">
            <strong>{row.titulo || `Aviso ${row.aviso_id}`}</strong>
            <div className="postulaciones-detalle"><span>Aviso {row.aviso_id}</span>
              <span>{row.fecha ? fechaHora(row.fecha) : 'Fecha no disponible'}</span>
              {row.aviso_id === (job.bumeran?.avisoId || job.id) && <span className="postulaciones-actual">Este proceso</span>}
            </div>
          </div>
          <div className="postulaciones-score">
            {row.score !== null ? <><span>Score del aviso</span><strong className="tabular-nums">{formatEmbeddingScore(row.score)}</strong></>
              : <span>Sin puntaje vigente</span>}
          </div>
        </li>)}
      </ol>
      <p className="postulaciones-nota">Cada puntaje corresponde a los requisitos de su aviso y se interpreta dentro de ese proceso.</p>
    </> : <div className="postulaciones-mensaje"><p>No hay postulaciones disponibles para este perfil.</p></div>}
  </section>;
}
