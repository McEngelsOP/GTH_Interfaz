import { useEffect, useMemo, useState } from 'react';
import { Plus, Search, X } from 'lucide-react';
import { useApp } from '../../context/AppContext.tsx';
import { supabase } from '../../services/supabase.ts';
import { usePerfil } from '../../services/permisos.ts';
import { agregarEmpresa, listarDiccionario, quitarEmpresa, type EmpresaDiccionario, type Tier } from '../../services/diccionarioEmpresas.ts';
import { Modal } from './Modal.tsx';
import { Button } from './Button.tsx';
import { Input } from './Input.tsx';
import { Select } from './Select.tsx';
import '../../styles/diccionario.css';

/** Diccionario de empresas Tier 1 / Tier 1.5 (Criterios y pesos › Categorización y Ajustes generales): buscar, agregar y
 *  quitar. Edita quien tenga el permiso (todos por defecto; un administrador lo puede quitar en Usuarios y permisos). */
export function DiccionarioEmpresas() {
  const { showToast } = useApp();
  const perfil = usePerfil();
  const puedeEditar = !!supabase && (!perfil || (perfil.activo && perfil.editar_diccionario !== false));
  const [empresas, setEmpresas] = useState<EmpresaDiccionario[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [nombre, setNombre] = useState('');
  const [tier, setTier] = useState<Tier>('Tier 1');
  const [sector, setSector] = useState('');
  const [ocupado, setOcupado] = useState<string | null>(null);

  const cargar = () => {
    if (!supabase) { setCargando(false); setError('Esta instalación no está conectada a Supabase.'); return; }
    setCargando(true);
    listarDiccionario(supabase).then((e) => { setEmpresas(e); setError(''); }, (e: Error) => setError(e.message))
      .finally(() => setCargando(false));
  };
  useEffect(cargar, []);

  const sectores = useMemo(() => [...new Set(empresas.filter((e) => !e.exacto).map((e) => e.sector))].sort((a, b) => a.localeCompare(b, 'es')), [empresas]);
  useEffect(() => { if (!sector && sectores.length) setSector(sectores[0]); }, [sectores, sector]);
  const texto = busqueda.trim().toLowerCase();
  const grupos = useMemo(() => {
    const out = new Map<string, EmpresaDiccionario[]>();
    for (const e of empresas) {
      if (texto && !e.alias.includes(texto) && !e.sector.toLowerCase().includes(texto)) continue;
      const g = `${e.tier} · ${e.sector}`;
      out.set(g, [...(out.get(g) || []), e]);
    }
    return [...out.entries()].sort(([a], [b]) => a.localeCompare(b, 'es'));
  }, [empresas, texto]);

  const agregar = async () => {
    if (!supabase || !puedeEditar) return;
    setOcupado('agregar');
    try {
      const alias = await agregarEmpresa(supabase, nombre, tier, sector);
      showToast(`«${alias}» agregada como ${tier}. Recalcula el puntaje de los avisos donde aparece.`, 'success');
      setNombre(''); cargar();
    } catch (e) { showToast((e as Error).message, 'error'); }
    finally { setOcupado(null); }
  };
  const quitar = async (alias: string) => {
    if (!supabase || !puedeEditar) return;
    setOcupado(alias);
    try {
      await quitarEmpresa(supabase, alias);
      showToast(`«${alias}» quitada del diccionario. Recalcula el puntaje de los avisos donde aparece.`, 'success');
      setEmpresas((e) => e.filter((x) => x.alias !== alias));
    } catch (e) { showToast((e as Error).message, 'error'); }
    finally { setOcupado(null); }
  };

  return (
    <div className="diccionario">
      <p className="diccionario__ayuda">
        Empresas que suman en «Categorización de empresas». Un cambio solo afecta a los avisos donde aparece la empresa.
        {!puedeEditar && supabase && ' Tu cuenta solo puede consultarlo.'}
      </p>
      {puedeEditar && <section className="diccionario__bloque" aria-labelledby="dicc-agregar">
        <h4 id="dicc-agregar"><Plus size={14} /> Agregar empresa</h4>
        <form className="diccionario__alta" onSubmit={(e) => { e.preventDefault(); void agregar(); }}>
          <Input label="Nombre" placeholder="p. ej. Footloose" value={nombre} maxLength={120} onChange={(e) => setNombre(e.target.value)} />
          <Select label="Tier" value={tier} onChange={(e) => setTier(e.target.value as Tier)}
            options={[{ value: 'Tier 1', label: 'Tier 1' }, { value: 'Tier 1.5', label: 'Tier 1.5' }]} />
          <Select label="Sector" value={sector} onChange={(e) => setSector(e.target.value)} options={sectores.map((s) => ({ value: s, label: s }))} />
          <Button type="submit" variant="primary" icon={<Plus size={15} />} disabled={!nombre.trim() || !sector || ocupado === 'agregar'}>Agregar</Button>
        </form>
      </section>}
      <section className="diccionario__bloque" aria-labelledby="dicc-lista">
        <h4 id="dicc-lista"><Search size={14} /> Empresas en el diccionario</h4>
        <Input aria-label="Buscar empresa" placeholder="Buscar empresa o sector" value={busqueda} onChange={(e) => setBusqueda(e.target.value)}
          leftIcon={<Search size={16} />} />
      {error && <p role="alert" className="diccionario__error">{error}</p>}
      {cargando ? <p className="diccionario__vacio">Cargando el diccionario…</p> : (
        <div className="diccionario__lista">
          <p className="diccionario__total">{empresas.length} nombres · {grupos.reduce((n, [, e]) => n + e.length, 0)} mostrados</p>
          {grupos.map(([grupo, lista]) => (
            <section key={grupo} aria-label={grupo}>
              <h4>{grupo} <small>({lista.length})</small></h4>
              <ul>
                {lista.map((e) => (
                  <li key={e.alias} className="conv-chip" title={e.exacto ? 'Solo cuenta si es el nombre completo de la empresa' : undefined}>
                    {e.alias}{e.origen === 'equipo' && <span className="diccionario__nueva"> · agregada</span>}
                    {puedeEditar && <button type="button" className="diccionario__quitar focus-ring" disabled={ocupado === e.alias}
                      aria-label={`Quitar ${e.alias} del diccionario`} onClick={() => void quitar(e.alias)}><X size={12} /></button>}
                  </li>
                ))}
              </ul>
            </section>
          ))}
          {!grupos.length && <p className="diccionario__vacio">Ninguna empresa coincide con la búsqueda.</p>}
        </div>
      )}
      </section>
    </div>
  );
}

export function DiccionarioEmpresasModal({ onClose }: { onClose: () => void }) {
  return (
    <Modal isOpen onClose={onClose} title="Diccionario de empresas" subtitle="Tier 1 y Tier 1.5" maxWidth="760px"
      footer={<Button variant="secondary" onClick={onClose}>Cerrar</Button>}>
      <DiccionarioEmpresas />
    </Modal>
  );
}

