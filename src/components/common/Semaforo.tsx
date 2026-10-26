import { AlertCircle, CheckCircle2, HelpCircle } from 'lucide-react';
import '../../styles/semaforo.css';

export type ColorSemaforo = 'verde' | 'rojo' | 'amarillo';
const ICONO = { verde: CheckCircle2, rojo: AlertCircle, amarillo: HelpCircle };

/** Ícono verde, rojo o amarillo (rotación laboral, sueldo). Lleva su texto para lectores de pantalla, así que no
 *  depende solo del color. */
export function Semaforo({ color, texto, size = 15 }: { color: ColorSemaforo; texto: string; size?: number }) {
  const Icono = ICONO[color];
  return <Icono size={size} className={`semaforo semaforo-${color}`} role="img" aria-label={texto} aria-hidden={false} />;
}
