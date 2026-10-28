import React, { useEffect, useRef, useState } from 'react';
import { AlertCircle, ChevronLeft, ChevronRight, Database, FileSpreadsheet, FileUser, MessageSquare, RefreshCw, Search, Users, SlidersHorizontal, ChevronDown, X } from 'lucide-react';
import { Input } from '../components/common/Input.tsx';
import { Select } from '../components/common/Select.tsx';
import '../styles/baseCentralizada.css';
import { Button } from '../components/common/Button.tsx';
import { VisorCV } from '../components/candidate/VisorCV.tsx';
import { Modal } from '../components/common/Modal.tsx';
import { IconoBandera, NOMBRE_BANDERA } from '../components/modals/InternalCommentModal.tsx';
import { supabase } from '../services/supabase.ts';
import { fechaHora } from '../services/bumeranSync.ts';
import {
  comentariosDePersonas, ComentarioBase, fetchBasePagina, fetchBaseExportacion, FiltrosBase, NIVELES_IDIOMA, ORDEN_NIVEL, Persona, SIN_FILTROS, OpcionesBase, ResumenBase,
} from '../services/baseCentralizada.ts';

const POR_PAGINA = 50;
const OPCIONES_VACIAS: OpcionesBase = { avisos: [], areas: [], ciudades: [], idiomas: [] };

/** Todos los postulantes de todos los avisos, sin score (no se comparan contra un aviso), con filtros. */
export function BaseCentralizadaView() {
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [estado, setEstado] = useState<{ cargando: boolean; error: string; leidoEn: string | null }>({ cargando: false, error: '', leidoEn: null });
  const [filtros, setFiltros] = useState<FiltrosBase>(SIN_FILTROS);
  const [pagina, setPagina] = useState(1);
  const [cvDe, setCvDe] = useState<Persona | null>(null);
  const [filtrosAbiertos, setFiltrosAbiertos] = useState(false);
  const [exportando, setExportando] = useState(false);

  const [revision, setRevision] = useState(0);
  const [total, setTotal] = useState(0);
  const [resumen, setResumen] = useState<ResumenBase>({ personas: 0, postulaciones: 0, recurrentes: 0 });
  const [opciones, setOpciones] = useState<OpcionesBase>(OPCIONES_VACIAS);
  const [errorExportacion, setErrorExportacion] = useState('');
  const compatibilidad = useRef<Persona[] | undefined>(undefined);
  const tieneResumen = useRef(false);
  useEffect(() => {
    const client = supabase;
    if (!client) return;
    const controller = new AbortController();
    setPersonas([]);
    setEstado((e) => ({ ...e, cargando: true, error: '' }));
    const timer = window.setTimeout(() => {
      fetchBasePagina(client, filtros, pagina, POR_PAGINA, !tieneResumen.current, controller.signal, compatibilidad.current)
        .then((result) => {
          if (controller.signal.aborted) return;
          compatibilidad.current = result.compatibilidad;
          setPersonas(result.personas);
          setTotal(result.total);
          if (result.resumen) { setResumen(result.resumen); tieneResumen.current = true; }
          if (result.opciones) setOpciones(result.opciones);
          setEstado({ cargando: false, error: '', leidoEn: new Date().toISOString() });
          const ultima = Math.max(1, Math.ceil(result.total / POR_PAGINA));
          if (pagina > ultima) setPagina(ultima);
        }).catch((error: Error) => {
          if (!controller.signal.aborted) { setTotal(0); setEstado((e) => ({ ...e, cargando: false, error: error.message })); }
        });
    }, 180);
    return () => { controller.abort(); window.clearTimeout(timer); };
  }, [filtros, pagina, revision]);

  const cargar = () => { compatibilidad.current = undefined; tieneResumen.current = false; setRevision((r) => r + 1); };
  const poner = (cambio: Partial<FiltrosBase>) => { setFiltros((f) => ({ ...f, ...cambio })); setPagina(1); };
  const totalPaginas = Math.max(1, Math.ceil(total / POR_PAGINA));
  const visibles = personas;
  // Comentarios internos de las personas de la página (con su bandera), para la columna «Comentarios»
  const [comentarios, setComentarios] = useState<Map<string, ComentarioBase[]>>(new Map());
  const [comentariosDe, setComentariosDe] = useState<Persona | null>(null);
  useEffect(() => {
    if (!supabase || !personas.length) { setComentarios(new Map()); return; }
    let vigente = true;
    comentariosDePersonas(supabase, personas.map((p) => p.id))
      .then((m) => { if (vigente) setComentarios(m); }, () => { if (vigente) setComentarios(new Map()); });
    return () => { vigente = false; };
  }, [personas]);
  const { avisos, areas, ciudades, idiomas } = opciones;
  const postulaciones = resumen.postulaciones;
  const hayFiltros = JSON.stringify(filtros) !== JSON.stringify(SIN_FILTROS);

  const exportar = async () => {
    if (!supabase) return;
    setExportando(true);
    setErrorExportacion('');
    try {
      const filtradas = await fetchBaseExportacion(supabase, filtros, compatibilidad.current);
      const { default: writeExcelFile } = await import('write-excel-file/browser');
      const enc = (value: string) => ({ value, fontWeight: 'bold' as const, backgroundColor: '#F3F4F6' });
      const data = [
        ['Nombre', 'Correo', 'Teléfono', 'Ciudad', 'Puesto actual', 'Empresa', 'Estudios', 'Nivel', 'Estado', 'Institución', 'Idiomas',
          'Avisos a los que postuló', 'Última postulación', 'CV personal'].map(enc),
        ...filtradas.map((p) => [p.nombre, p.email || '', p.telefono || '', p.ciudad || '', p.puesto || '', p.empresa || '', p.estudio || '',
          p.nivelEstudio || '', p.estadoEstudio || '', p.institucion || '', p.idiomas.map((i) => `${i.idioma} ${i.nivel}`.trim()).join(', '),
          p.avisos.map((a) => a.titulo).join(' | '), p.ultimaPostulacion || '', p.cv.enlace || (p.cv.estado === 'sin_adjunto' ? 'No adjuntó' : '')]),
      ];
      await writeExcelFile(data as any, { columns: [30, 30, 14, 20, 28, 24, 30, 16, 12, 28, 26, 50, 14, 40].map((width) => ({ width })) })
        .toFile(`Base_centralizada_${new Date().toISOString().slice(0, 10)}.xlsx`);
    } catch {
      setErrorExportacion('No se pudo preparar el Excel. Vuelve a intentarlo.');
    } finally {
      setExportando(false);
    }
  };

  const sel = (label: string, value: string, onChange: (v: string) => void, items: [string, string][], todos: string) => (
    <Select label={label} value={value} onChange={(event) => onChange(event.target.value)}
      options={[{ value: '', label: todos }, ...items.map(([value, label]) => ({ value, label }))]} />
  );
  const activos = [
    { key: 'area', label: 'Área', value: filtros.area },
    { key: 'aviso', label: 'Aviso', value: avisos.find(([id]) => id === filtros.aviso)?.[1] || filtros.aviso },
    { key: 'nivel', label: 'Estudios', value: filtros.nivel ? `${filtros.nivel} o superior` : '' },
    { key: 'estado', label: 'Estado', value: filtros.estado },
    { key: 'ciudad', label: 'Ciudad', value: filtros.ciudad },
    { key: 'idioma', label: 'Idioma', value: filtros.idioma },
    { key: 'nivelIdioma', label: 'Nivel de idioma', value: filtros.nivelIdioma },
    { key: 'cv', label: 'CV', value: filtros.cv === 'con' ? 'Con CV personal' : filtros.cv === 'sin' ? 'Sin CV personal' : '' },
    { key: 'desde', label: 'Desde', value: filtros.desde },
    { key: 'varios', label: 'Postulaciones', value: filtros.varios ? 'Varios avisos' : '' },
  ].filter((filter) => Boolean(filter.value));
  const quitarFiltro = (key: keyof FiltrosBase) => poner(key === 'idioma' ? { idioma: '', nivelIdioma: '' } : { [key]: SIN_FILTROS[key] });

  return (
    <div style={{ maxWidth: '1440px', margin: '0 auto', width: '100%' }}>
      <div className="conv-cabecera">
        <div className="base-cabecera-intro">
          <div className="base-cabecera-icono" style={{ width: '42px', height: '42px', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--primary-red-subtle)',
            color: 'var(--primary-red)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Database size={22} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--text-primary)' }}>Base centralizada</h1>
            <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
              Todos los postulantes de todos los avisos de Bumeran, sin puntaje: aquí no se comparan contra un aviso.
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <Button variant="secondary" icon={<RefreshCw size={15} className={estado.cargando ? 'spin' : ''} />} disabled={estado.cargando || !supabase} onClick={cargar}>
            {estado.cargando ? 'Cargando…' : 'Actualizar'}
          </Button>
          <Button variant="primary" icon={<FileSpreadsheet size={15} />} disabled={!total || exportando || estado.cargando || Boolean(estado.error)} onClick={exportar}>
            {exportando ? 'Preparando Excel…' : `Exportar a Excel (${total})`}
          </Button>
        </div>
      </div>

      {!supabase && <p role="status" className="import-card">Esta instalación no está conectada a Supabase.</p>}
      {estado.error && <div role="alert" className="import-card" style={{ display: 'flex', gap: '.5rem', alignItems: 'center' }}>
        <AlertCircle size={18} style={{ color: 'var(--status-failed-text)' }} /> {estado.error}</div>}

      {errorExportacion && <p role="alert" style={{ color: 'var(--status-failed-text)' }}>{errorExportacion}</p>}

      {/* Resumen */}
      <div className="base-resumen">
        <span><Users size={15} /> <strong className="tabular-nums">{resumen.personas.toLocaleString('es-PE')}</strong> personas</span>
        <span><strong className="tabular-nums">{postulaciones.toLocaleString('es-PE')}</strong> postulaciones en {avisos.length} avisos</span>
        <span><strong className="tabular-nums">{resumen.recurrentes.toLocaleString('es-PE')}</strong> postularon a más de un aviso</span>
        {estado.leidoEn && <span style={{ marginLeft: 'auto', color: 'var(--text-muted)' }}>Leído {fechaHora(estado.leidoEn)}</span>}
      </div>

      {/* Búsqueda siempre visible; filtros desplegables, sin comprimir sus campos. */}
      <section className="base-filtros" aria-label="Búsqueda y filtros de postulantes">
        <div className="base-filtros-barra">
          <div className="base-filtros-busqueda">
            <Input type="search" label="Buscar postulantes" placeholder="Nombre, puesto, empresa o estudios"
              value={filtros.texto} onChange={(event) => poner({ texto: event.target.value })} leftIcon={<Search size={16} />} />
          </div>
          <div className="base-filtros-acciones">
            <Button variant={filtrosAbiertos ? 'outline' : 'secondary'} icon={<SlidersHorizontal size={16} />}
              aria-expanded={filtrosAbiertos} aria-controls="base-filtros-avanzados" onClick={() => setFiltrosAbiertos((open) => !open)}>
              Filtros{activos.length > 0 ? ` (${activos.length})` : ''}<ChevronDown size={14} style={{ transform: filtrosAbiertos ? 'rotate(180deg)' : undefined }} />
            </Button>
            {hayFiltros && <Button variant="ghost" onClick={() => poner(SIN_FILTROS)}>Limpiar filtros</Button>}
          </div>
        </div>
        {filtrosAbiertos && <div id="base-filtros-avanzados" className="base-filtros-panel">
          <p>Elige los criterios que necesitas. Los resultados se actualizan al cambiar cada filtro.</p>
          <div className="base-filtros-grupos">
            <fieldset className="base-filtros-grupo">
              <legend>Convocatoria y postulación</legend>
              {sel('Área del aviso', filtros.area, (v) => poner({ area: v }), areas.map((a) => [a, a]), 'Todas las áreas')}
              {sel('Aviso', filtros.aviso, (v) => poner({ aviso: v }), avisos, 'Todos los avisos')}
              <Input type="date" label="Postuló desde" value={filtros.desde} onChange={(event) => poner({ desde: event.target.value })} />
              <label className="base-filtros-check"><input type="checkbox" className="focus-ring" checked={filtros.varios} onChange={(event) => poner({ varios: event.target.checked })} />Postuló a varios avisos</label>
            </fieldset>
            <fieldset className="base-filtros-grupo">
              <legend>Estudios y ubicación</legend>
              {sel('Nivel de estudios', filtros.nivel, (v) => poner({ nivel: v }), ORDEN_NIVEL.slice(0, 6).map((n) => [n, `${n} o superior`]), 'Cualquier nivel de estudios')}
              {sel('Estado de estudios', filtros.estado, (v) => poner({ estado: v }), [['Graduado', 'Graduado'], ['En Curso', 'En curso'], ['Abandonado', 'Abandonado']], 'Graduado o en curso')}
              {sel('Ciudad o distrito', filtros.ciudad, (v) => poner({ ciudad: v }), ciudades.map((c) => [c, c]), 'Todas las ciudades')}
            </fieldset>
            <fieldset className="base-filtros-grupo">
              <legend>Idiomas y documentación</legend>
              {sel('Idioma', filtros.idioma, (v) => poner({ idioma: v, nivelIdioma: v ? filtros.nivelIdioma : '' }), idiomas.map((i) => [i, i]), 'Cualquier idioma')}
              {filtros.idioma && sel('Nivel de idioma', filtros.nivelIdioma, (v) => poner({ nivelIdioma: v }), NIVELES_IDIOMA.map((n) => [n, `${n} o más`]), 'Cualquier nivel')}
              {sel('CV personal', filtros.cv, (v) => poner({ cv: v }), [['con', 'Con CV personal'], ['sin', 'Sin CV personal']], 'Con y sin CV')}
            </fieldset>
          </div>
        </div>}
        {activos.length > 0 && <div className="base-filtros-seleccion" aria-label="Filtros aplicados">
          {activos.map((filter) => <Button key={filter.key} variant="ghost" size="sm" onClick={() => quitarFiltro(filter.key as keyof FiltrosBase)}
            aria-label={`Quitar filtro ${filter.label}: ${filter.value}`} title={`Quitar filtro ${filter.label}`}>
            {filter.label}: {filter.value}<X size={13} />
          </Button>)}
        </div>}
        <p className="base-filtros-resultado" role="status">
          {estado.cargando ? 'Cargando resultados…' : <>Mostrando <strong>{total.toLocaleString('es-PE')}</strong> de {resumen.personas.toLocaleString('es-PE')} personas</>}
        </p>
      </section>

      {/* Tabla */}
      <div style={{ overflowX: 'auto', backgroundColor: 'var(--bg-surface)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', boxShadow: 'var(--shadow-sm)' }}>
        <table className="base-tabla" aria-label="Postulantes de la base centralizada" aria-busy={estado.cargando}>
          <thead>
            <tr>{['Postulante', 'Experiencia reciente', 'Estudios', 'Idiomas', 'Ciudad', 'Avisos a los que postuló', 'Última postulación', 'Comentarios', ''].map((h) => <th key={h}>{h}</th>)}</tr>
          </thead>
          <tbody>
            {visibles.map((p) => (
              <tr key={p.id}>
                <td>
                  <strong style={{ color: 'var(--text-primary)' }}>{p.nombre}</strong>
                  <small>{[p.email, p.telefono].filter(Boolean).join(' · ')}</small>
                </td>
                <td>{p.puesto || '—'}<small>{[p.empresa, p.areaExperiencia].filter(Boolean).join(' · ')}</small></td>
                <td>{p.estudio || '—'}<small>{[p.nivelEstudio, p.estadoEstudio, p.institucion].filter(Boolean).join(' · ')}</small></td>
                <td>{p.idiomas.length ? p.idiomas.map((i) => `${i.idioma}${i.nivel ? ` (${i.nivel})` : ''}`).join(', ') : '—'}</td>
                <td>{p.ciudad || '—'}</td>
                <td>
                  <div className="conv-fila-chips" style={{ marginTop: 0 }}>
                    {p.avisos.slice(0, 2).map((a) => <span key={a.id} className="conv-chip" title={a.area || undefined}>{a.titulo}</span>)}
                    {p.avisos.length > 2 && <span className="conv-chip" title={p.avisos.slice(2).map((a) => a.titulo).join('\n')}>+{p.avisos.length - 2}</span>}
                  </div>
                </td>
                <td style={{ whiteSpace: 'nowrap' }}>{p.ultimaPostulacion ? fechaHora(p.ultimaPostulacion) : '—'}</td>
                <td style={{ whiteSpace: 'nowrap' }}>
                  {(comentarios.get(p.id) || []).length
                    ? <Button variant="ghost" size="sm" icon={<MessageSquare size={14} />} onClick={() => setComentariosDe(p)}
                        title="Ver los comentarios internos de esta persona en todos sus avisos">
                        Ver comentarios ({comentarios.get(p.id)!.length}) <IconoBandera bandera={comentarios.get(p.id)!.find((c) => c.bandera)?.bandera} />
                      </Button>
                    : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                </td>
                <td style={{ textAlign: 'right', whiteSpace: 'nowrap', width: '1%' }}>
                  <Button variant="ghost" size="sm" icon={<FileUser size={14} />} onClick={() => setCvDe(p)}
                    style={p.cv.estado === 'disponible' ? undefined : { color: 'var(--text-muted)' }}
                    title={p.cv.estado === 'disponible' ? 'Ver el CV personal' : p.cv.estado === 'sin_adjunto' ? 'No adjuntó CV personal' : 'CV personal aún no disponible'}>
                    Ver CV
                  </Button>
                </td>
              </tr>
            ))}
            {!visibles.length && <tr><td colSpan={9} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
              {estado.cargando ? 'Cargando la base de postulantes…' : estado.error ? 'No se pudieron cargar los resultados. Usa Actualizar para reintentar.' : resumen.personas ? 'Ningún postulante coincide con los filtros.' : 'Todavía no hay postulantes.'}
            </td></tr>}
          </tbody>
        </table>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '.5rem', padding: '.75rem 0', fontSize: '.84rem', color: 'var(--text-secondary)' }}>
        <span>Página <strong className="tabular-nums">{Math.min(pagina, totalPaginas)}</strong> de <strong className="tabular-nums">{totalPaginas}</strong></span>
        <Button variant="secondary" size="sm" icon={<ChevronLeft size={16} />} disabled={pagina <= 1 || estado.cargando} onClick={() => setPagina((x) => Math.max(1, x - 1))} title="Página anterior" />
        <Button variant="secondary" size="sm" icon={<ChevronRight size={16} />} disabled={pagina >= totalPaginas || estado.cargando} onClick={() => setPagina((x) => Math.min(totalPaginas, x + 1))} title="Página siguiente" />
      </div>

      <VisorCV nombre={cvDe?.nombre || null} cv={cvDe?.cv || null} onClose={() => setCvDe(null)} />
      {comentariosDe && <Modal isOpen onClose={() => setComentariosDe(null)} title="Comentarios internos" subtitle={comentariosDe.nombre} maxWidth="560px"
        footer={<Button variant="ghost" onClick={() => setComentariosDe(null)}>Cerrar</Button>}>
        <ul className="base-comentarios">
          {(comentarios.get(comentariosDe.id) || []).map((c) => (
            <li key={c.avisoId}>
              <div className="base-comentarios__cabecera">
                <strong>{comentariosDe.avisos.find((a) => a.id === c.avisoId)?.titulo || c.avisoId}</strong>
                <small>{fechaHora(c.at)}</small>
              </div>
              {c.bandera && <p className="comentario-bandera-texto"><IconoBandera bandera={c.bandera} /> {NOMBRE_BANDERA[c.bandera]}</p>}
              {c.texto && <p style={{ whiteSpace: 'pre-wrap', fontSize: '.875rem', lineHeight: 1.5, color: 'var(--text-primary)', overflowWrap: 'anywhere' }}>{c.texto}</p>}
            </li>
          ))}
        </ul>
      </Modal>}
    </div>
  );
}
