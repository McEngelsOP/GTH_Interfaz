import React from 'react';
import { AlertCircle, ArrowRight, CheckCircle2, Clock, Database, RefreshCw, UploadCloud } from 'lucide-react';
import { useApp } from '../context/AppContext.tsx';
import { Badge } from '../components/common/Badge.tsx';
import { Button } from '../components/common/Button.tsx';
import type { useBumeranSync } from '../services/useBumeranSync.ts';
import { EstadoCorrida, fechaHora, resumirRanking, resumirRevisiones, timeAgo } from '../services/bumeranSync.ts';

type Sync = ReturnType<typeof useBumeranSync>;

const ESTADO: Record<EstadoCorrida, { texto: string; variant: 'success' | 'danger' | 'warning' | 'info' }> = {
  ok: { texto: 'Completa', variant: 'success' },
  error: { texto: 'Con errores', variant: 'danger' },
  en_curso: { texto: 'En curso', variant: 'info' },
  interrumpida: { texto: 'Interrumpida', variant: 'warning' },
};

const card: React.CSSProperties = {
  backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)',
  padding: '1.1rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', minWidth: 0,
};
const titulo: React.CSSProperties = { fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' };
const ayuda: React.CSSProperties = { fontSize: '0.8rem', color: 'var(--text-secondary)' };

function Dato({ valor, etiqueta }: { valor: React.ReactNode; etiqueta: string }) {
  return <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem', minWidth: 0 }}>
    <span style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>{valor}</span>
    <span style={ayuda}>{etiqueta}</span>
  </div>;
}

function EstadoParte({ nombre, parte }: { nombre: string; parte: { loading: boolean; error: string; checkedAt: string | null } }) {
  const icono = parte.error ? <AlertCircle size={15} style={{ color: 'var(--status-failed-text)' }} />
    : parte.loading ? <RefreshCw size={15} className="spin" style={{ color: 'var(--text-muted)' }} />
      : <CheckCircle2 size={15} style={{ color: 'var(--status-verified-text)' }} />;
  return <li style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start', fontSize: '0.84rem' }}>
    <span style={{ marginTop: '0.1rem', flexShrink: 0 }}>{icono}</span>
    <span><strong>{nombre}:</strong> {parte.error || (parte.loading ? 'consultando…' : parte.checkedAt ? `leído ${timeAgo(parte.checkedAt)}` : 'sin consultar')}</span>
  </li>;
}

export function ActualizacionDatosView({ sync }: { sync: Sync }) {
  const { appState, activeJob, activeJobApplications, setActiveJobPostingId, setCurrentView } = useApp();
  const revisiones = resumirRevisiones(sync.runs.rows);
  const ultima = revisiones[0];
  const ranking = resumirRanking(sync.runs.rows);
  const avisos = appState.jobPostings.filter((job) => job.bumeran)
    .sort((a, b) => Date.parse(b.bumeran!.updatedAt || '') - Date.parse(a.bumeran!.updatedAt || '') || a.title.localeCompare(b.title));
  const conRanking = avisos.filter((job) => job.bumeran!.rankingAt).length;
  const enOrigen = avisos.reduce((s, job) => s + (job.bumeran!.received || 0), 0);
  const errores = [sync.postings.error, sync.applicants.error, sync.ranking.error, sync.runs.error].filter(Boolean);
  const rankeados = activeJobApplications.filter((a) => a.embeddingMatch?.criteriaVersion === activeJob?.criteriaVersion).length;

  const abrir = (jobId: string) => { setActiveJobPostingId(jobId); setCurrentView('mejores_candidatos'); };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      {/* Encabezado */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--primary-red-subtle)',
            color: 'var(--primary-red)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Database size={22} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--text-primary)' }}>Actualización de datos</h1>
            <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
              Cuándo se revisó Bumeran por última vez, qué datos nuevos trajo y el estado de cada aviso.
              La revisión de Bumeran se hace automáticamente <strong>cada 30 minutos</strong> mientras el servidor de GTH (laptop) está prendido.
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {/* Lo habitual es recolectar desde Bumeran; la carga de un archivo queda como opción secundaria */}
          <Button variant="ghost" icon={<UploadCloud size={16} />} onClick={() => setCurrentView('agregar_archivos')}
            title="Cargar postulantes desde un CSV o Excel (casos excepcionales, fuera de Bumeran)">
            Importar postulantes desde archivo
          </Button>
          {/* Deshabilitado hasta la migración a Azure; mientras tanto la app se consulta sola cada 5 minutos */}
          {sync.configured && <Button variant="primary" icon={<RefreshCw size={16} />} disabled
            title="Deshabilitado por ahora: se habilitará cuando se complete la migración a Azure">
            Volver a cargar datos (deshabilitado hasta la migración a Azure)
          </Button>}
        </div>
      </div>

      {!sync.configured && <p role="status" className="import-card">Esta instalación no está conectada a Supabase: los datos se cargan manualmente.</p>}

      {sync.configured && <>
        {errores.length > 0 && <div role="alert" style={{ ...card, flexDirection: 'row', alignItems: 'flex-start', gap: '0.6rem',
          borderColor: 'var(--status-failed-border)', marginBottom: '1rem' }}>
          <AlertCircle size={18} style={{ color: 'var(--status-failed-text)', flexShrink: 0, marginTop: '0.1rem' }} />
          <span style={{ fontSize: '0.86rem' }}>{errores.join(' ')}</span>
        </div>}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
          {/* Última revisión del scraper */}
          <section style={card} aria-label="Última revisión de Bumeran">
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <h2 style={titulo}>Última revisión de Bumeran</h2>
              {ultima && <Badge size="sm" variant={ESTADO[ultima.estado].variant}>{ESTADO[ultima.estado].texto}</Badge>}
            </div>
            <p style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', fontSize: '0.84rem', color: 'var(--text-primary)' }}>
              <Clock size={15} style={{ color: 'var(--text-muted)' }} />
              Cada <strong>30 minutos</strong> mientras el servidor de GTH está prendido
            </p>
            {ultima ? <>
              <div>
                <p style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)' }}>{fechaHora(ultima.inicio)}</p>
                <p style={ayuda}>{timeAgo(ultima.inicio)}{ultima.duracionMin !== null ? ` · duró ${ultima.duracionMin} min` : ''}</p>
              </div>
              <p style={{ ...ayuda, fontWeight: 600, color: 'var(--text-primary)' }}>Qué trajo</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '0.75rem 1rem' }}>
                <Dato valor={ultima.avisosRevisados ?? '—'} etiqueta="avisos revisados" />
                <Dato valor={ultima.postulantesNuevos.toLocaleString('es-PE')} etiqueta={`postulantes nuevos (${ultima.avisosConCsv} ${ultima.avisosConCsv === 1 ? 'aviso' : 'avisos'} con CSV)`} />
                <Dato valor={ultima.cvsNuevos} etiqueta="CV en PDF descargados" />
                <Dato valor={ultima.errores} etiqueta="pasos con error" />
              </div>
            </> : <p style={ayuda}>{sync.runs.loading ? 'Consultando el historial…' : 'Aún no hay revisiones registradas.'}</p>}
          </section>

          {/* Ranking e5 */}
          <section style={card} aria-label="Último cálculo del ranking">
            <h2 style={titulo}>Último cálculo del ranking e5</h2>
            {ranking ? <>
              <div>
                <p style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)' }}>{fechaHora(ranking.fin)}</p>
                <p style={ayuda}>{timeAgo(ranking.fin)}</p>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '0.75rem 1rem' }}>
                <Dato valor={ranking.avisos} etiqueta="avisos calculados en esa tanda" />
                <Dato valor={ranking.postulantes.toLocaleString('es-PE')} etiqueta="postulantes con score nuevo" />
                <Dato valor={`${conRanking} / ${avisos.length}`} etiqueta="avisos con ranking hoy" />
                <Dato valor={enOrigen.toLocaleString('es-PE')} etiqueta="postulantes en origen" />
              </div>
            </> : <p style={ayuda}>{sync.runs.loading ? 'Consultando…' : 'Todavía no se calculó el ranking.'}</p>}
          </section>

          {/* Esta aplicación */}
          <section style={card} aria-label="Sincronización de Bumeran">
            <h2 style={titulo}>Datos en esta aplicación</h2>
            <p style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', fontSize: '0.86rem', color: 'var(--text-primary)' }}>
              <Clock size={15} style={{ color: 'var(--text-muted)' }} />
              Última consulta a Supabase: <strong>{sync.postings.checkedAt ? timeAgo(sync.postings.checkedAt) : '—'}</strong>
            </p>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <EstadoParte nombre="Convocatorias" parte={sync.postings} />
              <EstadoParte nombre="Candidatos del aviso activo" parte={sync.applicants} />
              <EstadoParte nombre="Ranking del aviso activo" parte={sync.ranking} />
              <EstadoParte nombre="Historial de revisiones" parte={sync.runs} />
            </ul>
            {activeJob?.bumeran && <p style={{ fontSize: '0.84rem' }}>
              <strong>{activeJob.title}:</strong> {activeJobApplications.length} {activeJobApplications.length === 1 ? 'candidato incorporado' : 'candidatos incorporados'} · {rankeados} con ranking
            </p>}
            <p style={ayuda}>Se consulta sola cada 5 minutos. El botón «Volver a cargar datos» está deshabilitado hasta la migración a Azure.</p>
          </section>
        </div>

        {/* Avisos */}
        <section style={{ ...card, padding: 0, gap: 0, marginBottom: '1rem' }} aria-label="Avisos sincronizados">
          <div style={{ padding: '1rem 1.25rem 0.75rem' }}>
            <h2 style={titulo}>Avisos sincronizados ({avisos.length})</h2>
            <p style={ayuda}>Ordenados por la última descarga de su CSV de postulantes.</p>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem', minWidth: '720px' }}>
              <thead>
                <tr style={{ backgroundColor: 'var(--bg-muted)', color: 'var(--text-secondary)', textAlign: 'left' }}>
                  {['Puesto', 'Código', 'Postulantes', 'Último CSV', 'Ranking e5', ''].map((h) =>
                    <th key={h} style={{ padding: '0.6rem 1.25rem', fontWeight: 600, whiteSpace: 'nowrap' }}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {avisos.map((job) => <tr key={job.id} style={{ borderTop: '1px solid var(--border-subtle)' }}>
                  <td style={{ padding: '0.6rem 1.25rem', fontWeight: 600, color: 'var(--text-primary)' }}>{job.title}</td>
                  <td style={{ padding: '0.6rem 1.25rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{job.code}</td>
                  <td style={{ padding: '0.6rem 1.25rem', fontVariantNumeric: 'tabular-nums' }}>{job.bumeran!.received ?? '—'}</td>
                  <td style={{ padding: '0.6rem 1.25rem', whiteSpace: 'nowrap' }} title={fechaHora(job.bumeran!.updatedAt)}>{timeAgo(job.bumeran!.updatedAt)}</td>
                  <td style={{ padding: '0.6rem 1.25rem', whiteSpace: 'nowrap' }}>
                    {job.bumeran!.rankingAt
                      ? <Badge size="sm" variant="success">Calculado {timeAgo(job.bumeran!.rankingAt)}</Badge>
                      : <Badge size="sm" variant="warning">Pendiente</Badge>}
                  </td>
                  <td style={{ padding: '0.45rem 1.25rem', textAlign: 'right' }}>
                    <Button size="sm" variant="ghost" icon={<ArrowRight size={14} />} iconPosition="right" onClick={() => abrir(job.id)}>Ver candidatos</Button>
                  </td>
                </tr>)}
                {!avisos.length && <tr><td colSpan={6} style={{ padding: '1rem 1.25rem', ...ayuda }}>
                  {sync.postings.loading ? 'Consultando avisos…' : 'Todavía no hay avisos de Bumeran sincronizados.'}</td></tr>}
              </tbody>
            </table>
          </div>
        </section>

        {/* Historial */}
        {revisiones.length > 1 && <section style={card} aria-label="Historial de revisiones">
          <h2 style={titulo}>Historial de revisiones</h2>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column' }}>
            {revisiones.slice(0, 8).map((r) => <li key={r.inicio} style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap',
              padding: '0.55rem 0', borderTop: '1px solid var(--border-subtle)', fontSize: '0.84rem' }}>
              <span style={{ minWidth: '9.5rem', fontVariantNumeric: 'tabular-nums' }}>{fechaHora(r.inicio)}</span>
              <Badge size="sm" variant={ESTADO[r.estado].variant}>{ESTADO[r.estado].texto}</Badge>
              <span style={{ color: 'var(--text-secondary)' }}>
                {r.avisosRevisados ?? '—'} avisos · {r.postulantesNuevos.toLocaleString('es-PE')} postulantes nuevos · {r.cvsNuevos} CV
                {r.duracionMin !== null ? ` · ${r.duracionMin} min` : ''}
              </span>
            </li>)}
          </ul>
        </section>}
      </>}
    </div>
  );
}
