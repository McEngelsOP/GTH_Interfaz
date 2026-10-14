import React, { useId, useState } from 'react';
import { Button } from '../common/Button.tsx';
import type { Application, Candidate } from '../../types/index.ts';

interface Props {
  applications: Application[];
  candidates: Map<string, Candidate>;
  selectedIds: Set<string>;
  onChange: (ids: Set<string>) => void;
}

/** Selección independiente de las casillas del ranking; reutilizable para Multitest. */
export function ListaDestinatarios({ applications, candidates, selectedIds, onChange }: Props) {
  const [query, setQuery] = useState('');
  const searchId = useId();
  const visible = applications.filter((app) => candidates.get(app.candidateId)?.name.toLocaleLowerCase('es').includes(query.trim().toLocaleLowerCase('es')));
  const count = applications.filter((app) => selectedIds.has(app.id)).length;
  return <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.5rem' }}>
      <strong style={{ fontSize: '0.8125rem', color: 'var(--text-primary)' }} aria-live="polite">{count} de {applications.length} seleccionados</strong>
      <Button size="sm" variant="ghost" onClick={() => onChange(new Set(applications.map((app) => app.id)))}>Marcar todos</Button>
      <Button size="sm" variant="ghost" onClick={() => onChange(new Set())}>Desmarcar todos</Button>
    </div>
    <label htmlFor={searchId} style={{ fontSize: '0.8125rem', color: 'var(--text-primary)' }}>Buscar destinatario por nombre</label>
    <input id={searchId} className="focus-ring" type="search" value={query} onChange={(event) => setQuery(event.target.value)}
      style={{ width: '100%', padding: '0.55rem 0.75rem', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)', background: 'var(--bg-surface)', color: 'var(--text-primary)', font: 'inherit' }} />
    <div role="group" aria-label="Destinatarios" style={{ height: '220px', overflowY: 'auto', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)' }}>
      {visible.map((app) => {
        const candidate = candidates.get(app.candidateId);
        return <label key={app.id} style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', padding: '0.65rem 0.75rem', borderBottom: '1px solid var(--border-subtle)', cursor: 'pointer' }}>
          <input type="checkbox" className="focus-ring" aria-label={`Incluir a ${candidate?.name || 'candidato'}`} checked={selectedIds.has(app.id)}
            style={{ accentColor: 'var(--primary-red)', flexShrink: 0 }}
            onChange={() => { const next = new Set(selectedIds); if (next.has(app.id)) next.delete(app.id); else next.add(app.id); onChange(next); }} />
          <span style={{ minWidth: 0, overflowWrap: 'anywhere', fontSize: '0.8125rem' }}>
            <strong style={{ display: 'block', color: 'var(--text-primary)' }}>{candidate?.name || 'Candidato'}</strong>
            <span style={{ color: 'var(--text-secondary)' }}>{candidate?.email?.trim() || 'Sin correo registrado'}</span>
          </span>
        </label>;
      })}
      {!visible.length && <p style={{ padding: '1rem', fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>No hay destinatarios que coincidan.</p>}
    </div>
  </div>;
}
