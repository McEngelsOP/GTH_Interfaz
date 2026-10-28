import { CheckCircle2, CircleHelp, Handshake, XCircle } from 'lucide-react';
import type { AjusteSalarial } from '../../services/salarios.ts';
import '../../styles/sueldos.css';

export const ESTADOS_SUELDO = {
  dentro: { Icono: CheckCircle2, etiqueta: 'Dentro del presupuesto', detalle: 'Pretensión dentro del presupuesto' },
  supera: { Icono: XCircle, etiqueta: 'Supera el presupuesto', detalle: 'Pretensión superior al presupuesto' },
  manejable: { Icono: Handshake, etiqueta: 'Manejable · revisar', detalle: 'Supera el presupuesto; perfil con similitud alta. Negociación pendiente de revisión.' },
  pendiente: { Icono: CircleHelp, etiqueta: 'Sin comparar', detalle: 'Comparación pendiente: falta un monto verificable o la oferta no está disponible.' },
} satisfies Record<AjusteSalarial, { Icono: typeof CheckCircle2; etiqueta: string; detalle: string }>;

export function IndicadorSueldo({ estado, compacto = false }: { estado: AjusteSalarial; compacto?: boolean }) {
  const { Icono, etiqueta, detalle } = ESTADOS_SUELDO[estado];
  return <span className={`sueldo-indicador sueldo-${estado}`} title={detalle}>
    <Icono size={16} role="img" aria-label={detalle} aria-hidden={false} />
    {!compacto && <span>{etiqueta}</span>}
  </span>;
}

/** Celda «Sueldo pretendido» del ranking: el monto que indicó el postulante y, si el aviso tiene oferta, su estado
 *  (verde: igual o menor; rojo: supera; amarillo: no indicó monto). Sin monto ni oferta, una incógnita. */
export function CeldaSueldo({ pretension, hayOferta, estado, cargando }: {
  pretension: number | null; hayOferta: boolean; estado: AjusteSalarial; cargando: boolean;
}) {
  const monto = pretension === null ? null
    : new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN', maximumFractionDigits: 0 }).format(pretension);
  return <span className="sueldo-celda">
    {monto ? <span className="tabular-nums">{monto}</span>
      : !hayOferta && <CircleHelp size={16} className="sueldo-pendiente" role="img" aria-label="No indicó sueldo pretendido" aria-hidden={false} />}
    {hayOferta && !cargando && (pretension === null
      ? <CircleHelp size={16} className="sueldo-sin-monto" role="img" aria-label="No indicó sueldo pretendido" aria-hidden={false} />
      : <IndicadorSueldo estado={estado} compacto />)}
  </span>;
}
