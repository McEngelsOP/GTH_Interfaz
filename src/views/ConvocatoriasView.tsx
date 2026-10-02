import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext.tsx';
import { JobPosting, JobCategory, JobStatus } from '../types/index.ts';
import { Badge } from '../components/common/Badge.tsx';
import { Button } from '../components/common/Button.tsx';
import {
  Briefcase,
  Search,
  PlusCircle,
  Users,
  Calendar,
  CheckCircle2,
  Clock,
  ArrowRight,
  ShieldCheck,
  Building,
} from 'lucide-react';

export function ConvocatoriasView() {
  const { appState, setActiveJobPostingId, setCurrentView, showToast, handleActivateJobPosting } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');

  // Conteo de postulaciones por convocatoria calculado en tiempo real
  const candidateCountsByJob = useMemo(() => {
    const counts: Record<string, number> = {};
    appState.jobPostings.forEach((job) => {
      counts[job.id] = 0;
    });
    appState.applications.forEach((app) => {
      if (counts[app.jobPostingId] !== undefined) {
        counts[app.jobPostingId]++;
      }
    });
    return counts;
  }, [appState.jobPostings, appState.applications]);

  // Filtrado
  const filteredJobs = useMemo(() => {
    return appState.jobPostings.filter((job) => {
      // Búsqueda
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesTitle = job.title.toLowerCase().includes(query);
        const matchesCode = job.code.toLowerCase().includes(query);
        const matchesDept = job.department.toLowerCase().includes(query);
        if (!matchesTitle && !matchesCode && !matchesDept) return false;
      }

      // Categoría
      if (selectedCategory !== 'ALL' && job.category !== selectedCategory) {
        return false;
      }

      // Estado
      if (selectedStatus !== 'ALL' && job.status !== selectedStatus) {
        return false;
      }

      return true;
    });
  }, [appState.jobPostings, searchQuery, selectedCategory, selectedStatus]);

  const handleOpenJob = (job: JobPosting) => {
    setActiveJobPostingId(job.id);
    const count = candidateCountsByJob[job.id] || 0;
    if (count === 0) {
      showToast(`Convocatoria "${job.title}" seleccionada. Aún no cuenta con postulantes registrados.`, 'info');
      setCurrentView('mejores_candidatos');
    } else {
      showToast(`Convocatoria "${job.title}" seleccionada con ${count} postulantes.`, 'info');
      setCurrentView('mejores_candidatos');
    }
  };

  return (
    <div style={{ maxWidth: '1440px', margin: '0 auto', width: '100%' }}>
      {/* Cabecera de la sección */}
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--primary-red-subtle)',
              color: 'var(--primary-red)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Briefcase size={22} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              Convocatorias de Selección
            </h1>
            <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
              Gestión de puestos docentes, administrativos, operativos y directivos de la Universidad ESAN.
            </p>
          </div>
        </div>

        <Button
          variant="primary"
          icon={<PlusCircle size={16} />}
          onClick={() => setCurrentView('nueva_convocatoria')}
        >
          Nueva convocatoria
        </Button>
      </div>

      {/* Barra de Filtros y Búsqueda */}
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
          marginBottom: '1.5rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flex: 1, minWidth: '280px' }}>
          <div style={{ position: 'relative', flex: 1, maxWidth: '380px' }}>
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
              placeholder="Buscar por puesto, código o área institucional..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
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

          {/* Filtro por Categoría */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
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
            <option value="ALL">Todas las categorías</option>
            <option value="docente">Docentes e investigadores</option>
            <option value="administrativo">Administrativos y gestión</option>
            <option value="operativo">Operativos y soporte</option>
            <option value="directivo">Directivos</option>
          </select>

          {/* Filtro por Estado */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
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
            <option value="ALL">Todos los estados</option>
            <option value="activa">Convocatorias Abiertas</option>
            <option value="borrador">Borradores</option>
          </select>
        </div>

        <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
          Mostrando <strong>{filteredJobs.length}</strong> de {appState.jobPostings.length} convocatorias
        </span>
      </div>

      {/* Grid de Convocatorias (18 iniciales) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
          gap: '1.25rem',
        }}
      >
        {filteredJobs.map((job) => {
          const count = candidateCountsByJob[job.id] || 0;
          const isCurrentActive = job.id === appState.activeJobPostingId;

          return (
            <div
              key={job.id}
              style={{
                backgroundColor: 'var(--bg-surface)',
                borderRadius: 'var(--radius-lg)',
                border: isCurrentActive
                  ? '2px solid var(--primary-red)'
                  : '1px solid var(--border-default)',
                boxShadow: isCurrentActive ? 'var(--shadow-md)' : 'var(--shadow-sm)',
                padding: '1.25rem',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                transition: 'all var(--transition-fast)',
                position: 'relative',
              }}
            >
              <div>
                {/* Badges de código, categoría y estado */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '0.65rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
                    <Badge variant="primary" size="sm">
                      {job.code}
                    </Badge>
                    <Badge
                      size="sm"
                      variant={
                        job.category === 'docente'
                          ? 'purple'
                          : job.category === 'administrativo'
                          ? 'info'
                          : job.category === 'directivo'
                          ? 'warning'
                          : 'neutral'
                      }
                    >
                      {job.category.charAt(0).toUpperCase() + job.category.slice(1)}
                    </Badge>
                  </div>

                  <span
                    style={{
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      color: job.status === 'activa' ? 'var(--status-verified-text)' : 'var(--text-muted)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.25rem',
                    }}
                  >
                    ● {job.status === 'activa' ? 'Abierta' : 'Borrador'}
                  </span>
                </div>

                {/* Título del puesto */}
                <h3
                  style={{
                    fontSize: '1.05rem',
                    fontWeight: 700,
                    lineHeight: 1.35,
                    color: 'var(--text-primary)',
                    marginBottom: '0.5rem',
                  }}
                >
                  {job.title}
                </h3>

                {/* Área y Período */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: '0.85rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <Building size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                    <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {job.department}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <Calendar size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                    <span>{job.period}</span>
                  </div>
                </div>

                {/* Requisito Obligatorio */}
                <div
                  style={{
                    padding: '0.5rem 0.65rem',
                    backgroundColor: 'var(--bg-base)',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-subtle)',
                    fontSize: '0.78rem',
                    color: 'var(--text-secondary)',
                    lineHeight: 1.4,
                    marginBottom: '1rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontWeight: 600, color: 'var(--primary-red)', marginBottom: '0.15rem' }}>
                    <ShieldCheck size={13} />
                    <span>Requisito obligatorio:</span>
                  </div>
                  <span>{job.knockoutRule}</span>
                </div>
              </div>

              {/* Pie de tarjeta con conteo de postulaciones y botón */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingTop: '0.85rem',
                  borderTop: '1px solid var(--border-subtle)',
                  marginTop: 'auto',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                  <Users size={16} style={{ color: count > 0 ? 'var(--primary-red)' : 'var(--text-muted)' }} />
                  <span style={{ fontSize: '0.84rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                    {count}{' '}
                    <span style={{ fontWeight: 400, color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                      {count === 1 ? 'postulación' : 'postulaciones'}
                    </span>
                  </span>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {job.status === 'borrador' && <Button size="sm" variant="outline" onClick={() => handleActivateJobPosting(job.id)}>Activar convocatoria</Button>}
                <Button
                  variant={isCurrentActive ? 'primary' : 'secondary'}
                  size="sm"
                  icon={<ArrowRight size={14} />}
                  iconPosition="right"
                  onClick={() => handleOpenJob(job)}
                >
                  {isCurrentActive ? 'Puesto seleccionado' : 'Abrir puesto'}
                </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

