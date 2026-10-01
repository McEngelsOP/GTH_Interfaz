import React, { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext.tsx';
import { Header } from './components/layout/Header.tsx';
import { Sidebar } from './components/layout/Sidebar.tsx';
import { ToastContainer } from './components/layout/ToastContainer.tsx';
import { CandidateDrawer } from './components/candidate/CandidateDrawer.tsx';
import { GTHAssistantDrawer } from './components/assistant/GTHAssistantDrawer.tsx';

// Vistas del sistema GTH ESAN
import { ResumenGeneralView } from './views/ResumenGeneralView.tsx';
import { ConvocatoriasView } from './views/ConvocatoriasView.tsx';
import { PerfilesPuestosView } from './views/PerfilesPuestosView.tsx';
import { NuevaConvocatoriaView } from './views/NuevaConvocatoriaView.tsx';
import { AgregarArchivosView } from './views/AgregarArchivosView.tsx';
import { MejoresCandidatosView } from './views/MejoresCandidatosView.tsx';
import { ComparadorView } from './views/ComparadorView.tsx';
import { AvanceCandidatosView } from './views/AvanceCandidatosView.tsx';
import { BancoTalentoView } from './views/BancoTalentoView.tsx';
import { CriteriosEvaluacionView } from './views/CriteriosEvaluacionView.tsx';
import { HistorialDecisionesView } from './views/HistorialDecisionesView.tsx';
import { ResultadosProcesoView } from './views/ResultadosProcesoView.tsx';
import { AjustesGeneralesView } from './views/AjustesGeneralesView.tsx';

function MainContent() {
  const { currentView } = useApp();

  const renderView = () => {
    switch (currentView) {
      case 'resumen_general':
      case 'resumen-general':
        return <ResumenGeneralView />;
      case 'convocatorias':
        return <ConvocatoriasView />;
      case 'perfiles_puestos':
      case 'perfiles-puestos':
        return <PerfilesPuestosView />;
      case 'nueva_convocatoria':
      case 'nueva-convocatoria':
        return <NuevaConvocatoriaView />;
      case 'agregar_archivos':
      case 'agregar-archivos':
        return <AgregarArchivosView />;
      case 'mejores_candidatos':
      case 'mejores-candidatos':
        return <MejoresCandidatosView />;
      case 'comparador':
        return <ComparadorView />;
      case 'avance_candidatos':
      case 'avance-candidatos':
        return <AvanceCandidatosView />;
      case 'banco_talento':
      case 'banco-talento':
        return <BancoTalentoView />;
      case 'criterios_evaluacion':
      case 'criterios-evaluacion':
        return <CriteriosEvaluacionView />;
      case 'historial_decisiones':
      case 'historial-decisiones':
        return <HistorialDecisionesView />;
      case 'resultados_proceso':
      case 'resultados-proceso':
        return <ResultadosProcesoView />;
      case 'ajustes_generales':
      case 'ajustes':
        return <AjustesGeneralesView />;
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
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div style={{ display: 'flex', minHeight: '100vh', width: '100%', overflowX: 'hidden' }}>
      <Sidebar isMobileOpen={mobileNavOpen} onCloseMobile={() => setMobileNavOpen(false)} />
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0, height: '100vh', overflow: 'hidden' }}>
        <Header onToggleMobileNav={() => setMobileNavOpen((prev) => !prev)} />
        <MainContent />
      </div>
      <CandidateDrawer />
      <GTHAssistantDrawer />
      <ToastContainer />
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppLayout />
    </AppProvider>
  );
}
