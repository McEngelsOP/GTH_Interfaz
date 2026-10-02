import React, { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext.tsx';
import { Header } from './components/layout/Header.tsx';
import { Sidebar } from './components/layout/Sidebar.tsx';
import { ToastContainer } from './components/layout/ToastContainer.tsx';
import { CandidateDrawer } from './components/candidate/CandidateDrawer.tsx';
import { GTHAssistantDrawer } from './components/assistant/GTHAssistantDrawer.tsx';

// Vistas del sistema GTH ESAN
import { AgregarArchivosView } from './views/AgregarArchivosView.tsx';
import { MejoresCandidatosView } from './views/MejoresCandidatosView.tsx';
import { ComparadorView } from './views/ComparadorView.tsx';
import { AvanceCandidatosView } from './views/AvanceCandidatosView.tsx';

function MainContent() {
  const { currentView } = useApp();

  const renderView = () => {
    switch (currentView) {
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
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div style={{ display: 'flex', minHeight: '100vh', width: '100%', overflowX: 'hidden' }}>
      <Sidebar isMobileOpen={mobileNavOpen} onCloseMobile={() => setMobileNavOpen(false)} />
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0, height: '100vh', overflow: 'hidden' }}>
        <Header onToggleMobileNav={() => setMobileNavOpen((prev) => !prev)} />
        <MainContent />
      </div>
      <CandidateDrawer key={selectedCandidateForDrawer?.id || 'closed'} />
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
