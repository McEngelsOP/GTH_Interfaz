import React, { useMemo, useState } from 'react';
import { useApp } from '../context/AppContext.tsx';
import { JobPosting } from '../types/index.ts';
import { Badge } from '../components/common/Badge.tsx';
import { Button } from '../components/common/Button.tsx';
import { fechaHora, timeAgo } from '../services/bumeranSync.ts';
import {
  Briefcase, Search, PlusCircle, Users, Calendar, ArrowRight, ShieldCheck, MapPin, ExternalLink, Clock, Sparkles, FileText, ChevronDown,
} from 'lucide-react';

// Convocatorias en filas delgadas (como el listado de Bumeran), cada una con «Ver candidatos». Al hacer clic en una fila
// se despliega debajo el aviso completo. Los filtros usan los datos que publica Bumeran (área y nivel).

const TODOS = 'ALL';
const opciones = (valores: (string | null | undefined)[]) =>
  Array.from(new Set(valores.filter((v): v is string => Boolean(v)))).sort((a, b) => a.localeCompare(b, 'es'));

/** Separa el texto del aviso en secciones («Requisitos:», «Funciones:», «¿Qué buscamos?»…) con sus líneas. */
function seccionesDelAviso(texto: string): { titulo: string | null; lineas: string[] }[] {
  const out: { titulo: string | null; lineas: string[] }[] = [{ titulo: null, lineas: [] }];
  for (const cruda of texto.split(/\r?\n/)) {
    const linea = cruda.replace(/^[\s•●▪►✓✔✅\-*·–]+/, '').trim();
    if (!linea) continue;
    if (/^([A-Za-zÁÉÍÓÚÑáéíóúñ ]{3,40}\s*:|¿[^?]{3,60}\?)$/.test(linea)) out.push({ titulo: linea.replace(/\s*:$/, ''), lineas: [] });
    else out[out.length - 1].lineas.push(linea);
  }
  return out.filter((s) => s.lineas.length || s.titulo);
}

function Chip({ children }: { children: React.ReactNode }) {
  return <span className="conv-chip">{children}</span>;
}

export function ConvocatoriasView() {
  const { appState, setActiveJobPostingId, setCurrentView, showToast, handleActivateJobPosting } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [area, setArea] = useState(TODOS);
  const [nivel, setNivel] = useState(TODOS);
  const [ranking, setRanking] = useState(TODOS);
  const [abiertoId, setAbiertoId] = useState<string | null>(null);   // al inicio, ningún aviso desplegado

  const candidateCountsByJob = useMemo(() => {
    const counts: Record<string, number> = {};
    appState.applications.forEach((app) => { counts[app.jobPostingId] = (counts[app.jobPostingId] || 0) + 1; });
    return counts;
  }, [appState.applications]);

  const detalles = appState.jobPostings.map((j) => j.bumeran?.detalle);
  const areas = opciones(detalles.map((d) => d?.area));
  const niveles = opciones(detalles.map((d) => d?.nivel));

  const filteredJobs = useMemo(() => appState.jobPostings.filter((job) => {
    const d = job.bumeran?.detalle;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const texto = [job.title, job.code, job.department, d?.area, d?.subarea, d?.ubicacion].filter(Boolean).join(' ').toLowerCase();
      if (!texto.includes(q)) return false;
    }
    if (area !== TODOS && d?.area !== area) return false;
    if (nivel !== TODOS && d?.nivel !== nivel) return false;
    if (ranking === 'con' && !job.bumeran?.rankingAt) return false;
    if (ranking === 'sin' && job.bumeran?.rankingAt) return false;
    return true;
  }).sort((a, b) => (Date.parse(b.bumeran?.detalle?.publicadoEl || b.createdAt) || 0) - (Date.parse(a.bumeran?.detalle?.publicadoEl || a.createdAt) || 0)),
  [appState.jobPostings, searchQuery, area, nivel, ranking]);


  const handleOpenJob = (job: JobPosting) => {
    setActiveJobPostingId(job.id);
    if (!job.bumeran) {
      const count = candidateCountsByJob[job.id] || 0;
      showToast(count ? `Convocatoria "${job.title}" seleccionada con ${count} postulantes.`
        : `Convocatoria "${job.title}" seleccionada. Aún no cuenta con postulantes registrados.`, 'info');
    }
    setCurrentView('mejores_candidatos');
  };

  const select = (label: string, value: string, onChange: (v: string) => void, items: string[], todos: string) => (
    <select aria-label={label} value={value} onChange={(e) => onChange(e.target.value)} className="focus-ring conv-select">
      <option value={TODOS}>{todos}</option>
      {items.map((v) => <option key={v} value={v}>{v}</option>)}
    </select>
  );
  const filtrosActivos = [area, nivel, ranking].some((v) => v !== TODOS) || searchQuery.trim() !== '';

  return (
    <div style={{ maxWidth: '1440px', margin: '0 auto', width: '100%' }}>
      {/* Cabecera */}
      <div className="conv-cabecera">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--primary-red-subtle)',
            color: 'var(--primary-red)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Briefcase size={22} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--text-primary)' }}>Convocatorias</h1>
            <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
              Haz clic en un aviso para ver su detalle, o entra directo a sus candidatos y su ranking.
            </p>
          </div>
        </div>
        <Button variant="primary" icon={<PlusCircle size={16} />} onClick={() => setCurrentView('nueva_convocatoria')}>
          Nueva convocatoria
        </Button>
      </div>

      {/* Búsqueda y filtros con los datos de Bumeran */}
      <div className="conv-filtros">
        <div style={{ position: 'relative', flex: '1 1 220px', minWidth: '160px', maxWidth: '380px' }}>
          <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input type="text" aria-label="Buscar convocatorias" placeholder="Buscar por puesto, código, área o ubicación…"
            value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="focus-ring conv-buscar" />
        </div>
        {areas.length > 0 && select('Área', area, setArea, areas, 'Todas las áreas')}
        {niveles.length > 0 && select('Nivel', nivel, setNivel, niveles, 'Todos los niveles')}
        <select aria-label="Ranking" value={ranking} onChange={(e) => setRanking(e.target.value)} className="focus-ring conv-select">
          <option value={TODOS}>Con y sin ranking</option>
          <option value="con">Con ranking calculado</option>
          <option value="sin">Ranking pendiente</option>
        </select>
        {filtrosActivos && <Button variant="ghost" size="sm" onClick={() => { setSearchQuery(''); setArea(TODOS); setNivel(TODOS); setRanking(TODOS); }}>Limpiar filtros</Button>}
        <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginLeft: 'auto', whiteSpace: 'nowrap' }}>
          Mostrando <strong>{filteredJobs.length}</strong> de {appState.jobPostings.length} convocatorias
        </span>
      </div>

      {!filteredJobs.length && <p role="status" className="import-card">{appState.jobPostings.length ? 'No hay convocatorias que coincidan con los filtros.' : 'Aún no hay convocatorias. Crea una con Nueva convocatoria o sincroniza los avisos de Bumeran.'}</p>}

      {filteredJobs.length > 0 && <ul className="conv-lista" aria-label="Lista de convocatorias">
        {filteredJobs.map((job) => {
          const d = job.bumeran?.detalle;
          const abierto = abiertoId === job.id;
          const postulantes = job.bumeran?.received ?? candidateCountsByJob[job.id] ?? 0;
          return (
            <li key={job.id} className={`conv-item${abierto ? ' abierto' : ''}`}>
              <div className="conv-fila">
                <button type="button" className="conv-fila-click focus-ring" aria-expanded={abierto} aria-controls={`aviso-${job.id}`}
                  onClick={() => setAbiertoId(abierto ? null : job.id)} title={abierto ? 'Ocultar el detalle del aviso' : 'Ver el detalle del aviso'}>
                  <ChevronDown size={16} className="conv-chevron" />
                  <span className="conv-fila-titulo">{job.title}</span>
                  <span className="conv-fila-sub">{d ? [d.subarea || d.area, d.ubicacion].filter(Boolean).join(' · ') : job.department}</span>
                  {d?.modalidad && <Chip>{d.modalidad}</Chip>}
                  {d?.nivel && <Chip>{d.nivel}</Chip>}
                  {!job.bumeran && <Chip>Carga manual</Chip>}
                  {job.status === 'borrador' && <Chip>Borrador</Chip>}
                </button>
                <span className="conv-fila-meta">
                  <span title={d?.publicadoEl ? fechaHora(d.publicadoEl.slice(0, 10)) : undefined}>{d?.publicadoEl ? `Publicado ${timeAgo(d.publicadoEl)}` : job.period}</span>
                  <span><Users size={13} /> <strong className="tabular-nums">{postulantes}</strong></span>
                  {job.bumeran && (job.bumeran.rankingAt
                    ? <Badge size="sm" variant="success">Ranking listo</Badge>
                    : <Badge size="sm" variant="warning">Ranking pendiente</Badge>)}
                </span>
                <Button size="sm" variant={job.id === appState.activeJobPostingId ? 'primary' : 'secondary'} icon={<ArrowRight size={14} />}
                  iconPosition="right" onClick={() => handleOpenJob(job)} aria-label={`Ver candidatos de ${job.title}`}>
                  Ver candidatos
                </Button>
              </div>
              {abierto && <DetalleConvocatoria job={job} postulantes={postulantes} incorporados={candidateCountsByJob[job.id] || 0}
                onActivar={() => handleActivateJobPosting(job.id)} />}
            </li>
          );
        })}
      </ul>}
    </div>
  );
}

function DetalleConvocatoria({ job, postulantes, incorporados, onActivar }: {
  job: JobPosting; postulantes: number; incorporados: number; onActivar: () => void;
}) {
  const d = job.bumeran?.detalle;
  const secciones = job.evaluationReference ? seccionesDelAviso(job.evaluationReference) : [];
  const dato = (icono: React.ReactNode, etiqueta: string, valor: React.ReactNode) => (
    <div className="conv-dato"><span>{icono}{etiqueta}</span><strong>{valor}</strong></div>
  );
  return (
    <section id={`aviso-${job.id}`} className="conv-detalle" aria-label={`Aviso: ${job.title}`}>
      <div className="conv-detalle-cabecera">
        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <Badge variant="primary" size="sm">{job.code}</Badge>
          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: job.status === 'activa' ? 'var(--status-verified-text)' : 'var(--text-muted)' }}>
            ● {job.status === 'activa' ? 'Abierta' : 'Borrador'}
          </span>
        </div>
        <h2>{job.title}</h2>
        {d && <p className="conv-detalle-sub">
          {[d.empresa, d.area && d.subarea ? `${d.area} › ${d.subarea}` : d.area].filter(Boolean).join(' · ')}
        </p>}
        {d?.ubicacion && <p className="conv-detalle-sub"><MapPin size={13} /> {d.ubicacion}</p>}
        <div className="conv-fila-chips" style={{ marginTop: '0.5rem' }}>
          {d?.modalidad && <Chip>{d.modalidad}</Chip>}
          {d?.jornada && <Chip>{d.jornada}</Chip>}
          {d?.nivel && <Chip>{d.nivel}</Chip>}
          {d?.inclusivo && <Chip>Apto para personas con discapacidad</Chip>}
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.9rem' }}>
          {job.status === 'borrador' && <Button size="sm" variant="outline" onClick={onActivar}>Activar convocatoria</Button>}
          {job.bumeran?.publicUrl && <a className="conv-enlace focus-ring" href={job.bumeran.publicUrl} target="_blank" rel="noreferrer">
            <ExternalLink size={14} /> Ver en Bumeran</a>}
        </div>
      </div>

      <div className="conv-datos">
        {dato(<Calendar size={13} />, 'Publicado', d?.publicadoEl ? fechaHora(d.publicadoEl.slice(0, 10)) : job.period)}
        {dato(<Users size={13} />, 'Postulantes', <span className="tabular-nums">{postulantes}{job.bumeran && incorporados !== postulantes ? ` (${incorporados} cargados)` : ''}</span>)}
        {dato(<Briefcase size={13} />, 'Vacantes', job.vacancies ?? '—')}
        {job.bumeran && dato(<Clock size={13} />, 'Último CSV', timeAgo(job.bumeran.updatedAt))}
        {job.bumeran && dato(<Sparkles size={13} />, 'Ranking e5', job.bumeran.rankingAt ? `listo ${timeAgo(job.bumeran.rankingAt)}` : 'pendiente')}
      </div>

      <div className="conv-obligatorio">
        <ShieldCheck size={14} /><span><strong>Requisito obligatorio:</strong> {job.knockoutRule}</span>
      </div>

      {job.criteria.length > 0 && <section className="conv-seccion">
        <h3>Requisitos que se comparan con cada perfil</h3>
        <ol className="conv-requisitos">
          {job.criteria.map((c, k) => <li key={c.id}><strong>R{k + 1}</strong> {c.label} <span>· {c.weightPct}%</span></li>)}
        </ol>
      </section>}

      {secciones.length > 0 && <section className="conv-seccion">
        <h3><FileText size={14} /> Aviso publicado</h3>
        <div className="conv-aviso">
          {secciones.map((s, i) => (
            <div key={i}>
              {s.titulo && <h4>{s.titulo}</h4>}
              {s.titulo ? <ul>{s.lineas.map((l, j) => <li key={j}>{l}</li>)}</ul> : s.lineas.map((l, j) => <p key={j}>{l}</p>)}
            </div>
          ))}
        </div>
      </section>}
    </section>
  );
}
