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
import { LoginView } from './views/LoginView.tsx';
import { ActualizacionDatosView } from './views/ActualizacionDatosView.tsx';
import { BaseCentralizadaView } from './views/BaseCentralizadaView.tsx';
import { cargarEstado } from './services/persistence.ts';
import type { AppStateData } from './types/index.ts';

// Vistas del sistema GTH ESAN
import { AgregarArchivosView } from './views/AgregarArchivosView.tsx';
import { MejoresCandidatosView } from './views/MejoresCandidatosView.tsx';
import { ComparadorView } from './views/ComparadorView.tsx';
import { AvanceCandidatosView } from './views/AvanceCandidatosView.tsx';

function MainContent({ sync }: { sync: ReturnType<typeof useBumeranSync> }) {
  const { currentView, activeJob } = useApp();

  const renderView = () => {
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

// Con Supabase configurado se exige sesión (datos personales de postulantes); sin él, la app abre como siempre.
function AuthGate({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<'cargando' | 'sin_sesion' | 'activa'>(supabase ? 'cargando' : 'activa');
  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => setSession(data.session ? 'activa' : 'sin_sesion')).catch(() => setSession('sin_sesion'));
    const { data } = supabase.auth.onAuthStateChange((_event, current) => setSession(current ? 'activa' : 'sin_sesion'));
    return () => data.subscription.unsubscribe();
  }, []);
  if (session === 'cargando') return <div role="status" className="session-loading">Verificando sesión…</div>;
  return session === 'activa' ? <>{children}</> : <LoginView />;
}

// El estado se lee de IndexedDB (asíncrono) antes de montar la aplicación.
function CargadorEstado({ children }: { children: (estado: AppStateData) => ReactNode }) {
  const [estado, setEstado] = useState<AppStateData | null>(null);
  useEffect(() => { cargarEstado().then(setEstado); }, []);
  if (!estado) return <div role="status" className="session-loading">Cargando datos…</div>;
  return <>{children(estado)}</>;
}

export default function App() {
  return (
    <AuthGate>
      <CargadorEstado>
        {(estado) => (
          <AppProvider initialState={estado}>
            <AppLayout />
          </AppProvider>
        )}
      </CargadorEstado>
    </AuthGate>
  );
}

