import React from 'react';
import { Modal } from '../common/Modal.tsx';
import { Badge } from '../common/Badge.tsx';
import type { Application, Candidate, JobPosting } from '../../types/index.ts';
import { embeddingVigente } from '../../services/rankingEmbeddings.ts';
import { DesgloseRequisitos } from './DesgloseRequisitos.tsx';
import { formatEmbeddingScore } from '../../services/embeddingMatching.ts';

/** Justificación del Score Embeddings: cuánto se parece el perfil a cada requisito del aviso y qué parte del
 *  perfil lo respalda. Las similitudes van de 0 a 1 y el mejor postulante del aviso vale 1 (escala del aviso). */
export function ExplicacionEmbeddings({ app, candidate, job, posicion, enTop, onClose }: {
  app: Application | null; candidate?: Candidate; job: JobPosting | null; posicion?: number; enTop?: boolean; onClose: () => void;
}) {
  const emb = app && job ? embeddingVigente(app, job) : null;
  return (
    <Modal isOpen={Boolean(app)} onClose={onClose} maxWidth="760px" title={`Explicación del ranking · ${candidate?.name || 'Candidato'}`}
      subtitle={job ? `${job.title} · ${job.code}` : undefined}>
      {!emb ? <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Este postulante aún no tiene Score Embeddings para los requisitos actuales.</p> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', padding: '0.85rem 1rem',
            backgroundColor: 'var(--bg-base)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Score Embeddings</div>
              <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-primary)' }} className="tabular-nums">{formatEmbeddingScore(emb.score)}</div>
            </div>
            {posicion && <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Posición</div>
              <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-primary)' }} className="tabular-nums">{posicion}</div>
            </div>}
            {enTop !== undefined && <Badge variant={enTop ? 'success' : 'neutral'} size="sm">{enTop ? 'Dentro del Top-N' : 'Fuera del Top-N'}</Badge>}
            <p style={{ flex: '1 1 240px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Promedio ponderado de la similitud con cada requisito (modelo multilingual-e5). Se mide de 0 a 1 dentro del aviso:
              el perfil más cercano vale 1.
            </p>
          </div>

          <DesgloseRequisitos app={app!} candidate={candidate} job={job!} />
        </div>
      )}
    </Modal>
  );
}
