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
  const rows = job.criteria.map((criterion, index) => ({ id: criterion.id, label: `R${index + 1} · ${criterion.label}`, total: false }));

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
      {series.map(({ app, name, requisitos }) => {
        const counts = [requisitos.filter(r => r.pct !== null && r.pct >= 70).length,
          requisitos.filter(r => r.pct !== null && r.pct >= 40 && r.pct < 70).length,
          requisitos.filter(r => r.pct !== null && r.pct < 40).length,
          requisitos.filter(r => r.pct === null).length];
        const label = `${name}: ${counts[0]} de similitud alta, ${counts[1]} media, ${counts[2]} baja y ${counts[3]} sin datos`;
        return <div key={app.id} className="comparison-coverage-row">
          <span className="comparison-chart-name" title={name}>{name}</span>
          <div className="comparison-coverage-track" role="img" aria-label={label} title={label}>
            {counts.map((count, index) => count > 0 && <span key={index} className={['coverage-strong', 'coverage-medium', 'coverage-low', 'coverage-missing'][index]}
              style={{ flex: count }} aria-hidden="true">{count}</span>)}
          </div>
          <span className="comparison-coverage-count">{requisitos.length ? `${counts[0]} alta · ${counts[1]} media · ${counts[2]} baja · ${counts[3]} sin datos` : 'Sin requisitos'}</span>
        </div>;
      })}
    </section>
    <h4>Similitud por requisito</h4>
    <div className="comparison-chart-axis" aria-hidden="true"><span>0 %</span><span>50 %</span><span>100 %</span></div>
    {rows.map((row) => <div key={row.id} className="comparison-chart-row">
      <strong>{row.label}</strong>
      <div className="comparison-chart-series">
        {series.map(({ app, name, requisitos, total }) => {
          const pct = row.total ? total === null ? null : total * 100 : requisitos.find((requirement) => requirement.id === row.id)?.pct ?? null;
          const value = pct === null ? 'sin evidencia' : row.total ? formatEmbeddingScore(total!) : `${pct} %`;
          return <div key={app.id} className="comparison-chart-bar-row">
            <span className="comparison-chart-name" title={name}>{name}</span>
            <div className="comparison-chart-track focus-ring" tabIndex={0} role="img"
              aria-label={`${row.label}: ${name}, ${value}`}
              title={`${name} · ${row.label}: ${value}${row.total && pct !== null ? ` (${Math.round(pct)} % de la escala)` : ''}`}>
              {pct !== null && <div className="comparison-chart-fill" style={{ width: `${Math.max(0, Math.min(100, pct))}%`, backgroundColor: colors.get(app.candidateId) }} />}
            </div>
            <span className="comparison-chart-value tabular-nums">{value}</span>
          </div>;
        })}
      </div>
    </div>)}
    <p>Barra más larga = mayor similitud del CV con ese requisito. No acredita cumplimiento ni sustituye la revisión del CV. «Sin evidencia» indica que no hay un valor disponible; no equivale a cero.</p>
  </section>;
}
