import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext.tsx';
import { Application, Candidate, EvaluationMethod } from '../../types/index.ts';
import { StageBadge } from './StageBadge.tsx';
import { RequirementPill } from './RequirementPill.tsx';
import { ScoreBadge } from './ScoreBadge.tsx';
import { Button } from '../common/Button.tsx';
import { Badge } from '../common/Badge.tsx';
import {
  Search,
  Filter,
  Eye,
  UserCheck,
  UserX,
  Bookmark,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
  FileText,
  Download,
  Star,
} from 'lucide-react';
import { isEligibleForTopN, getScoreByMethod } from '../../services/recruitmentRules.ts';
import { exportCandidatesCSV } from '../../services/exportService.ts';

interface CandidateTableProps {
  applications: Application[];
  selectedMethod: EvaluationMethod;
  onOpenReleaseModal: (app: Application, cand: Candidate) => void;
  onQuickAdvance: (app: Application) => void;
}

export function CandidateTable({
  applications,
  selectedMethod,
  onOpenReleaseModal,
  onQuickAdvance,
}: CandidateTableProps) {
  const {
    appState,
    activeJob,
    selectedApplicationIds,
    toggleApplicationSelection,
    selectAllApplications,
    clearApplicationSelection,
    openCandidateDrawer,
    handleQuickAdvanceToBest,
    handleRevertToPostulado,
    showToast,
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [sourceFilter, setSourceFilter] = useState('ALL');
  const [requirementFilter, setRequirementFilter] = useState('ALL');
  const [density, setDensity] = useState<'comfortable' | 'compact'>('comfortable');
  const [pageSize, setPageSize] = useState<number>(25);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Mapear candidatos por ID para acceso rápido
  const candidateMap = useMemo(() => {
    const map = new Map<string, Candidate>();
    appState.candidates.forEach((c) => map.set(c.id, c));
    return map;
  }, [appState.candidates]);

  // Fuentes únicas existentes
  const availableSources = useMemo(() => {
    const set = new Set<string>();
    applications.forEach((a) => {
      const c = candidateMap.get(a.candidateId);
      if (c?.source) set.add(c.source);
    });
    return Array.from(set);
  }, [applications, candidateMap]);

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

      // Filtro de fuente
      if (sourceFilter !== 'ALL' && cand.source !== sourceFilter) {
        return false;
      }

      // Filtro de requisitos
      if (requirementFilter !== 'ALL' && app.mandatoryRequirementStatus !== requirementFilter) {
        return false;
      }

      return true;
    });
  }, [applications, candidateMap, searchQuery, sourceFilter, requirementFilter]);

  // Ordenar por el método seleccionado
  const sortedApplications = useMemo(() => {
    return [...filteredApplications].sort((a, b) => {
      const scoreA = getScoreByMethod(a, selectedMethod) ?? -1;
      const scoreB = getScoreByMethod(b, selectedMethod) ?? -1;
      return scoreB - scoreA;
    });
  }, [filteredApplications, selectedMethod]);

  // Paginación
  const totalItems = sortedApplications.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const validPage = Math.min(currentPage, totalPages);

  const paginatedApplications = useMemo(() => {
    const start = (validPage - 1) * pageSize;
    return sortedApplications.slice(start, start + pageSize);
  }, [sortedApplications, validPage, pageSize]);

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

  const handleSaveToTalentPool = (cand: Candidate) => {
    showToast(`El perfil de ${cand.name} ha sido guardado en el Banco de Talento.`, 'success');
  };

  const handleExportCurrentTable = () => {
    if (!activeJob) return;
    if (sortedApplications.length === 0) {
      showToast('No hay candidatos en la lista actual para exportar.', 'warning');
      return;
    }
    exportCandidatesCSV({
      applications: sortedApplications,
      candidates: appState.candidates,
      job: activeJob,
      method: selectedMethod,
      scopeName: 'Tabla_filtrada',
    });
    showToast(`Descargando CSV con ${sortedApplications.length} candidatos de la tabla.`, 'success');
  };

  const handleExportSingle = (app: Application, cand?: Candidate) => {
    if (!activeJob) return;
    exportCandidatesCSV({
      applications: [app],
      candidates: cand ? [cand] : appState.candidates,
      job: activeJob,
      method: selectedMethod,
      scopeName: cand ? cand.name.replace(/\s+/g, '_') : 'Candidato',
    });
    showToast(`Expediente de ${cand?.name || 'candidato'} descargado en CSV.`, 'success');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%' }}>
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

          {/* Filtro de Fuente */}
          <select
            value={sourceFilter}
            onChange={(e) => {
              setSourceFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="focus-ring"
            style={{
              padding: '0.45rem 0.65rem',
              fontSize: '0.8125rem',
              backgroundColor: 'var(--bg-base)',
              border: '1px solid var(--border-default)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--text-primary)',
              cursor: 'pointer',
            }}
          >
            <option value="ALL">Todas las fuentes</option>
            {availableSources.map((src) => (
              <option key={src} value={src}>
                {src}
              </option>
            ))}
          </select>

          {/* Filtro de Requisitos */}
          <select
            value={requirementFilter}
            onChange={(e) => {
              setRequirementFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="focus-ring"
            style={{
              padding: '0.45rem 0.65rem',
              fontSize: '0.8125rem',
              backgroundColor: 'var(--bg-base)',
              border: '1px solid var(--border-default)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--text-primary)',
              cursor: 'pointer',
            }}
          >
            <option value="ALL">Todos los requisitos</option>
            <option value="verificado">Solo Verificados</option>
            <option value="parcial">Parciales</option>
            <option value="sin_verificar">Sin verificar</option>
            <option value="no_cumple">No cumple</option>
          </select>
        </div>

        {/* Densidad, Exportar y Paginación */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <Button
            variant="secondary"
            size="sm"
            icon={<Download size={14} />}
            onClick={handleExportCurrentTable}
            title="Descargar todos los candidatos de esta tabla en archivo CSV"
          >
            Exportar tabla CSV ({totalItems})
          </Button>

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
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            textAlign: 'left',
            fontSize: density === 'compact' ? '0.8125rem' : '0.875rem',
          }}
        >
          <thead>
            <tr
              style={{
                backgroundColor: 'var(--bg-base)',
                borderBottom: '1px solid var(--border-default)',
                color: 'var(--text-secondary)',
                fontSize: '0.75rem',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
              }}
            >
              <th style={{ width: '40px', padding: '0.75rem 0.85rem' }}>
                <input
                  type="checkbox"
                  checked={allCurrentPageSelected}
                  onChange={handleToggleSelectAllPage}
                  aria-label="Seleccionar todos los de esta página"
                  style={{ cursor: 'pointer', accentColor: 'var(--primary-red)' }}
                />
              </th>
              <th style={{ width: '45px', padding: '0.75rem 0.5rem' }}>#</th>
              <th style={{ padding: '0.75rem 1rem', minWidth: '220px' }}>Candidato</th>
              <th style={{ padding: '0.75rem 1rem', minWidth: '130px' }}>Etapa</th>
              <th style={{ padding: '0.75rem 1rem', minWidth: '130px' }}>Requisitos</th>
              <th style={{ padding: '0.75rem 1rem', minWidth: '100px' }}>ML Score</th>
              <th style={{ padding: '0.75rem 1rem', minWidth: '100px' }}>LLM Score</th>
              <th style={{ padding: '0.75rem 1rem', minWidth: '120px' }}>Fuente</th>
              <th style={{ padding: '0.75rem 1rem', minWidth: '220px', textAlign: 'right' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {paginatedApplications.length === 0 ? (
              <tr>
                <td colSpan={9} style={{ padding: '3rem 1rem', textAlign: 'center' }}>
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
                const rowRank = (validPage - 1) * pageSize + index + 1;
                const cellPadding = density === 'compact' ? '0.45rem 1rem' : '0.8rem 1rem';

                return (
                  <tr
                    key={app.id}
                    style={{
                      borderBottom: '1px solid var(--border-subtle)',
                      backgroundColor: isSelected
                        ? 'var(--primary-red-subtle)'
                        : 'transparent',
                      transition: 'background-color var(--transition-fast)',
                    }}
                  >
                    {/* Checkbox */}
                    <td style={{ padding: '0.6rem 0.85rem' }}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleApplicationSelection(app.id)}
                        aria-label={`Seleccionar ${cand?.name}`}
                        style={{ cursor: 'pointer', accentColor: 'var(--primary-red)' }}
                      />
                    </td>

                    {/* Posición en ranking */}
                    <td style={{ padding: '0.6rem 0.5rem', color: 'var(--text-muted)', fontWeight: 600 }}>
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
                      </div>
                    </td>

                    {/* Etapa actual */}
                    <td style={{ padding: cellPadding }}>
                      <StageBadge stage={app.stage} size="sm" />
                    </td>

                    {/* Requisito obligatorio */}
                    <td style={{ padding: cellPadding }}>
                      <RequirementPill
                        status={app.mandatoryRequirementStatus}
                        justification={app.requirementJustification}
                        criteriaBreakdown={app.criteriaBreakdown}
                      />
                    </td>

                    {/* Puntaje ML */}
                    <td style={{ padding: cellPadding }}>
                      <ScoreBadge score={app.mlScore} method="ML" size="sm" />
                    </td>

                    {/* Puntaje LLM */}
                    <td style={{ padding: cellPadding }}>
                      <ScoreBadge score={app.llmScore} method="LLM" size="sm" />
                    </td>

                    {/* Fuente */}
                    <td style={{ padding: cellPadding, color: 'var(--text-secondary)', fontSize: '0.8125rem' }}>
                      {cand?.source || 'No registrada'}
                    </td>

                    {/* Acciones por fila */}
                    <td style={{ padding: cellPadding, textAlign: 'right' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.35rem', flexWrap: 'nowrap' }}>
                        <Button
                          variant="ghost"
                          size="sm"
                          icon={<Eye size={14} />}
                          onClick={() => openCandidateDrawer(app)}
                          title="Abrir ficha técnica del candidato"
                        >
                          Revisar
                        </Button>

                        {/* Mover / Indicar como los mejores */}
                        {app.stage === 'postulado' && (
                          <Button
                            variant="secondary"
                            size="sm"
                            icon={<Star size={13} fill="#D97706" style={{ color: '#D97706' }} />}
                            onClick={() => handleQuickAdvanceToBest(app.id)}
                            title="Designar y mover directamente a Los Mejores (Preseleccionado)"
                          >
                            Mejor
                          </Button>
                        )}

                        {app.stage === 'preseleccionado' && (
                          <span
                            title="Candidato ya designado en Los Mejores (Preseleccionado). Clic para revertir a Postulado si lo requiere."
                            onClick={() => handleRevertToPostulado(app.id)}
                            style={{ cursor: 'pointer' }}
                          >
                            <Badge variant="success" size="sm" icon={<Star size={11} fill="currentColor" />}>
                              Mejor
                            </Badge>
                          </span>
                        )}

                        {/* Exportar este candidato individual a CSV */}
                        <Button
                          variant="ghost"
                          size="sm"
                          icon={<Download size={14} />}
                          onClick={() => handleExportSingle(app, cand)}
                          title={`Descargar expediente de ${cand?.name || 'candidato'} en CSV`}
                        />

                        <Button
                          variant="ghost"
                          size="sm"
                          icon={<Bookmark size={14} />}
                          onClick={() => cand && handleSaveToTalentPool(cand)}
                          title="Conservar en Banco de Talento"
                        />

                        {app.stage !== 'no_continua' && (
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
    </div>
  );
}
