import { Fragment } from 'react';
import type { Candidate } from '../../types/index.ts';
import '../../styles/postulaciones.css';

/** Columnas del CSV de Bumeran que son preguntas del aviso («¿Tienes portafolio? Adjunta el link», «Indícanos…»). */
const esPregunta = (columna: string) => /\?/.test(columna) || /^(Ind[ií]canos|D[eé]janos|Adjunta|Comparte)\b/i.test(columna.trim());
const URL = /(https?:\/\/[^\s<>"']+|www\.[^\s<>"']+)/gi;

export function preguntasDelAviso(candidate: Candidate): { pregunta: string; respuesta: string }[] {
  const ultima = (candidate.importedProfile?.records?.at(-1) || {}) as Record<string, string>;
  return Object.entries(ultima).filter(([k]) => esPregunta(k) && !/^Exp\[|^Est\[/.test(k))
    .map(([pregunta, respuesta]) => ({ pregunta: pregunta.replace(/^¿\?/, '¿').trim(), respuesta: String(respuesta ?? '').trim() }));
}

/** Respuesta tal cual la escribió el postulante; los enlaces (p. ej. un portafolio) se pueden abrir. */
function Respuesta({ texto }: { texto: string }) {
  if (!texto) return <span className="vacio">Sin respuesta.</span>;
  const partes = texto.split(URL);
  return <>{partes.map((parte, i) => i % 2 === 1
    ? <a key={i} href={/^https?:/i.test(parte) ? parte : `https://${parte}`} target="_blank" rel="noopener noreferrer">{parte}</a>
    : <Fragment key={i}>{parte}</Fragment>)}</>;
}

/** Preguntas que hizo el aviso en Bumeran y lo que respondió el postulante, tal cual. */
export function PreguntasAviso({ candidate }: { candidate: Candidate }) {
  const preguntas = preguntasDelAviso(candidate);
  if (!preguntas.length) return <p className="vacio">Este aviso no hizo preguntas en Bumeran o el postulante no tiene respuestas registradas.</p>;
  return <dl className="preguntas-aviso">
    {preguntas.map(({ pregunta, respuesta }) => <div key={pregunta}>
      <dt>{pregunta}</dt>
      <dd><Respuesta texto={respuesta} /></dd>
    </div>)}
  </dl>;
}
