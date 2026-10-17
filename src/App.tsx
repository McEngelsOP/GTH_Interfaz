import React, { ReactNode, useEffect, useState } from 'react';
import { AppProvider, useApp } from './context/AppContext.tsx';
import { Header } from './components/layout/Header.tsx';
import { Sidebar } from './components/layout/Sidebar.tsx';
import { ToastContainer } from './components/layout/ToastContainer.tsx';
import { CandidateDrawer } from './components/candidate/CandidateDrawer.tsx';
import { GTHAssistantDrawer } from './components/assistant/GTHAssistantDrawer.tsx';
import { supabase } from './services/supabase.ts';
import { useBumeranSync } from './services/useBumeranSync.ts';
import { ConvocatoriasView } from './views/ConvocatoriasView.tsx';
import { NuevaConvocatoriaView } from './views/NuevaConvocatoriaView.tsx';
import { CambiarClaveView, LoginView, SinAccesoView } from './views/LoginView.tsx';
import { UsuariosPermisosView } from './views/UsuariosPermisosView.tsx';
import { fetchMiPerfil, Perfil, PerfilContext, puedeVerSeccion, SECCIONES, usePerfil, VISTA_ADMIN } from './services/permisos.ts';
import { ActualizacionDatosView } from './views/ActualizacionDatosView.tsx';
import { BaseCentralizadaView } from './views/BaseCentralizadaView.tsx';
import { cargarEstado } from './services/persistence.ts';
import type { AppStateData } from './types/index.ts';

// Vistas del sistema GTH ESAN
import { AgregarArchivosView } from './views/AgregarArchivosView.tsx';
import { MejoresCandidatosView } from './views/MejoresCandidatosView.tsx';
import { ComparadorView } from './views/ComparadorView.tsx';
import { AvanceCandidatosView } from './views/AvanceCandidatosView.tsx';

// Sección fuera de los permisos (p. ej. un enlace guardado): se pasa a la primera permitida.
function SinSeccion() {
  const { setCurrentView } = useApp();
  const perfil = usePerfil();
  const primera = SECCIONES.find((s) => puedeVerSeccion(perfil, s.id));
  useEffect(() => { if (primera) setCurrentView(primera.id); }, [primera?.id]);
  return primera ? null : (
    <p role="status" className="import-card">Tu cuenta todavía no tiene secciones habilitadas. Pide acceso a una cuenta maestra del Equipo de GTHC.</p>
  );
}

function MainContent({ sync }: { sync: ReturnType<typeof useBumeranSync> }) {
  const { currentView, activeJob } = useApp();
  const perfil = usePerfil();

  const renderView = () => {
    if (!puedeVerSeccion(perfil, currentView)) return <SinSeccion />;
    if (currentView === VISTA_ADMIN) return <UsuariosPermisosView />;
    if (currentView === 'actualizacion_datos') return <ActualizacionDatosView sync={sync} />;
    if (currentView === 'base_centralizada') return <BaseCentralizadaView />;
    if (!activeJob && currentView !== 'nueva_convocatoria' && currentView !== 'nueva-convocatoria') return <ConvocatoriasView />;
    switch (currentView) {
      case 'convocatorias': return <ConvocatoriasView />;
      case 'nueva_convocatoria':
      case 'nueva-convocatoria': return <NuevaConvocatoriaView />;
      case 'agregar_archivos':
      case 'agregar-archivos':
        return <AgregarArchivosView />;
      case 'comparador':
        return <ComparadorView />;
      case 'avance_candidatos':
      case 'avance-candidatos':
        return <AvanceCandidatosView />;
      default:
        return <MejoresCandidatosView />;
    }
  };

  return (
    <main
      style={{
        flex: 1,
        padding: '1.5rem',
        overflowY: 'auto',
        backgroundColor: 'var(--bg-base)',
        minHeight: 'calc(100vh - 64px)',
      }}
    >
      {renderView()}
    </main>
  );
}

function AppLayout() {
  const { selectedCandidateForDrawer } = useApp();
  const sync = useBumeranSync();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div style={{ display: 'flex', minHeight: '100vh', width: '100%', overflowX: 'hidden' }}>
      <Sidebar sync={sync} isMobileOpen={mobileNavOpen} onCloseMobile={() => setMobileNavOpen(false)} />
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0, height: '100vh', overflow: 'hidden' }}>
        <Header onToggleMobileNav={() => setMobileNavOpen((prev) => !prev)} />
        <MainContent sync={sync} />
      </div>
      <CandidateDrawer key={selectedCandidateForDrawer?.id || 'closed'} />
      <GTHAssistantDrawer />
      <ToastContainer />
    </div>
  );
}

// Con Supabase configurado se exige sesión (datos personales de postulantes) y un perfil activo de GTH; sin él, la app
// abre como siempre. Con contraseña temporal, primero se pide una nueva.
type Acceso = { estado: 'cargando' | 'sin_sesion' | 'sin_perfil' | 'error' } | { estado: 'activa'; usuario: string; perfil: Perfil | null };

function AuthGate({ children }: { children: (usuario: string | undefined, perfil: Perfil | null) => ReactNode }) {
  const [acceso, setAcceso] = useState<Acceso>(supabase ? { estado: 'cargando' } : { estado: 'activa', usuario: '', perfil: null });
  const [revision, setRevision] = useState(0);
  const [usuario, setUsuario] = useState<string | null | undefined>(undefined);
  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => setUsuario(data.session?.user.id ?? null)).catch(() => setUsuario(null));
    const { data } = supabase.auth.onAuthStateChange((_event, current) => setUsuario(current?.user.id ?? null));
    return () => data.subscription.unsubscribe();
  }, []);
  useEffect(() => {
    if (!supabase || usuario === undefined) return;
    if (usuario === null) { setAcceso({ estado: 'sin_sesion' }); return; }
    let vivo = true;
    fetchMiPerfil(supabase, usuario)
      .then((perfil) => vivo && setAcceso(perfil?.activo ? { estado: 'activa', usuario, perfil } : { estado: 'sin_perfil' }))
      .catch(() => vivo && setAcceso({ estado: 'error' }));
    return () => { vivo = false; };
  }, [usuario, revision]);

  if (acceso.estado === 'cargando') return <div role="status" className="session-loading">Verificando sesión…</div>;
  if (acceso.estado === 'sin_sesion') return <LoginView />;
  if (acceso.estado !== 'activa') return <SinAccesoView error={acceso.estado === 'error'} onReintentar={() => setRevision((r) => r + 1)} />;
  if (acceso.perfil?.debe_cambiar_clave) return <CambiarClaveView onListo={() => setRevision((r) => r + 1)} />;
  return <PerfilContext.Provider value={acceso.perfil}>{children(acceso.usuario || undefined, acceso.perfil)}</PerfilContext.Provider>;
}

// El estado se lee de IndexedDB (asíncrono) antes de montar la aplicación; cada usuario tiene su propia copia.
function CargadorEstado({ usuario, children }: { usuario?: string; children: (estado: AppStateData) => ReactNode }) {
  const [estado, setEstado] = useState<AppStateData | null>(null);
  useEffect(() => { cargarEstado(usuario).then(setEstado); }, [usuario]);
  if (!estado) return <div role="status" className="session-loading">Cargando datos…</div>;
  return <>{children(estado)}</>;
}

export default function App() {
  return (
    <AuthGate>
      {(usuario) => (
        <CargadorEstado key={usuario || 'local'} usuario={usuario}>
          {(estado) => (
            <AppProvider initialState={estado}>
              <AppLayout />
            </AppProvider>
          )}
        </CargadorEstado>
      )}
    </AuthGate>
  );
}

