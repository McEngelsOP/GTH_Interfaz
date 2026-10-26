import { useTrayectoria, ESTADOS_TRAYECTORIA } from '../services/trayectoria.ts';
import { ComparisonChart } from '../components/candidate/ComparisonChart.tsx';
import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../context/AppContext.tsx';
import { ActiveJobBanner } from '../components/layout/ActiveJobBanner.tsx';
import { Button } from '../components/common/Button.tsx';
import { Badge } from '../components/common/Badge.tsx';
import { StageBadge } from '../components/candidate/StageBadge.tsx';
import { RequirementPill } from '../components/candidate/RequirementPill.tsx';
import { ScoreBadge } from '../components/candidate/ScoreBadge.tsx';
import { AdvanceDecisionModal } from '../components/modals/AdvanceDecisionModal.tsx';
import {
  GitCompare,
  X,
  Plus,
  Eye,
  UserCheck,
  CheckCircle2,
  Sparkles,
  ArrowLeft,
  RotateCcw,
  ShieldCheck,
  Info,
  AlertCircle,
} from 'lucide-react';
import { isEligibleForTopN } from '../services/recruitmentRules.ts';
import { getReviewCandidates, reviewAvailability, reviewEvaluation } from '../services/reviewRanking.ts';
import { evaluationSummary } from '../services/evaluationSummary.ts';
import { compareCandidateNames } from '../services/candidateOrdering.ts';
import { embeddingVigente, idsTopN, ordenarPorEmbeddings } from '../services/rankingEmbeddings.ts';
import { formatEmbeddingScore } from '../services/embeddingMatching.ts';
import { argumentosPorRequisito, colorPct, perfilBumeran } from '../services/perfilBumeran.ts';
import { Application, Candidate } from '../types/index.ts';
import { useSueldoAviso } from '../services/useSueldoAviso.ts';
import { SueldoModal } from '../components/modals/SueldoModal.tsx';

export function ComparadorView() {
  const trayectoria = useTrayectoria();
  const {
    activeJob,
    activeJobApplications,
    appState,
    selectedApplicationIds,
    toggleApplicationSelection,
    clearApplicationSelection,
    selectAllApplications,
    openCandidateDrawer,
    setCurrentView,
    handleAdvanceSelected,
    showToast,
  } = useApp();
  const sueldo = useSueldoAviso(activeJob);
  const [sueldoDe, setSueldoDe] = useState<string | null>(null);
  useEffect(() => { setSueldoDe(null); }, [activeJob?.id]);

  const [isAdvanceModalOpen, setIsAdvanceModalOpen] = useState(false);
  const [selectedCandidateToAdd, setSelectedCandidateToAdd] = useState('');
  const [soloTop, setSoloTop] = useState(true);

  const candidateMap = useMemo(() => {
    const map = new Map<string, Candidate>();
    appState.candidates.forEach((c) => map.set(c.id, c));
    return map;
  }, [appState.candidates]);

  // Top-N del ranking por Score Embeddings y la posición de cada uno.
  const topIds = useMemo(() => idsTopN(activeJobApplications, appState.candidates, activeJob, appState.topN),
    [activeJobApplications, appState.candidates, activeJob, appState.topN]);
  const rankingOrdenado = useMemo(() => ordenarPorEmbeddings(activeJobApplications, appState.candidates, activeJob),
    [activeJobApplications, appState.candidates, activeJob]);
  const posicion = useMemo(() => new Map(rankingOrdenado.map((app, i) => [app.id, i + 1])), [rankingOrdenado]);

  // Mantiene las fichas y las columnas de detalle en el mismo orden: mayor puntaje a la izquierda.
  const comparedApplications = useMemo(() => {
    const seleccionados = new Set(selectedApplicationIds);
    return rankingOrdenado.filter((app) => seleccionados.has(app.id));
  }, [rankingOrdenado, selectedApplicationIds]);

  // Con «Solo del Top-N», el selector muestra solo a los del Top-N en el orden del ranking; si no, a todos de la A a la Z.
  const availableToAdd = useMemo(() => {
    const disponibles = activeJobApplications.filter((app) => !selectedApplicationIds.includes(app.id));
    if (soloTop) return disponibles.filter((app) => topIds.has(app.id)).sort((a, b) => (posicion.get(a.id) || 0) - (posicion.get(b.id) || 0));
    return disponibles.sort((a, b) =>
      compareCandidateNames(candidateMap.get(a.candidateId)?.name || '', candidateMap.get(b.candidateId)?.name || '')
      || a.id.localeCompare(b.id)
    );
  }, [activeJobApplications, selectedApplicationIds, candidateMap, soloTop, topIds, posicion]);
  const topNAvailability = useMemo(() => reviewAvailability(activeJobApplications, activeJob?.criteria || []),
    [activeJobApplications, activeJob?.criteria]);
  const primeros3 = useMemo(() => ordenarPorEmbeddings(activeJobApplications, appState.candidates, activeJob)
    .filter((app) => embeddingVigente(app, activeJob) && app.stage !== 'no_continua' && app.stage !== 'contratado').slice(0, 3).map((a) => a.id),
    [activeJobApplications, appState.candidates, activeJob]);
  const canQuickAdd = primeros3.length >= 2;
  const quickAddHint = canQuickAdd ? 'Comparar a los 3 primeros del ranking por Score Embeddings.'
    : 'Se necesitan al menos dos perfiles con Score Embeddings para la comparación automática.';

  const handleAddCandidate = () => {
    if (!selectedCandidateToAdd) return;
    toggleApplicationSelection(selectedCandidateToAdd);
    setSelectedCandidateToAdd('');
  };

  const handleQuickAddTop3 = () => {
    setSelectedCandidateToAdd('');
    setSoloTop(true);
    const eligibleApps = primeros3;
    if (eligibleApps.length < 2) return;
    selectAllApplications(eligibleApps);
    showToast(`Se agregaron ${eligibleApps.length} perfiles a la comparación.`, 'info');
  };

  if (!activeJob) return null;

  return (
    <div className="comparison-view" style={{ maxWidth: '1440px', margin: '0 auto', width: '100%', minWidth: 0 }}>
      {sueldoDe && <SueldoModal key={activeJob.id} job={activeJob} applications={rankingOrdenado} candidates={appState.candidates}
        applicationId={sueldoDe} sueldo={sueldo} onClose={() => { if (!sueldo.guardando) setSueldoDe(null); }} />}
      <ActiveJobBanner />

      {/* Cabecera del Comparador */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
          backgroundColor: 'var(--bg-surface)',
          padding: '1.25rem',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-subtle)',
          boxShadow: 'var(--shadow-sm)',
          marginBottom: '1.5rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', flex: '1 1 300px', minWidth: 0 }}>
          <div
            style={{
              width: '42px',
              height: '42px',
              flexShrink: 0,
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--primary-red-subtle)',
              color: 'var(--primary-red)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <GitCompare size={22} />
          </div>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              Comparador de Candidatos
            </h2>
            <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
              Comparación horizontal de evidencias, requisitos y criterios. Sin ganador universal automático.
            </p>
          </div>
        </div>

        {/* Acciones del Comparador */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.65rem', flexWrap: 'wrap', flex: '0 1 480px' }}>
          <Button
            variant="ghost"
            size="sm"
            icon={<ArrowLeft size={15} />}
            onClick={() => setCurrentView('mejores_candidatos')}
          >
            Volver a lista
          </Button>

          <Button variant="ghost" size="sm" icon={<RotateCcw size={15} />} onClick={handleQuickAddTop3} disabled={!canQuickAdd} title={quickAddHint}>
            Reiniciar
          </Button>

          {comparedApplications.length > 0 && (
            <Button variant="ghost" size="sm" onClick={clearApplicationSelection}>
              Limpiar comparación
            </Button>
          )}

          {comparedApplications.length >= 2 && (
            <Button
              variant="primary"
              size="sm"
              icon={<UserCheck size={16} />}
              onClick={() => setIsAdvanceModalOpen(true)}
            >
              Decidir quién avanza ({comparedApplications.length})
            </Button>
          )}
        </div>
      </div>

      {/* Selector para añadir más candidatos a la comparación */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: '0.75rem',
          marginBottom: '1.25rem',
          padding: '0.75rem 1rem',
          backgroundColor: 'var(--bg-surface)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-subtle)',
        }}
      >
        <span style={{ fontSize: '0.84rem', fontWeight: 600, color: 'var(--text-primary)' }}>
          Añadir perfil a la comparación:
        </span>
        <select
          aria-label="Candidato para comparar"
          value={selectedCandidateToAdd}
          onChange={(e) => setSelectedCandidateToAdd(e.target.value)}
          className="focus-ring comparison-selector"
          style={{
            padding: '0.45rem 0.75rem',
            fontSize: '0.84rem',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border-default)',
            backgroundColor: 'var(--bg-base)',
            color: 'var(--text-primary)',
            minWidth: '260px',
          }}
        >
          <option value="">{availableToAdd.length ? '-- Seleccionar candidato --' : soloTop ? 'No quedan candidatos del Top-N por añadir' : 'No quedan candidatos por añadir'}</option>
          {availableToAdd.map((app) => {
            const cand = candidateMap.get(app.candidateId);
            const emb = embeddingVigente(app, activeJob);
            const label = emb ? `Score ${formatEmbeddingScore(emb.score)}` : 'sin score';
            return (
              <option key={app.id} value={app.id}>
                {soloTop || emb ? `#${posicion.get(app.id)} · ` : ''}{cand?.name} ({label})
              </option>
            );
          })}
        </select>
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8125rem', color: 'var(--text-secondary)', cursor: 'pointer' }}
          title="Mostrar en la lista solo a los candidatos que están dentro del Top-N del ranking">
          <input type="checkbox" checked={soloTop} onChange={(e) => { setSoloTop(e.target.checked); setSelectedCandidateToAdd(''); }}
            style={{ accentColor: 'var(--primary-red)', cursor: 'pointer' }} />
          Solo del Top-N ({topIds.size})
        </label>
        <Button
          variant="secondary"
          size="sm"
          icon={<Plus size={14} />}
          disabled={!selectedCandidateToAdd}
          onClick={handleAddCandidate}
        >
          Añadir
        </Button>

        {comparedApplications.length < 2 && (
          <Button variant="ghost" size="sm" onClick={handleQuickAddTop3} disabled={!canQuickAdd} title={quickAddHint}>
            Cargar los 3 primeros del ranking
          </Button>
        )}
      </div>

      {/* Estado vacío si hay menos de 2 candidatos */}
      {comparedApplications.length < 2 ? (
        <div
          style={{
            padding: '4rem 1.5rem',
            textAlign: 'center',
            backgroundColor: 'var(--bg-surface)',
            borderRadius: 'var(--radius-lg)',
            border: '1px dashed var(--border-default)',
          }}
        >
          <GitCompare size={42} style={{ color: 'var(--text-muted)', marginBottom: '0.75rem' }} />
          <h3 style={{ fontSize: '1.15rem', fontWeight: 600, color: 'var(--text-primary)' }}>
            Seleccione al menos dos perfiles para comparar
          </h3>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', maxWidth: '460px', margin: '0.5rem auto 1.25rem' }}>
            Marque perfiles en la lista de candidatos o utilice el selector superior para añadir candidatos a la matriz
            comparativa.
          </p>
          <Button variant="primary" onClick={handleQuickAddTop3} disabled={!canQuickAdd} aria-describedby={!canQuickAdd ? 'comparison-availability' : undefined} title={quickAddHint}>
            Comparar los 3 mejores perfiles
          </Button>
          {!canQuickAdd && <p id="comparison-availability" style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', margin: '0.75rem auto 0', maxWidth: '460px' }}>
            {quickAddHint} Puedes comparar los perfiles pendientes añadiéndolos manualmente en el selector.
          </p>}
        </div>
      ) : (
        <>
        <ComparisonChart applications={comparedApplications} candidates={candidateMap} job={activeJob} positions={posicion}
          sueldo={sueldo} onSueldo={app => setSueldoDe(app.id)}
          onRemove={toggleApplicationSelection} onViewProfile={openCandidateDrawer} />
        {/* Matriz de Comparación con Desplazamiento Horizontal Controlado (Sección 12) */}
        <div
          style={{
            width: '100%',
            overflowX: 'auto',
            backgroundColor: 'var(--bg-surface)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border-subtle)',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              textAlign: 'left',
              minWidth: `${280 + comparedApplications.length * 280}px`,
            }}
          >
            <thead>
              {/* Fila 1: Cabecera de candidatos */}
              <tr style={{ backgroundColor: 'var(--bg-base)', borderBottom: '2px solid var(--border-default)' }}>
                <th
                  style={{
                    padding: '1.25rem 1rem',
                    width: '260px',
                    verticalAlign: 'bottom',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    color: 'var(--text-secondary)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    position: 'sticky',
                    left: 0,
                    backgroundColor: 'var(--bg-base)',
                    zIndex: 2,
                    borderRight: '1px solid var(--border-subtle)',
                  }}
                >
                  Dimensión / Criterio
                </th>

                {comparedApplications.map((app) => {
                  const cand = candidateMap.get(app.candidateId);
                  const eligibility = isEligibleForTopN(app, appState.selectedMethod);

                  return (
                    <th
                      key={app.id}
                      style={{
                        padding: '1.25rem 1rem',
                        width: '280px',
                        verticalAlign: 'top',
                        borderRight: '1px solid var(--border-subtle)',
                      }}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <StageBadge stage={app.stage} size="sm" />
                          <button
                            onClick={() => toggleApplicationSelection(app.id)}
                            className="focus-ring"
                            aria-label={`Quitar ${cand?.name} de la comparación`}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: 'var(--text-muted)',
                              cursor: 'pointer',
                              padding: '0.15rem',
                            }}
                          >
                            <X size={16} />
                          </button>
                        </div>

                        <span style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                          {cand?.name || 'Candidato'}
                        </span>

                        <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                          {cand?.currentTitle} · <strong>{cand?.currentCompany}</strong>
                        </span>

                        <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.35rem' }}>
                          <Button
                            variant="secondary"
                            size="sm"
                            icon={<Eye size={13} />}
                            onClick={() => openCandidateDrawer(app)}
                            style={{ flex: 1, fontSize: '0.75rem' }}
                          >
                            Ver perfil
                          </Button>
                        </div>
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>

            <tbody>
              {/* Ranking */}
              <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                <td style={{ padding: '0.75rem 1rem', fontWeight: 700, fontSize: '0.8125rem', color: 'var(--text-primary)', position: 'sticky',
                  left: 0, backgroundColor: 'var(--bg-surface)', borderRight: '1px solid var(--border-subtle)', verticalAlign: 'top' }}>
                  Ranking por Score Embeddings
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 400, marginTop: '2px' }}>0 a 1 dentro del aviso; el mejor perfil vale 1</div>
                </td>
                {comparedApplications.map((app) => {
                  const emb = embeddingVigente(app, activeJob);
                  return (
                    <td key={app.id} style={{ padding: '0.75rem 1rem', borderRight: '1px solid var(--border-subtle)', verticalAlign: 'top', fontSize: '0.8125rem' }}>
                      {emb ? <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <strong style={{ fontSize: '1.15rem' }} className="tabular-nums">{formatEmbeddingScore(emb.score)}</strong>
                        <span style={{ color: 'var(--text-secondary)' }}>puesto {posicion.get(app.id)}</span>
                        <Badge size="sm" variant={topIds.has(app.id) ? 'success' : 'neutral'}>{topIds.has(app.id) ? 'Top-N' : 'Fuera del Top-N'}</Badge>
                      </div> : <span style={{ color: 'var(--text-muted)' }}>Sin score todavía</span>}
                    </td>
                  );
                })}
              </tr>

              {/* Puntos fuertes y a repreguntar, según los requisitos */}
              <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                <td style={{ padding: '0.75rem 1rem', fontWeight: 700, fontSize: '0.8125rem', color: 'var(--text-primary)', position: 'sticky',
                  left: 0, backgroundColor: 'var(--bg-surface)', borderRight: '1px solid var(--border-subtle)', verticalAlign: 'top' }}>
                  Puntos fuertes
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 400, marginTop: '2px' }}>Requisitos que mejor sustenta (70% o más)</div>
                </td>
                {comparedApplications.map((app) => {
                  const { fuertes } = argumentosPorRequisito(app, candidateMap.get(app.candidateId), activeJob);
                  return (
                    <td key={app.id} style={{ padding: '0.75rem 1rem', borderRight: '1px solid var(--border-subtle)', verticalAlign: 'top', fontSize: '0.8125rem' }}>
                      {fuertes.length ? fuertes.map((r) => (
                        <div key={r.id} style={{ display: 'flex', gap: '0.35rem', marginBottom: '0.3rem' }}>
                          <CheckCircle2 size={14} style={{ color: 'var(--status-verified-text)', flexShrink: 0, marginTop: '0.1rem' }} />
                          <span><strong>{r.codigo}</strong> {r.label} <span style={{ color: colorPct(r.pct) }}>({r.pct}%)</span></span>
                        </div>
                      )) : <span style={{ color: 'var(--text-muted)' }}>Ningún requisito llega al 70%.</span>}
                    </td>
                  );
                })}
              </tr>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                <td style={{ padding: '0.75rem 1rem', fontWeight: 700, fontSize: '0.8125rem', color: 'var(--text-primary)', position: 'sticky',
                  left: 0, backgroundColor: 'var(--bg-surface)', borderRight: '1px solid var(--border-subtle)', verticalAlign: 'top' }}>
                  A repreguntar en la entrevista
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 400, marginTop: '2px' }}>Requisitos con poco o ningún sustento en el perfil</div>
                </td>
                {comparedApplications.map((app) => {
                  const { aRevisar } = argumentosPorRequisito(app, candidateMap.get(app.candidateId), activeJob);
                  return (
                    <td key={app.id} style={{ padding: '0.75rem 1rem', borderRight: '1px solid var(--border-subtle)', verticalAlign: 'top', fontSize: '0.8125rem' }}>
                      {aRevisar.length ? aRevisar.map((r) => (
                        <div key={r.id} style={{ display: 'flex', gap: '0.35rem', marginBottom: '0.3rem' }}>
                          <AlertCircle size={14} style={{ color: 'var(--status-partial-text)', flexShrink: 0, marginTop: '0.1rem' }} />
                          <span><strong>{r.codigo}</strong> {r.label} <span style={{ color: colorPct(r.pct) }}>({r.pct === null ? 'sin evidencia' : `${r.pct}%`})</span></span>
                        </div>
                      )) : <span style={{ color: 'var(--text-muted)' }}>Sin requisitos débiles.</span>}
                    </td>
                  );
                })}
              </tr>

              {/* Perfil: experiencia reciente, estudios e idiomas */}
              {([
                ['Trayectoria laboral', (app: Application) => {
                  if (!activeJob?.bumeran?.avisoId) return 'Sin análisis compartido';
                  if (trayectoria.loading) return 'Consultando trayectoria…';
                  if (trayectoria.error) return 'Trayectoria no disponible';
                  const id = candidateMap.get(app.candidateId)?.importedProfile?.externalId || '';
                  const row = trayectoria.rows[id];
                  return ESTADOS_TRAYECTORIA[row?.estado || 'pendiente'];
                }],
                ['Experiencia reciente', (app: Application) => {
                  const e = perfilBumeran(candidateMap.get(app.candidateId)).experiencias[0];
                  return e ? <><strong>{e.puesto}</strong><div style={{ color: 'var(--text-secondary)' }}>{[e.empresa, e.periodo].filter(Boolean).join(' · ')}</div></> : '—';
                }],
                ['Estudios (mayor nivel)', (app: Application) => {
                  const e = perfilBumeran(candidateMap.get(app.candidateId)).mejorEstudio;
                  return e ? <><strong>{e.titulo}</strong><div style={{ color: 'var(--text-secondary)' }}>{[e.institucion, [e.nivel, e.estado].filter(Boolean).join(', ')].filter(Boolean).join(' · ')}</div></> : '—';
                }],
                ['Idiomas', (app: Application) => perfilBumeran(candidateMap.get(app.candidateId)).idiomas || '—'],
              ] as [string, (app: Application) => React.ReactNode][]).map(([titulo, valor]) => (
                <tr key={titulo} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                <td style={{ padding: '0.75rem 1rem', fontWeight: 700, fontSize: '0.8125rem', color: 'var(--text-primary)', position: 'sticky',
                  left: 0, backgroundColor: 'var(--bg-surface)', borderRight: '1px solid var(--border-subtle)', verticalAlign: 'top' }}>{titulo}</td>
                  {comparedApplications.map((app) => <td key={app.id} style={{ padding: '0.75rem 1rem', borderRight: '1px solid var(--border-subtle)', verticalAlign: 'top', fontSize: '0.8125rem' }}>{valor(app)}</td>)}
                </tr>
              ))}

              {/* Fila divisoria: requisitos del aviso */}
              <tr style={{ backgroundColor: 'var(--bg-base)', borderBottom: '2px solid var(--border-default)' }}>
                <td colSpan={1 + comparedApplications.length} style={{ padding: '0.5rem 1rem', fontSize: '0.75rem', fontWeight: 700,
                  textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                  Requisitos del aviso: similitud y evidencia de cada perfil
                </td>
              </tr>

              {activeJob.criteria.map((crit, k) => (
                <tr key={crit.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                <td style={{ padding: '0.75rem 1rem', fontWeight: 700, fontSize: '0.8125rem', color: 'var(--text-primary)', position: 'sticky',
                  left: 0, backgroundColor: 'var(--bg-surface)', borderRight: '1px solid var(--border-subtle)', verticalAlign: 'top' }}>
                    <div><span style={{ color: 'var(--primary-red)' }}>R{k + 1}.</span> {crit.label}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 400, marginTop: '2px' }}>peso {crit.weightPct}%</div>
                  </td>
                  {comparedApplications.map((app) => {
                    const r = argumentosPorRequisito(app, candidateMap.get(app.candidateId), activeJob).requisitos[k];
                    return (
                      <td key={app.id} style={{ padding: '0.75rem 1rem', borderRight: '1px solid var(--border-subtle)', verticalAlign: 'top', fontSize: '0.8125rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                          <strong style={{ color: colorPct(r.pct), minWidth: '2.6rem' }} className="tabular-nums">{r.pct === null ? '—' : `${r.pct}%`}</strong>
                          <div style={{ flex: 1, height: '6px', borderRadius: '3px', backgroundColor: 'var(--bg-muted)', overflow: 'hidden' }}>
                            <div style={{ width: `${r.pct ?? 0}%`, height: '100%', backgroundColor: colorPct(r.pct) }} />
                          </div>
                        </div>
                        <span style={{ color: 'var(--text-secondary)', lineHeight: 1.45 }}>{r.evidencia || 'Sin evidencia en el perfil.'}</span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        </>
      )}

      {/* Modal de decisión desde el comparador */}
      <AdvanceDecisionModal
        isOpen={isAdvanceModalOpen}
        onClose={() => setIsAdvanceModalOpen(false)}
        selectedApplications={comparedApplications}
        candidates={appState.candidates}
        job={activeJob}
        method={appState.selectedMethod}
        topIds={topIds}
        onConfirmAdvance={async (rejectOthers, customMsg) => {
          const saved = await handleAdvanceSelected(rejectOthers, customMsg);
          if (saved) setCurrentView('mejores_candidatos');
          return saved;
        }}
      />
    </div>
  );
}
