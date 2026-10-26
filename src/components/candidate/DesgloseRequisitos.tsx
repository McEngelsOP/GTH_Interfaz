import React from 'react';
import { GraduationCap, Quote } from 'lucide-react';
import type { Application, Candidate, JobPosting } from '../../types/index.ts';
import { argumentosPorRequisito, colorPct } from '../../services/perfilBumeran.ts';
import { embeddingVigente } from '../../services/rankingEmbeddings.ts';

/** Por cada requisito del aviso: su peso, cuánto se parece el perfil (0-100 dentro del aviso) y la evidencia. */
export function DesgloseRequisitos({ app, candidate, job }: { app: Application; candidate?: Candidate; job: JobPosting }) {
  const { requisitos } = argumentosPorRequisito(app, candidate, job);
  const educacionSuperior = embeddingVigente(app, job)?.higherEducation || [];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
      {requisitos.map((r, k) => (
        <section key={r.id} style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', paddingBottom: '0.85rem',
          borderBottom: k < requisitos.length - 1 ? '1px solid var(--border-subtle)' : 'none' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem', alignItems: 'baseline' }}>
            <h3 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              <span style={{ color: 'var(--primary-red)' }}>{r.codigo}.</span> {r.label}
            </h3>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
              peso {r.peso}% · <strong style={{ color: colorPct(r.pct) }} className="tabular-nums">{r.pct === null ? '—' : `${r.pct}%`}</strong>
            </span>
          </div>
          <div style={{ height: '8px', borderRadius: '4px', backgroundColor: 'var(--bg-muted)', overflow: 'hidden' }}
            role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={r.pct ?? 0} aria-label={`Similitud con ${r.codigo}`}>
            <div style={{ width: `${r.pct ?? 0}%`, height: '100%', backgroundColor: colorPct(r.pct), borderRadius: '4px' }} />
          </div>
          <p style={{ display: 'flex', gap: '0.4rem', fontSize: '0.84rem', color: 'var(--text-primary)', lineHeight: 1.5 }}>
            <Quote size={14} style={{ color: 'var(--text-muted)', flexShrink: 0, marginTop: '0.2rem' }} />
            {r.evidencia || <span style={{ color: 'var(--text-muted)' }}>Sin evidencia en el perfil para este requisito.</span>}
          </p>
        </section>
      ))}
      {educacionSuperior.length > 0 && (
        <p style={{ display: 'flex', gap: '0.4rem', fontSize: '0.84rem', color: 'var(--text-primary)', lineHeight: 1.5 }}>
          <GraduationCap size={15} style={{ color: 'var(--status-verified-text)', flexShrink: 0, marginTop: '0.15rem' }} />
          <span><strong>Experiencia en educación superior:</strong> {educacionSuperior.join(', ')}. Suma una bonificación al
            puntaje por ser del mismo sector que ESAN.</span>
        </p>
      )}
    </div>
  );
}
