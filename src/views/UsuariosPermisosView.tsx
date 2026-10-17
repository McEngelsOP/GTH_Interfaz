import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle, Copy, KeyRound, Lock, Pencil, RefreshCw, Search, UserCog, UserPlus, UserX, UserCheck } from 'lucide-react';
import { Button } from '../components/common/Button.tsx';
import { Badge } from '../components/common/Badge.tsx';
import { Input } from '../components/common/Input.tsx';
import { Select } from '../components/common/Select.tsx';
import { Modal } from '../components/common/Modal.tsx';
import { Tabs } from '../components/common/Tabs.tsx';
import '../styles/baseCentralizada.css';
import { useApp } from '../context/AppContext.tsx';
import { supabase } from '../services/supabase.ts';
import { fechaHora } from '../services/bumeranSync.ts';
import {
  apiUsuarios, AvisoAdmin, guardarPerfil, listarAvisosAdmin, listarPerfiles, marcarConfidencial, Nivel, Perfil, SECCIONES, usePerfil,
} from '../services/permisos.ts';

const NIVELES = [{ value: 'general', label: 'General (solo lo que se le habilite)' }, { value: 'maestro', label: 'Maestro (ve todo y administra)' }];
const tituloAviso = (a: AvisoAdmin) => a.titulo?.trim() || `Aviso ${a.aviso_id}`;

/** Solo cuentas maestras: cuentas del equipo, sus secciones y avisos, y qué avisos son confidenciales. */
export function UsuariosPermisosView() {
  const yo = usePerfil();
  const { showToast } = useApp();
  const [tab, setTab] = useState<'usuarios' | 'confidenciales'>('usuarios');
  const [perfiles, setPerfiles] = useState<Perfil[]>([]);
  const [ingresos, setIngresos] = useState<Record<string, string | null>>({});
  const [avisos, setAvisos] = useState<AvisoAdmin[]>([]);
  const [confidenciales, setConfidenciales] = useState<Set<string>>(new Set());
  const [estado, setEstado] = useState({ cargando: false, error: '' });
  const [editando, setEditando] = useState<Perfil | null>(null);
  const [creando, setCreando] = useState(false);
  const [clave, setClave] = useState<{ email: string; clave: string } | null>(null);
  const [ocupado, setOcupado] = useState('');
  const [busqueda, setBusqueda] = useState('');

  const cargar = () => {
    if (!supabase) return;
    setEstado({ cargando: true, error: '' });
    Promise.all([listarPerfiles(supabase), listarAvisosAdmin(supabase)]).then(([p, a]) => {
      setPerfiles(p); setAvisos(a.avisos); setConfidenciales(a.confidenciales);
      setEstado({ cargando: false, error: '' });
    }).catch(() => setEstado({ cargando: false, error: 'No se pudieron leer los usuarios y avisos. Reintenta en unos segundos.' }));
    // El último ingreso solo lo da el servidor; si falta su clave, la tabla igual funciona.
    apiUsuarios<{ usuarios: { user_id: string; ultimo_ingreso: string | null }[] }>(supabase, 'listar')
      .then((r) => setIngresos(Object.fromEntries(r.usuarios.map((u) => [u.user_id, u.ultimo_ingreso])))).catch(() => undefined);
  };
  useEffect(cargar, []);

  const accionServidor = async (perfil: Perfil, accion: 'restablecer_clave' | 'activar' | 'desactivar') => {
    if (!supabase) return;
    setOcupado(perfil.user_id);
    try {
      const r = await apiUsuarios<{ clave?: string }>(supabase, accion, { user_id: perfil.user_id });
      if (r.clave) setClave({ email: perfil.email, clave: r.clave });
      else showToast(accion === 'activar' ? `${perfil.email} vuelve a tener acceso.` : `${perfil.email} ya no puede ingresar.`, 'success');
      cargar();
    } catch (e) { showToast((e as Error).message, 'error'); }
    finally { setOcupado(''); }
  };

  const cambiarConfidencial = async (aviso: AvisoAdmin, valor: boolean) => {
    if (!supabase) return;
    setOcupado(aviso.aviso_id);
    try {
      await marcarConfidencial(supabase, aviso.aviso_id, valor);
      setConfidenciales((prev) => { const s = new Set(prev); if (valor) s.add(aviso.aviso_id); else s.delete(aviso.aviso_id); return s; });
      showToast(valor ? `«${tituloAviso(aviso)}» ahora solo lo ven las cuentas maestras.` : `«${tituloAviso(aviso)}» vuelve a ser visible para el equipo.`, 'success');
    } catch (e) { showToast((e as Error).message, 'error'); }
    finally { setOcupado(''); }
  };

  const avisosFiltrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return q ? avisos.filter((a) => `${tituloAviso(a)} ${a.creado_por || ''} ${a.aviso_id}`.toLowerCase().includes(q)) : avisos;
  }, [avisos, busqueda]);

  const resumenSecciones = (p: Perfil) => p.nivel === 'maestro' || p.secciones === null ? 'Todas'
    : p.secciones.length ? SECCIONES.filter((s) => p.secciones!.includes(s.id)).map((s) => s.label).join(', ') : 'Ninguna';
  const resumenAvisos = (p: Perfil) => p.nivel === 'maestro' ? 'Todos, también confidenciales'
    : p.avisos === null ? 'Todos los no confidenciales' : `${p.avisos.length} aviso${p.avisos.length === 1 ? '' : 's'} elegido${p.avisos.length === 1 ? '' : 's'}`;

  return (
    <div style={{ maxWidth: '1440px', margin: '0 auto', width: '100%' }}>
      <div className="conv-cabecera">
        <div className="base-cabecera-intro">
          <div className="base-cabecera-icono" style={{ width: '42px', height: '42px', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--primary-red-subtle)',
            color: 'var(--primary-red)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <UserCog size={22} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--text-primary)' }}>Usuarios y permisos</h1>
            <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
              Solo lo ven las cuentas maestras. Las maestras ven todos los avisos; las demás, solo las secciones y avisos que se les habiliten.
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <Button variant="secondary" icon={<RefreshCw size={15} className={estado.cargando ? 'spin' : ''} />} disabled={estado.cargando} onClick={cargar}>
            {estado.cargando ? 'Cargando…' : 'Actualizar'}
          </Button>
          <Button variant="primary" icon={<UserPlus size={15} />} onClick={() => setCreando(true)}>Nueva cuenta</Button>
        </div>
      </div>

      {estado.error && <div role="alert" className="import-card" style={{ display: 'flex', gap: '.5rem', alignItems: 'center' }}>
        <AlertCircle size={18} style={{ color: 'var(--status-failed-text)' }} /> {estado.error}</div>}

      <div style={{ marginBottom: '1rem' }}>
        <Tabs activeTab={tab} onChange={(id) => setTab(id as typeof tab)} tabs={[
          { id: 'usuarios', label: 'Usuarios', count: perfiles.length },
          { id: 'confidenciales', label: 'Avisos confidenciales', count: confidenciales.size },
        ]} />
      </div>

      {tab === 'usuarios' ? (
        <div style={{ overflowX: 'auto', backgroundColor: 'var(--bg-surface)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', boxShadow: 'var(--shadow-sm)' }}>
          <table className="base-tabla" style={{ minWidth: '900px' }}>
            <thead><tr>{['Usuario', 'Nivel', 'Secciones', 'Avisos', 'Último ingreso', 'Estado', ''].map((h) => <th key={h}>{h}</th>)}</tr></thead>
            <tbody>
              {perfiles.map((p) => (
                <tr key={p.user_id}>
                  <td><strong>{p.nombre || p.email}</strong>{p.nombre && <small>{p.email}</small>}{p.user_id === yo?.user_id && <small>Tu cuenta</small>}</td>
                  <td><Badge variant={p.nivel === 'maestro' ? 'primary' : 'neutral'} size="sm">{p.nivel === 'maestro' ? 'Maestro' : 'General'}</Badge></td>
                  <td style={{ maxWidth: '260px' }}>{resumenSecciones(p)}</td>
                  <td>{resumenAvisos(p)}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>{ingresos[p.user_id] ? fechaHora(ingresos[p.user_id]!) : '—'}</td>
                  <td>
                    {!p.activo ? <Badge variant="danger" size="sm">Desactivada</Badge>
                      : p.debe_cambiar_clave ? <Badge variant="warning" size="sm">Contraseña temporal</Badge>
                      : <Badge variant="success" size="sm">Activa</Badge>}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '.35rem', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                      <Button size="sm" variant="secondary" icon={<Pencil size={14} />} onClick={() => setEditando(p)}>Permisos</Button>
                      <Button size="sm" variant="ghost" icon={<KeyRound size={14} />} disabled={ocupado === p.user_id}
                        onClick={() => accionServidor(p, 'restablecer_clave')} title="Genera una contraseña temporal nueva">Contraseña</Button>
                      {p.user_id !== yo?.user_id && (p.activo
                        ? <Button size="sm" variant="ghost" icon={<UserX size={14} />} disabled={ocupado === p.user_id} onClick={() => accionServidor(p, 'desactivar')}>Desactivar</Button>
                        : <Button size="sm" variant="ghost" icon={<UserCheck size={14} />} disabled={ocupado === p.user_id} onClick={() => accionServidor(p, 'activar')}>Activar</Button>)}
                    </div>
                  </td>
                </tr>
              ))}
              {!perfiles.length && !estado.cargando && <tr><td colSpan={7}>Todavía no hay cuentas.</td></tr>}
            </tbody>
          </table>
        </div>
      ) : (
        <>
          <section className="base-filtros">
            <p style={{ fontSize: '.8125rem', color: 'var(--text-secondary)', marginBottom: '.85rem' }}>
              Un aviso confidencial y sus postulantes solo los ven las cuentas maestras. Para el resto del equipo desaparece de la aplicación.
            </p>
            <div className="base-filtros-busqueda">
              <Input aria-label="Buscar aviso" placeholder="Buscar por título, «Creado por» o número de aviso" value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)} leftIcon={<Search size={16} />} />
            </div>
          </section>
          <div style={{ overflowX: 'auto', backgroundColor: 'var(--bg-surface)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', boxShadow: 'var(--shadow-sm)' }}>
            <table className="base-tabla" style={{ minWidth: '760px' }}>
              <thead><tr>{['Confidencial', 'Aviso', 'Creado por', 'Publicado'].map((h) => <th key={h}>{h}</th>)}</tr></thead>
              <tbody>
                {avisosFiltrados.map((a) => (
                  <tr key={a.aviso_id}>
                    <td>
                      <label className="base-filtros-check">
                        <input type="checkbox" checked={confidenciales.has(a.aviso_id)} disabled={ocupado === a.aviso_id}
                          onChange={(e) => cambiarConfidencial(a, e.target.checked)} aria-label={`Confidencial: ${tituloAviso(a)}`} />
                        {confidenciales.has(a.aviso_id) && <Lock size={14} aria-hidden="true" />}
                      </label>
                    </td>
                    <td><strong>{tituloAviso(a)}</strong><small>Aviso {a.aviso_id}{a.en_ultima_lista === 0 ? ' · ya no figura en Bumeran' : ''}</small></td>
                    <td>{a.creado_por || '—'}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>{a.publicado_el || '—'}</td>
                  </tr>
                ))}
                {!avisosFiltrados.length && !estado.cargando && <tr><td colSpan={4}>No hay avisos que coincidan.</td></tr>}
              </tbody>
            </table>
          </div>
        </>
      )}

      {editando && <EditarPermisos perfil={editando} propio={editando.user_id === yo?.user_id}
        avisos={avisos.filter((a) => !confidenciales.has(a.aviso_id))}
        onCerrar={() => setEditando(null)} onGuardado={() => { setEditando(null); cargar(); }} />}
      {creando && <NuevaCuenta onCerrar={() => setCreando(false)}
        onCreada={(r) => { setCreando(false); setClave(r); cargar(); }} />}
      {clave && <ClaveTemporal {...clave} onCerrar={() => setClave(null)} />}
    </div>
  );
}

function EditarPermisos({ perfil, propio, avisos, onCerrar, onGuardado }: {
  perfil: Perfil; propio: boolean; avisos: AvisoAdmin[]; onCerrar: () => void; onGuardado: () => void;
}) {
  const { showToast } = useApp();
  const [nombre, setNombre] = useState(perfil.nombre);
  const [nivel, setNivel] = useState<Nivel>(perfil.nivel);
  const [secciones, setSecciones] = useState<string[] | null>(perfil.secciones);
  const [elegidos, setElegidos] = useState<string[] | null>(perfil.avisos);
  const [busqueda, setBusqueda] = useState('');
  const [guardando, setGuardando] = useState(false);
  const alternar = (lista: string[], id: string) => lista.includes(id) ? lista.filter((x) => x !== id) : [...lista, id];
  const visibles = avisos.filter((a) => `${tituloAviso(a)} ${a.aviso_id}`.toLowerCase().includes(busqueda.trim().toLowerCase()));

  const guardar = async () => {
    if (!supabase) return;
    setGuardando(true);
    try {
      await guardarPerfil(supabase, perfil.user_id, { nombre: nombre.trim(), ...(propio ? {} : { nivel }), secciones, avisos: elegidos });
      showToast(`Permisos de ${perfil.email} guardados. Se aplican la próxima vez que actualice la página.`, 'success');
      onGuardado();
    } catch (e) { showToast((e as Error).message, 'error'); }
    finally { setGuardando(false); }
  };

  return (
    <Modal isOpen onClose={onCerrar} title="Permisos de la cuenta" subtitle={perfil.email} maxWidth="640px"
      footer={<><Button variant="secondary" onClick={onCerrar}>Cancelar</Button>
        <Button variant="primary" onClick={guardar} disabled={guardando}>{guardando ? 'Guardando…' : 'Guardar'}</Button></>}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <Input label="Nombre" value={nombre} maxLength={120} onChange={(e) => setNombre(e.target.value)} />
        <Select label="Nivel" options={NIVELES} value={nivel} disabled={propio} onChange={(e) => setNivel(e.target.value as Nivel)}
          helperText={propio ? 'No puedes cambiar el nivel de tu propia cuenta.' : undefined} />
        {nivel === 'maestro' ? (
          <p style={{ fontSize: '.8125rem', color: 'var(--text-secondary)' }}>Una cuenta maestra ve todas las secciones y todos los avisos, también los confidenciales, y administra esta página.</p>
        ) : (<>
          <fieldset className="base-filtros-grupo">
            <legend>Secciones del menú</legend>
            <label className="base-filtros-check">
              <input type="checkbox" checked={secciones === null} onChange={(e) => setSecciones(e.target.checked ? null : SECCIONES.map((s) => s.id))} />
              Todas las secciones (también las que se agreguen después)
            </label>
            {secciones !== null && SECCIONES.map((s) => (
              <label key={s.id} className="base-filtros-check" style={{ paddingLeft: '1.5rem' }}>
                <input type="checkbox" checked={secciones.includes(s.id)} onChange={() => setSecciones(alternar(secciones, s.id))} />
                {s.label}
              </label>
            ))}
          </fieldset>
          <fieldset className="base-filtros-grupo">
            <legend>Avisos</legend>
            <label className="base-filtros-check">
              <input type="radio" name="avisos" checked={elegidos === null} onChange={() => setElegidos(null)} />
              Todos los avisos no confidenciales (también los nuevos)
            </label>
            <label className="base-filtros-check">
              <input type="radio" name="avisos" checked={elegidos !== null} onChange={() => setElegidos(perfil.avisos || [])} />
              Solo los avisos elegidos{elegidos !== null ? ` (${elegidos.length})` : ''}
            </label>
            {elegidos !== null && <>
              <Input aria-label="Buscar aviso" placeholder="Buscar aviso" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} leftIcon={<Search size={16} />} />
              <div style={{ maxHeight: '240px', overflowY: 'auto', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '.75rem', display: 'flex', flexDirection: 'column', gap: '.6rem' }}>
                {visibles.map((a) => (
                  <label key={a.aviso_id} className="base-filtros-check">
                    <input type="checkbox" checked={elegidos.includes(a.aviso_id)} onChange={() => setElegidos(alternar(elegidos, a.aviso_id))} />
                    {tituloAviso(a)}
                  </label>
                ))}
                {!visibles.length && <span style={{ fontSize: '.8125rem', color: 'var(--text-secondary)' }}>No hay avisos que coincidan.</span>}
              </div>
            </>}
            <p style={{ fontSize: '.75rem', color: 'var(--text-muted)' }}>Los avisos confidenciales no aparecen aquí: solo los ven las cuentas maestras.</p>
          </fieldset>
        </>)}
      </div>
    </Modal>
  );
}

function NuevaCuenta({ onCerrar, onCreada }: { onCerrar: () => void; onCreada: (r: { email: string; clave: string }) => void }) {
  const [email, setEmail] = useState('');
  const [nombre, setNombre] = useState('');
  const [nivel, setNivel] = useState<Nivel>('general');
  const [error, setError] = useState('');
  const [creando, setCreando] = useState(false);

  const crear = async (event?: React.FormEvent) => {
    event?.preventDefault();
    if (!supabase) return;
    setCreando(true); setError('');
    try {
      const r = await apiUsuarios<{ email: string; clave: string }>(supabase, 'crear', { email, nombre, nivel });
      onCreada(r);
    } catch (e) { setError((e as Error).message); }
    finally { setCreando(false); }
  };

  return (
    <Modal isOpen onClose={onCerrar} title="Nueva cuenta" subtitle="Se crea con una contraseña temporal que la persona cambia al ingresar."
      footer={<><Button variant="secondary" onClick={onCerrar}>Cancelar</Button>
        <Button variant="primary" icon={<UserPlus size={15} />} onClick={() => crear()} disabled={creando || !email.trim()}>{creando ? 'Creando…' : 'Crear cuenta'}</Button></>}>
      <form onSubmit={crear} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <Input label="Correo" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        <Input label="Nombre" value={nombre} maxLength={120} onChange={(e) => setNombre(e.target.value)} />
        <Select label="Nivel" options={NIVELES} value={nivel} onChange={(e) => setNivel(e.target.value as Nivel)}
          helperText={nivel === 'general' ? 'Empieza con todas las secciones y los avisos no confidenciales; puedes limitarlo después en «Permisos».' : undefined} />
        {error && <p role="alert" style={{ fontSize: '0.8125rem', color: '#DC2626', fontWeight: 500 }}>{error}</p>}
      </form>
    </Modal>
  );
}

function ClaveTemporal({ email, clave, onCerrar }: { email: string; clave: string; onCerrar: () => void }) {
  const { showToast } = useApp();
  const copiar = () => navigator.clipboard.writeText(`Correo: ${email}\nContraseña temporal: ${clave}`)
    .then(() => showToast('Datos de ingreso copiados.', 'success')).catch(() => showToast('No se pudo copiar; cópiala a mano.', 'warning'));
  return (
    <Modal isOpen onClose={onCerrar} title="Contraseña temporal" subtitle={email}
      footer={<><Button variant="secondary" icon={<Copy size={15} />} onClick={copiar}>Copiar</Button><Button variant="primary" onClick={onCerrar}>Listo</Button></>}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '.85rem' }}>
        <code style={{ fontSize: '1.25rem', fontWeight: 700, letterSpacing: '.05em', padding: '.85rem 1rem', textAlign: 'center',
          backgroundColor: 'var(--bg-base)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', color: 'var(--text-primary)' }}>{clave}</code>
        <p style={{ fontSize: '.8125rem', color: 'var(--text-secondary)' }}>
          Entrégasela a la persona por un medio privado. Solo se muestra esta vez; al ingresar, la aplicación le pedirá una contraseña nueva.
        </p>
      </div>
    </Modal>
  );
}
