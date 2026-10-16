import type { Application, Candidate, JobPosting } from '../../types/index.ts';
import { Check, Info, Minus, X } from 'lucide-react';
import { argumentosPorRequisito } from '../../services/perfilBumeran.ts';
import { embeddingVigente } from '../../services/rankingEmbeddings.ts';
import { formatEmbeddingScore } from '../../services/embeddingMatching.ts';
import { StageBadge } from './StageBadge.tsx';
import { Button } from '../common/Button.tsx';
import '../../styles/comparisonChart.css';

const LEVELS = [
  { label: 'Alta', range: '70 % o más', className: 'strong', Icon: Check },
  { label: 'Media', range: '40 a 69 %', className: 'medium', Icon: Info },
  { label: 'Baja', range: 'menos de 40 %', className: 'low', Icon: X },
  { label: 'Sin datos', range: '', className: 'missing', Icon: Minus },
];
const levelOf = (pct: number | null) => pct === null ? 3 : pct >= 70 ? 0 : pct >= 40 ? 1 : 2;

interface ComparisonChartProps {
  applications: Application[];
  candidates: Map<string, Candidate>;
  job: JobPosting;
  positions: Map<string, number>;
  onRemove: (id: string) => void;
  onViewProfile: (application: Application) => void;
}

export function ComparisonChart({ applications, candidates, job, positions, onRemove, onViewProfile }: ComparisonChartProps) {
  return <section className="comparison-chart" aria-labelledby="comparison-chart-title">
    <div className="comparison-visual-heading">
      <h3 id="comparison-chart-title">Comparación visual de candidatos</h3>
      <ul className="comparison-level-legend" aria-label="Niveles de similitud">
        {LEVELS.map(({ label, range, className, Icon }) => <li key={label} className={`comparison-level-${className}`}>
          <Icon size={16} aria-hidden="true" />{label}{range && ` · ${range}`}
        </li>)}
      </ul>
    </div>
    <div className="comparison-cards">
      {applications.map(app => {
        const candidate = candidates.get(app.candidateId);
        const name = candidate?.name || 'Candidato';
        const requisitos = argumentosPorRequisito(app, candidate, job).requisitos;
        const total = embeddingVigente(app, job)?.score ?? null;
        const groups = LEVELS.map((_, index) => requisitos.filter(r => levelOf(r.pct) === index));
        const segments = groups.flat();
        const segmentLength = requisitos.length ? 100 / requisitos.length : 0;
        const gap = requisitos.length > 1 ? Math.min(1.2, segmentLength * .18) : 0;
        const summary = groups.map((items, i) => `${LEVELS[i].label}: ${items.length}`).join(', ');
        return <article key={app.id} className="comparison-card" aria-label={`Ficha de ${name}`}>
          <header className="comparison-card-heading">
            <span className="comparison-avatar" aria-hidden="true">{name.trim().split(/\s+/).slice(0, 2).map(word => word[0]).join('')}</span>
            <div className="comparison-identity"><h4 title={name}>{name}</h4><p title={[candidate?.currentTitle, candidate?.currentCompany].filter(Boolean).join(' · ')}>{[candidate?.currentTitle, candidate?.currentCompany].filter(Boolean).join(' · ') || 'Sin información profesional'}</p></div>
            {positions.has(app.id) && <span className="comparison-rank" title="Puesto en el ranking">#{positions.get(app.id)}</span>}
            <button type="button" className="comparison-remove focus-ring" aria-label={`Quitar ${name} de la comparación`} onClick={() => onRemove(app.id)}><X size={16} /></button>
          </header>
          <div className={`comparison-score comparison-level-${LEVELS[levelOf(total === null ? null : total * 100)].className}`}>
            <div><span>Puntaje</span><strong className="tabular-nums">{total === null ? '—' : formatEmbeddingScore(total)}</strong></div>
            <div className="comparison-score-track" role="img" aria-label={`Puntaje de ${name}: ${total === null ? 'sin datos' : `${formatEmbeddingScore(total)} de 1`}. Marca de referencia en 0.70.`}>
              {total !== null && <span style={{ width: `${Math.max(0, Math.min(1, total)) * 100}%` }} />}
              <i aria-hidden="true" />
            </div>
          </div>
          {requisitos.length ? <div className="comparison-requirements">
            <svg className="comparison-ring" viewBox="0 0 100 100" role="img" aria-label={`Requisitos de ${name}: ${summary}`}>
              <g transform="rotate(-90 50 50)">
                <circle className="comparison-ring-base" cx="50" cy="50" r="38" />
                {segments.map((r, index) => <circle key={r.id} className={`comparison-ring-arc comparison-level-${LEVELS[levelOf(r.pct)].className}`} cx="50" cy="50" r="38" pathLength="100"
                  strokeDasharray={`${segmentLength - gap} ${100 - segmentLength + gap}`} strokeDashoffset={-index * segmentLength} />)}
              </g>
              <text className="comparison-ring-value" x="50" y="53">{groups[0].length}/{requisitos.length}</text>
              <text className="comparison-ring-caption" x="50" y="65">en Alta</text>
            </svg>
            <ul className="comparison-requirement-levels" aria-label={`Requisitos por nivel de ${name}`}>
              {LEVELS.map(({ label, className, Icon }, index) => <li key={label} className={`comparison-level-${className}`}>
                <Icon size={16} aria-hidden="true" /><span>{label}</span>
                <div className="comparison-chips">{groups[index].length ? groups[index].map(r => <span key={r.id} className="comparison-chip" tabIndex={0} aria-label={`${r.codigo}: ${r.label}, ${r.pct === null ? 'sin datos' : `${r.pct} %`}`} title={`${r.label} · ${r.pct === null ? 'Sin datos' : `${r.pct} %`}`}>
                  <b>{r.codigo}</b>{r.pct !== null && <span className="tabular-nums">{r.pct}%</span>}
                </span>) : <span className="comparison-no-requirements">—</span>}</div>
              </li>)}
            </ul>
          </div> : <p className="comparison-no-criteria">No hay requisitos configurados para comparar.</p>}
          <footer className="comparison-card-footer"><StageBadge stage={app.stage} size="sm" /><Button variant="secondary" size="sm" onClick={() => onViewProfile(app)}>Ver perfil</Button></footer>
        </article>;
      })}
    </div>
    <p className="comparison-visual-note">Cada tramo del anillo representa un requisito. Los colores indican similitud, no cumplimiento acreditado. «Sin datos» no equivale a cero. Revisa la evidencia en las columnas de detalle antes de decidir.</p>
  </section>;
}
