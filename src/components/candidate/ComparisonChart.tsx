import React, { useEffect, useMemo, useState } from 'react';
import type { Application, Candidate, JobPosting } from '../../types/index.ts';
import { argumentosPorRequisito } from '../../services/perfilBumeran.ts';
import { embeddingVigente } from '../../services/rankingEmbeddings.ts';
import { formatEmbeddingScore } from '../../services/embeddingMatching.ts';
import '../../styles/comparisonChart.css';

const COLORS = ['#2563EB', '#0D9488', '#8B5CF6', '#B45309', '#DB2777', '#475569'];

export function ComparisonChart({ applications, candidates, job }: { applications: Application[]; candidates: Map<string, Candidate>; job: JobPosting }) {
  const ids = applications.map((app) => app.candidateId).join('|');
  const [colors, setColors] = useState(() => new Map(applications.map((app, i) => [app.candidateId, COLORS[i % COLORS.length]])));
  useEffect(() => {
    setColors((previous) => {
      const active = new Set(applications.map((app) => app.candidateId));
      const next = new Map([...previous].filter(([id]) => active.has(id)));
      for (const app of applications) {
        if (!next.has(app.candidateId)) next.set(app.candidateId, COLORS.find((color) => ![...next.values()].includes(color)) || COLORS[next.size % COLORS.length]);
      }
      return next;
    });
  }, [ids]);
  const series = useMemo(() => applications.map((app) => ({
    app, name: candidates.get(app.candidateId)?.name || 'Candidato',
    requisitos: argumentosPorRequisito(app, candidates.get(app.candidateId), job).requisitos,
    total: embeddingVigente(app, job)?.score ?? null,
  })), [applications, candidates, job]);

  return <section className="comparison-chart" aria-labelledby="comparison-chart-title">
    <h3 id="comparison-chart-title">Comparación visual de candidatos</h3>
    <p>Compara el score del aviso y detecta qué requisitos conviene revisar en la entrevista.</p>
    <ul className="comparison-chart-legend" aria-label="Leyenda de candidatos">
      {series.map(({ app, name }) => <li key={app.id}><span aria-hidden="true" style={{ backgroundColor: colors.get(app.candidateId) }} />{name}</li>)}
    </ul>
    <section aria-labelledby="comparison-score-title" className="comparison-overview">
      <h4 id="comparison-score-title">Score general</h4>
      <p>Escala de 0 a 1 dentro de esta convocatoria. Un score mayor indica mayor similitud relativa.</p>
      <div className="comparison-score-axis" aria-hidden="true"><span>0</span><span>0,5</span><span>1</span></div>
      {series.map(({ app, name, total }) => <div key={app.id} className="comparison-chart-bar-row">
        <span className="comparison-chart-name" title={name}>{name}</span>
        <div className="comparison-chart-track" role="img" aria-label={`${name}: score ${total === null ? 'pendiente' : formatEmbeddingScore(total)}`}>
          {total !== null && <div className="comparison-chart-fill" style={{ width: `${Math.max(0, Math.min(1, total)) * 100}%`, background: colors.get(app.candidateId) }} />}
        </div>
        <strong className="comparison-chart-value tabular-nums">{total === null ? 'Pendiente' : formatEmbeddingScore(total)}</strong>
      </div>)}
    </section>
    <section aria-labelledby="comparison-coverage-title" className="comparison-overview">
      <h4 id="comparison-coverage-title">Requisitos para orientar la entrevista</h4>
      <p>Cantidad de requisitos según su similitud con el perfil. Cada requisito cuenta una vez, sin aplicar pesos.</p>
      <ul className="comparison-chart-legend comparison-coverage-legend" aria-label="Niveles de similitud">
        <li><span className="coverage-strong" />Alta (≥ 70 %)</li>
        <li><span className="coverage-medium" />Media (40–69 %)</li>
        <li><span className="coverage-low" />Baja (&lt; 40 %)</li>
        <li><span className="coverage-missing" />Sin datos</li>
      </ul>
      {job.criteria.length === 0 ? <p>No hay requisitos configurados para comparar.</p> : <div className="comparison-donuts">
        {series.map(({ app, name, requisitos }) => {
          const counts = [requisitos.filter(r => r.pct !== null && r.pct >= 70).length,
            requisitos.filter(r => r.pct !== null && r.pct >= 40 && r.pct < 70).length,
            requisitos.filter(r => r.pct !== null && r.pct < 40).length,
            requisitos.filter(r => r.pct === null).length];
          const levels = ['Alta', 'Media', 'Baja', 'Sin datos'];
          const classes = ['coverage-strong', 'coverage-medium', 'coverage-low', 'coverage-missing'];
          const label = `${name}: ${counts[0]} de similitud alta, ${counts[1]} media, ${counts[2]} baja y ${counts[3]} sin datos`;
          let offset = 0;
          return <figure key={app.id} className="comparison-donut">
            <figcaption>{name}</figcaption>
            <svg viewBox="0 0 120 120" role="img" aria-label={label}>
              <circle cx="60" cy="60" r="44" fill="none" stroke="var(--bg-muted)" strokeWidth="16" />
              {counts.map((count, index) => {
                const percent = count / requisitos.length * 100;
                const position = offset; offset += percent;
                return count > 0 ? <circle key={index} className={classes[index]} cx="60" cy="60" r="44" fill="none" strokeWidth="16"
                  pathLength="100" strokeDasharray={`${percent} ${100 - percent}`} strokeDashoffset={-position} transform="rotate(-90 60 60)" /> : null;
              })}
              <text x="60" y="59" textAnchor="middle" className="comparison-donut-total">{requisitos.length}</text>
              <text x="60" y="75" textAnchor="middle" className="comparison-donut-caption">requisitos</text>
            </svg>
            <ul aria-label={`Distribución de ${name}`}>
              {counts.map((count, index) => <li key={levels[index]}><span className={classes[index]} aria-hidden="true" />{levels[index]}<strong className="tabular-nums">{count}</strong></li>)}
            </ul>
          </figure>;
        })}
      </div>}
    </section>
    <section aria-labelledby="comparison-heatmap-title" className="comparison-heatmap">
      <h4 id="comparison-heatmap-title">Mapa de similitud por requisito</h4>
      <p>Cada columna es un candidato. Compara los porcentajes de una misma fila para ver quién tiene mayor similitud con ese requisito.</p>
      {job.criteria.length > 0 && <p className="comparison-heatmap-hint">Desliza la tabla para ver todos los candidatos.</p>}
      {job.criteria.length > 0 && <div className="comparison-heatmap-scroll focus-ring" tabIndex={0} role="region" aria-label="Mapa de similitud, desplazamiento horizontal">
        <table aria-label="Similitud por requisito y candidato, de 0 a 100 por ciento">
          <thead><tr><th scope="col">Requisito del puesto</th>{series.map(({ app, name }) => <th scope="col" key={app.id}>{name}</th>)}</tr></thead>
          <tbody>{job.criteria.map((criterion, index) => <tr key={criterion.id}>
            <th scope="row"><span>R{index + 1}</span> {criterion.label}<small>Peso: {criterion.weightPct} %</small></th>
            {series.map(({ app, name, requisitos }) => {
              const pct = requisitos.find(r => r.id === criterion.id)?.pct ?? null;
              const level = pct === null ? 'missing' : pct >= 70 ? 'strong' : pct >= 40 ? 'medium' : 'low';
              const value = pct === null ? 'Sin datos' : `${pct} %`;
              return <td key={app.id} className={`heatmap-${level}`} aria-label={`R${index + 1} · ${criterion.label}: ${name}, ${value}`}>
                <strong className="tabular-nums">{value}</strong>
                {pct !== null && <small>{pct >= 70 ? 'Alta' : pct >= 40 ? 'Media' : 'Baja'}</small>}
              </td>;
            })}
          </tr>)}</tbody>
        </table>
      </div>}
    </section>
    <p>Los colores representan similitud, no cumplimiento acreditado. «Sin datos» no equivale a cero. Revisa el CV y la evidencia en la matriz inferior antes de decidir.</p>
  </section>;
}
