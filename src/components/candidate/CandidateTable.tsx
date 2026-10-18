import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../../context/AppContext.tsx';
import { Application, Candidate, EvaluationMethod } from '../../types/index.ts';
import { StageDecisionModal } from '../modals/StageDecisionModal.tsx';
import { InternalCommentModal } from '../modals/InternalCommentModal.tsx';
import { useSharedComments } from '../../services/sharedComments.ts';
import '../../styles/candidateTable.css';
import { internalCommentKey } from '../../services/internalComments.ts';
import { WhatsAppButton } from './WhatsAppButton.tsx';
import { StageBadge } from './StageBadge.tsx';
import { ExplicacionEmbeddings } from './ExplicacionEmbeddings.tsx';
import { VisorCV } from './VisorCV.tsx';
import { cvPersonal, timeAgo } from '../../services/bumeranSync.ts';
import { useResumenPostulaciones } from '../../services/postulaciones.ts';
import '../../styles/postulaciones.css';
import type { useEnRevision } from '../../services/enRevision.ts';
import { Button } from '../common/Button.tsx';
import { Badge } from '../common/Badge.tsx';
import {
  Search,
  Filter,
  Eye,
  UserCheck,
  UserX,
  ClipboardCheck,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
  FileText,
  Star,
  MessageSquareText,
  FileUser,
  Pencil,
  History,
} from 'lucide-react';
import { isEligibleForTopN, puedeAvanzar } from '../../services/recruitmentRules.ts';
import { embeddingVigente, ordenarPorEmbeddings } from '../../services/rankingEmbeddings.ts';
import { formatEmbeddingScore } from '../../services/embeddingMatching.ts';

interface CandidateTableProps {
  enRevision: ReturnType<typeof useEnRevision>;
  applications: Application[];
  selectedMethod: EvaluationMethod;
  onOpenReleaseModal: (app: Application, cand: Candidate) => void;
  onQuickAdvance: (app: Application) => void;
  /** Postulaciones del Top-N: se resaltan en la tabla. */
  topIds?: Set<string>;
  /** Orden completo del ranking de la convocatoria: da la posición (#) aunque haya filtros o pestañas. */
  ordenRanking?: Application[];
  /** Los que están en el Top-N solo por su posición (la estrella no los quita: se baja el número de primeros). */
  topPorPosicion?: Set<string>;
}

export function CandidateTable({
  applications,
  enRevision,
  selectedMethod,
  onOpenReleaseModal,
  onQuickAdvance,
  topIds,
  ordenRanking,
  topPorPosicion,
}: CandidateTableProps) {
  const {
    appState,
    activeJob,
    selectedApplicationIds,
    toggleApplicationSelection,
    selectAllApplications,
    clearApplicationSelection,
    openCandidateDrawer,
    handleMoveStage,
    handleToggleTopNExtra,
    showToast,
    handleSaveInternalComment,
  } = useApp();

  // Estrella: agrega o quita a alguien del Top-N. Los N primeros ya están por su posición.
  const alternarEstrella = (app: Application) => {
    if (topPorPosicion?.has(app.id) && !activeJob?.topNExtras?.includes(app.id)) {
      showToast('Está en el Top-N por su posición en el ranking. Para quitarlo, baja el número de «primeros».', 'info');
      return;
    }
    handleToggleTopNExtra(app.id);
  };

  const [revertTarget, setRevertTarget] = useState<Application | null>(null);
  const [explicacion, setExplicacion] = useState<Application | null>(null);
  const [commentFor, setCommentFor] = useState<Application | null>(null);
  const [cvDe, setCvDe] = useState<Candidate | null>(null);
  useEffect(() => { setSearchQuery(''); setCurrentPage(1); setExplicacion(null); setCommentFor(null); }, [activeJob?.id]);

  const [searchQuery, setSearchQuery] = useState('');
  const [density, setDensity] = useState<'comfortable' | 'compact'>('comfortable');
  const [pageSize, setPageSize] = useState<number>(25);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Mapear candidatos por ID para acceso rápido
  const candidateMap = useMemo(() => {
    const map = new Map<string, Candidate>();
    appState.candidates.forEach((c) => map.set(c.id, c));
    return map;
  }, [appState.candidates]);

  // Filtrado y búsqueda
  const filteredApplications = useMemo(() => {
    return applications.filter((app) => {
      const cand = candidateMap.get(app.candidateId);
      if (!cand) return false;

      // Búsqueda
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesName = cand.name.toLowerCase().includes(query);
        const matchesTitle = cand.currentTitle.toLowerCase().includes(query);
        const matchesCompany = cand.currentCompany.toLowerCase().includes(query);
        if (!matchesName && !matchesTitle && !matchesCompany) return false;
      }

      return true;
    });
  }, [applications, candidateMap, searchQuery]);

  // Score de embeddings vigente para los criterios actuales de la convocatoria.
  const embeddingOf = (app: Application) => embeddingVigente(app, activeJob);

  // El ranking se ordena por Score Embeddings; sin score al final y empates por nombre.
  const sortedApplications = useMemo(() => ordenarPorEmbeddings(filteredApplications, appState.candidates, activeJob),
    [filteredApplications, appState.candidates, activeJob]);
  const posicion = useMemo(() => new Map((ordenRanking || sortedApplications).map((app, i) => [app.id, i + 1])),
    [ordenRanking, sortedApplications]);

  // Paginación
  const totalItems = sortedApplications.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const validPage = Math.min(currentPage, totalPages);

  const paginatedApplications = useMemo(() => {
    const start = (validPage - 1) * pageSize;
    return sortedApplications.slice(start, start + pageSize);
  }, [sortedApplications, validPage, pageSize]);
  const recurrence = useResumenPostulaciones(activeJob, paginatedApplications, candidateMap);

  // Selección en la página actual
  const allCurrentPageSelected =
    paginatedApplications.length > 0 &&
    paginatedApplications.every((app) => selectedApplicationIds.includes(app.id));

  const handleToggleSelectAllPage = () => {
    if (allCurrentPageSelected) {
      // Deseleccionar los de esta página
      const pageIds = new Set(paginatedApplications.map((a) => a.id));
      selectAllApplications(selectedApplicationIds.filter((id) => !pageIds.has(id)));
    } else {
      // Seleccionar todos los de esta página (manteniendo los previos)
      const merged = Array.from(
        new Set([...selectedApplicationIds, ...paginatedApplications.map((a) => a.id)])
      );
      selectAllApplications(merged);
    }
  };

  // «Revisado»: marca compartida con todo el equipo (se guarda en Supabase)
  const alternarRevision = async (cand: Candidate) => {
    const quitar = applications.some((a) => a.candidateId === cand.id && enRevision.porAplicacion.has(a.id));
    const error = await enRevision.alternar(cand);
    if (error) showToast(`No se pudo guardar la marca «Revisado»: ${error}`, 'error');
    else showToast(quitar ? `${cand.name} ya no está marcado como revisado.` : `${cand.name} quedó como revisado para todo el equipo.`, 'info');
  };

  const sharedComments = useSharedComments(activeJob);
  const comments = sharedComments.enabled ? sharedComments.notes : appState.comentariosInternos;
  const commentCandidate = commentFor && candidateMap.get(commentFor.candidateId);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%' }}>
      {commentFor && commentCandidate && activeJob && <InternalCommentModal key={commentFor.id}
        name={commentCandidate.name} initialText={comments?.[internalCommentKey(activeJob, commentCandidate)]?.texto || ''} shared={sharedComments.enabled}
        onSave={async (text) => {
          if (sharedComments.enabled) await sharedComments.save(commentCandidate, text);
          else handleSaveInternalComment(commentFor.id, text);
        }} onClose={() => setCommentFor(null)} />}
      {sharedComments.error && <div role="alert" style={{ color: 'var(--status-failed-text)', fontSize: '.8125rem' }}>
        No se pudieron cargar los comentarios compartidos. {sharedComments.error} <Button variant="ghost" size="sm" onClick={() => void sharedComments.reload()}>Reintentar</Button>
      </div>}
      {recurrence.error && <div role="alert" style={{ fontSize: '.8125rem', color: 'var(--text-secondary)' }}>
        {recurrence.error} <Button variant="ghost" size="sm" onClick={recurrence.reload}>Reintentar</Button>
      </div>}
      {/* Barra de Filtros, Búsqueda y Densidad */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.75rem',
          backgroundColor: 'var(--bg-surface)',
          padding: '0.85rem 1rem',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-subtle)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flex: 1, minWidth: '260px' }}>
          <div style={{ position: 'relative', flex: 1, maxWidth: '340px' }}>
            <Search
              size={16}
              style={{
                position: 'absolute',
                left: '0.75rem',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-muted)',
              }}
            />
            <input
              type="text"
              placeholder="Buscar por nombre, puesto u organización..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="focus-ring"
              style={{
                width: '100%',
                padding: '0.45rem 0.75rem 0.45rem 2.2rem',
                fontSize: '0.84rem',
                backgroundColor: 'var(--bg-base)',
                border: '1px solid var(--border-default)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--text-primary)',
                outline: 'none',
              }}
            />
          </div>

        </div>

        {/* Densidad, Exportar y Paginación */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              backgroundColor: 'var(--bg-base)',
              borderRadius: 'var(--radius-sm)',
              padding: '2px',
              border: '1px solid var(--border-default)',
            }}
          >
            <button
              onClick={() => setDensity('comfortable')}
              style={{
                border: 'none',
                background: density === 'comfortable' ? 'var(--bg-surface)' : 'transparent',
                color: density === 'comfortable' ? 'var(--primary-red)' : 'var(--text-muted)',
                fontWeight: density === 'comfortable' ? 600 : 500,
                fontSize: '0.75rem',
                padding: '0.3rem 0.6rem',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              Cómoda
            </button>
            <button
              onClick={() => setDensity('compact')}
              style={{
                border: 'none',
                background: density === 'compact' ? 'var(--bg-surface)' : 'transparent',
                color: density === 'compact' ? 'var(--primary-red)' : 'var(--text-muted)',
                fontWeight: density === 'compact' ? 600 : 500,
                fontSize: '0.75rem',
                padding: '0.3rem 0.6rem',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              Compacta
            </button>
          </div>

          <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
            Mostrando <strong>{totalItems}</strong> candidatos
          </span>
        </div>
      </div>

      {/* Contenedor con scroll horizontal garantizado (sin desbordar pantalla) */}
      <div
        style={{
          width: '100%',
          overflowX: 'auto',
          backgroundColor: 'var(--bg-surface)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-subtle)',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <table className="candidate-ranking-table"
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            textAlign: 'left',
            fontSize: density === 'compact' ? '0.78rem' : '0.8125rem',
          }}
        >
          <thead>
            <tr
              style={{
                backgroundColor: 'var(--bg-base)',
                borderBottom: '1px solid var(--border-default)',
                color: 'var(--text-secondary)',
                fontSize: '0.7rem',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
              }}
            >
              <th style={{ width: '36px', padding: '0.6rem 0.6rem' }}>
                <input
                  type="checkbox"
                  checked={allCurrentPageSelected}
                  onChange={handleToggleSelectAllPage}
                  aria-label="Seleccionar todos los de esta página"
                  style={{ cursor: 'pointer', accentColor: 'var(--primary-red)' }}
                />
              </th>
              <th style={{ width: '40px', padding: '0.6rem 0.4rem' }}>#</th>
              <th style={{ padding: '0.6rem 0.6rem', minWidth: '170px' }}>Candidato</th>
              <th style={{ padding: '0.6rem 0.6rem', minWidth: '100px' }}>Etapa</th>
              <th style={{ padding: '0.6rem 0.6rem', minWidth: '80px' }} aria-sort="descending">Score ↓</th>
              <th style={{ padding: '0.6rem 0.6rem', minWidth: '110px' }}>Puntaje</th>
              <th style={{ padding: '0.6rem 0.6rem', minWidth: '145px' }}>Comentarios</th>
              <th style={{ padding: '0.6rem 0.6rem', minWidth: '170px', textAlign: 'center' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {paginatedApplications.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ padding: '3rem 1rem', textAlign: 'center' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                    <FileText size={32} style={{ color: 'var(--text-muted)' }} />
                    <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.95rem' }}>
                      No se encontraron candidatos con los filtros actuales
                    </span>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.84rem' }}>
                      Pruebe ajustando el término de búsqueda o cambiando la pestaña.
                    </span>
                  </div>
                </td>
              </tr>
            ) : (
              paginatedApplications.map((app, index) => {
                const cand = candidateMap.get(app.candidateId);
                const isSelected = selectedApplicationIds.includes(app.id);
                const eligibility = isEligibleForTopN(app, selectedMethod);
                const rowRank = posicion.get(app.id) ?? (validPage - 1) * pageSize + index + 1;
                const enTop = topIds?.has(app.id) ?? false;
                const cellPadding = density === 'compact' ? '0.4rem 0.6rem' : '0.6rem 0.6rem';

                return (
                  <tr
                    key={app.id}
                    style={{
                      borderBottom: '1px solid var(--border-subtle)',
                      backgroundColor: isSelected
                        ? 'var(--primary-red-subtle)'
                        : enTop ? 'var(--status-verified-bg)' : 'transparent',
                      boxShadow: enTop ? 'inset 3px 0 0 var(--status-verified-text)' : undefined,
                      transition: 'background-color var(--transition-fast)',
                    }}
                  >
                    {/* Checkbox */}
                    <td style={{ padding: '0.5rem 0.6rem' }}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleApplicationSelection(app.id)}
                        aria-label={`Seleccionar ${cand?.name}`}
                        style={{ cursor: 'pointer', accentColor: 'var(--primary-red)' }}
                      />
                    </td>

                    {/* Posición en ranking */}
                    <td style={{ padding: '0.6rem 0.5rem', color: enTop ? 'var(--status-verified-text)' : 'var(--text-muted)', fontWeight: 700 }}
                      title={enTop ? 'Dentro del Top-N' : undefined}>
                      <span className="tabular-nums">{rowRank}</span>
                    </td>

                    {/* Nombre y datos del candidato */}
                    <td style={{ padding: cellPadding }}>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <button
                          onClick={() => openCandidateDrawer(app)}
                          className="focus-ring"
                          style={{
                            background: 'transparent',
                            border: 'none',
                            cursor: 'pointer',
                            textAlign: 'left',
                            padding: 0,
                            fontWeight: 600,
                            color: 'var(--primary-red)',
                            fontSize: '0.875rem',
                          }}
                        >
                          {cand?.name || 'Candidato'}
                        </button>
                        <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.1rem' }}>
                          {cand?.currentTitle} · <strong>{cand?.currentCompany}</strong>
                        </span>
                        {(recurrence.totals[cand?.importedProfile?.externalId || ''] || 0) > 1 && <button
                          type="button" className="candidate-recurrence focus-ring" onClick={() => openCandidateDrawer(app, 'postulaciones')}
                          aria-label={`Ver ${recurrence.totals[cand?.importedProfile?.externalId || '']} postulaciones de ${cand?.name}`}>
                          <History size={12} aria-hidden="true" />Postuló en {recurrence.totals[cand?.importedProfile?.externalId || '']} procesos
                        </button>}
                      </div>
                    </td>

                    {/* Etapa actual */}
                    <td style={{ padding: cellPadding }}>
                      <StageBadge stage={app.stage} size="sm" />
                    </td>


                    {/* Score de embeddings (separado del LLM) y su explicación */}
                    <td style={{ padding: cellPadding, color: 'var(--text-secondary)', fontSize: '0.8125rem' }}>
                      {embeddingOf(app) ? (
                        <span className="tabular-nums" style={{ fontWeight: 600, color: 'var(--text-primary)' }}
                          title={`Similitud ponderada con los criterios · posición ${embeddingOf(app)!.ranking} · backend ${embeddingOf(app)!.backend}`}>
                          {formatEmbeddingScore(embeddingOf(app)!.score)}
                        </span>
                      ) : 'Pendiente'}
                    </td>
                    <td style={{ padding: cellPadding }}>
                      {embeddingOf(app) ? (
                        <Button variant="ghost" size="sm" icon={<MessageSquareText size={14} />} onClick={() => setExplicacion(app)}
                          title="Ver por qué tiene este puntaje: similitud y evidencia por requisito">
                          Ver puntaje
                        </Button>
                      ) : <span style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>—</span>}
                    </td>

                    <td style={{ padding: cellPadding }}>
                      {cand && activeJob && (() => {
                        const note = comments?.[internalCommentKey(activeJob, cand)]?.texto;
                        return <Button variant="ghost" size="sm" icon={<Pencil size={14} />} onClick={() => setCommentFor(app)}
                          disabled={sharedComments.loading || !!sharedComments.error} aria-label={`Editar comentario de ${cand.name}`} title={note || 'Agregar comentario interno'} style={{ maxWidth: '180px' }}>
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sharedComments.loading ? 'Cargando…' : note ? note.slice(0, 40) + (note.length > 40 ? '…' : '') : 'Agregar'}</span>
                        </Button>;
                      })()}
                    </td>

                    {/* Acciones por fila */}
                    <td style={{ padding: cellPadding, textAlign: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.2rem', flexWrap: 'nowrap' }}>
                        <Button
                          variant="ghost"
                          size="sm"
                          icon={<Eye size={14} />}
                          onClick={() => openCandidateDrawer(app)}
                          title="Abrir la ficha del candidato"
                        >
                          Ver perfil
                        </Button>

                        {cand && (() => {
                          const cv = cvPersonal(cand.importedProfile?.records);
                          return (
                            <Button variant="ghost" size="sm" icon={<FileUser size={14} />} onClick={() => setCvDe(cand)}
                              style={cv.estado === 'disponible' ? undefined : { color: 'var(--text-muted)' }}
                              title={cv.estado === 'disponible' ? 'Ver el CV personal que adjuntó en Bumeran'
                                : cv.estado === 'sin_adjunto' ? 'No adjuntó CV personal' : 'CV personal aún no disponible'}>
                              Ver CV
                            </Button>
                          );
                        })()}

                        {cand && activeJob && <WhatsAppButton candidate={cand} jobTitle={activeJob.title} compact />}

                        {/* Estrella: en el Top-N (llena) o fuera (vacía). Al marcarla, entra al Top-N y el contador sube */}
                        <button type="button" className="focus-ring estrella-topn" aria-pressed={enTop} onClick={() => alternarEstrella(app)}
                          aria-label={enTop ? `Quitar a ${cand?.name || 'candidato'} del Top-N` : `Agregar a ${cand?.name || 'candidato'} al Top-N`}
                          title={!enTop ? 'Agregar al Top-N' : topPorPosicion?.has(app.id) && !activeJob?.topNExtras?.includes(app.id)
                            ? 'En el Top-N por su posición en el ranking' : 'En el Top-N por estrella · clic para quitar'}
                          disabled={activeJob?.status !== 'activa' || app.stage === 'no_continua' || app.stage === 'contratado'}>
                          <Star size={17} fill={enTop ? '#D97706' : 'none'} style={{ color: enTop ? '#D97706' : 'var(--text-muted)' }} />
                        </button>

                        <Button
                          variant="ghost"
                          size="sm"
                          icon={<ClipboardCheck size={14} style={enRevision.porAplicacion.has(app.id) ? { color: 'var(--primary-red)' } : undefined} />}
                          onClick={() => cand && void alternarRevision(cand)}
                          aria-pressed={enRevision.porAplicacion.has(app.id)}
                          aria-label={enRevision.porAplicacion.has(app.id) ? `Quitar marca de revisado de ${cand?.name}` : `Marcar como revisado a ${cand?.name}`}
                          title={enRevision.porAplicacion.has(app.id)
                            ? `Revisado${enRevision.porAplicacion.get(app.id)!.email ? ` · marcado por ${enRevision.porAplicacion.get(app.id)!.email}` : ''} ${timeAgo(enRevision.porAplicacion.get(app.id)!.at)} · clic para quitar`
                            : 'Marcar como revisado (lo ve todo el equipo)'}
                        />

                        {app.stage !== 'no_continua' && app.stage !== 'contratado' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            icon={<UserX size={14} />}
                            style={{ color: '#DC2626' }}
                            onClick={() => cand && onOpenReleaseModal(app, cand)}
                            title="Liberar postulación (No continúa)"
                          />
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Paginación */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.75rem',
          padding: '0.5rem 0',
          fontSize: '0.84rem',
          color: 'var(--text-secondary)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span>Filas por página:</span>
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="focus-ring"
            style={{
              padding: '0.25rem 0.5rem',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-default)',
              backgroundColor: 'var(--bg-surface)',
              color: 'var(--text-primary)',
              cursor: 'pointer',
            }}
          >
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span>
            Página <strong className="tabular-nums">{validPage}</strong> de{' '}
            <strong className="tabular-nums">{totalPages}</strong>
          </span>
          <Button
            variant="secondary"
            size="sm"
            icon={<ChevronLeft size={16} />}
            disabled={validPage <= 1}
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            title="Página anterior"
          />
          <Button
            variant="secondary"
            size="sm"
            icon={<ChevronRight size={16} />}
            disabled={validPage >= totalPages}
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            title="Página siguiente"
          />
        </div>
      </div>
      <VisorCV nombre={cvDe?.name || null} cv={cvDe ? cvPersonal(cvDe.importedProfile?.records) : null} onClose={() => setCvDe(null)} />
      <ExplicacionEmbeddings app={explicacion} candidate={explicacion ? candidateMap.get(explicacion.candidateId) : undefined}
        job={activeJob ?? null} posicion={explicacion ? posicion.get(explicacion.id) : undefined}
        enTop={explicacion ? topIds?.has(explicacion.id) : undefined} onClose={() => setExplicacion(null)} />
      {revertTarget && <StageDecisionModal key={revertTarget.id} application={revertTarget} target="postulado"
        candidateName={candidateMap.get(revertTarget.candidateId)?.name || 'Candidato'} onClose={() => setRevertTarget(null)}
        onConfirm={(reason) => handleMoveStage(revertTarget.id, 'postulado', reason)} />}
    </div>
  );
}
