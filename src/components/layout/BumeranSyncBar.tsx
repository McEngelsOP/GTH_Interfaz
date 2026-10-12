import { RefreshCw, Cloud, AlertCircle } from 'lucide-react';
import { useApp } from '../../context/AppContext.tsx';
import { useBumeranSync } from '../../services/useBumeranSync.ts';
import { Button } from '../common/Button.tsx';

export function BumeranSyncBar({ sync }: { sync: ReturnType<typeof useBumeranSync> }) {
  const { activeJob, activeJobApplications } = useApp();
  if (!sync.configured) return null;
  const loading = sync.postings.loading || sync.applicants.loading || sync.ranking.loading;
  const errors = [sync.postings.error, sync.applicants.error, sync.ranking.error].filter(Boolean);
  const ranked = activeJobApplications.filter((a) => a.embeddingMatch?.criteriaVersion === activeJob?.criteriaVersion).length;
  return <section className="sync-bar" aria-label="Sincronización de Bumeran" aria-busy={loading}>
    <div className="sync-summary">
      {errors.length ? <AlertCircle size={18} /> : <Cloud size={18} />}
      <div>
        <strong>Bumeran</strong>
        <p role={errors.length ? 'alert' : 'status'}>{errors.length ? errors.join(' ') : loading ? 'Consultando convocatorias, candidatos y ranking…' : 'Datos consultados. La lista se revisa cada 5 minutos.'}</p>
        {activeJob?.bumeran && !loading && !errors.length && <p>{activeJobApplications.length} {activeJobApplications.length === 1 ? 'candidato incorporado' : 'candidatos incorporados'} · {ranked} con ranking{!ranked && activeJobApplications.length > 0 ? ' · Pendiente de cálculo o publicación por el proceso de extracción' : ''}</p>}
      </div>
    </div>
    <Button size="sm" variant="outline" icon={<RefreshCw size={15} className={loading ? 'spin' : ''} />} disabled={loading} onClick={sync.refresh}>
      {loading ? 'Consultando…' : errors.length ? 'Reintentar' : 'Volver a cargar datos'}
    </Button>
    <small>Consulta lo guardado por el proceso de extracción. No inicia una nueva descarga de Bumeran.</small>
  </section>;
}
