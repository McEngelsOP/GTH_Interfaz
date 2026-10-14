import React, { useEffect, useState } from 'react';
import { ListaDestinatarios } from './ListaDestinatarios.tsx';
import { correosSeleccionados, dividirTandas, gmailComposeUrl } from '../../services/emailComposition.ts';
import { Modal } from '../common/Modal.tsx';
import { Button } from '../common/Button.tsx';
import { Application, Candidate, JobPosting } from '../../types/index.ts';
import { CheckCircle2, Copy, Mail } from 'lucide-react';

// Gmail arma la ventana de redacción desde la URL: con más de ~50 correos la URL se vuelve demasiado larga,
// así que los destinatarios se reparten en tandas.
const POR_TANDA = 50;

const asuntoPredeterminado = (job: JobPosting) => `Gracias por postular · ${job.title} · Universidad ESAN`;
const mensajePredeterminado = (job: JobPosting) =>
  `Estimado(a) postulante:\n\nGracias por su interés en la convocatoria "${job.title}" de la Universidad ESAN y por el tiempo dedicado a su postulación.\n\nLe informamos que, tras la revisión de los perfiles recibidos, en esta ocasión su postulación no continuará a la siguiente etapa del proceso. Conservaremos sus datos para futuras convocatorias que se ajusten a su perfil.\n\nLe deseamos muchos éxitos.\n\nAtentamente,\nEquipo de GTHC · Universidad ESAN`;

interface AgradecimientoMasivoModalProps {
  isOpen: boolean;
  onClose: () => void;
  job: JobPosting;
  noSeleccionados: Application[];
  candidates: Map<string, Candidate>;
}

/** Correo de agradecimiento a quienes no fueron preseleccionados: abre Gmail con los correos en CCO. */
export function AgradecimientoMasivoModal({ isOpen, onClose, job, noSeleccionados, candidates }: AgradecimientoMasivoModalProps) {
  const [asunto, setAsunto] = useState(asuntoPredeterminado(job));
  const [mensaje, setMensaje] = useState(mensajePredeterminado(job));
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const recipientsKey = noSeleccionados.map((app) => app.id).join("|");
  const [abiertas, setAbiertas] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (isOpen) { setAsunto(asuntoPredeterminado(job)); setMensaje(mensajePredeterminado(job)); setAbiertas(new Set()); setSelectedIds(new Set(noSeleccionados.map((app) => app.id))); }
  }, [isOpen, job.id, recipientsKey]);
  if (!isOpen) return null;

  const elegidos = noSeleccionados.filter((app) => selectedIds.has(app.id));
  const correos = correosSeleccionados(elegidos, candidates);
  const sinCorreo = elegidos.filter((app) => !candidates.get(app.candidateId)?.email?.trim()).length;
  const tandas = dividirTandas(correos, POR_TANDA);
  const cambiarSeleccion = (ids: Set<string>) => { setSelectedIds(ids); setAbiertas(new Set()); };

  const abrirTanda = (i: number) => {
    const url = gmailComposeUrl(tandas[i], asunto, mensaje);
    window.open(url, '_blank', 'noopener,noreferrer');
    setAbiertas((prev) => new Set(prev).add(i));
  };
  const copiar = (texto: string) => { void navigator.clipboard?.writeText(texto); };

  const etiqueta: React.CSSProperties = { fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.35rem', display: 'block' };
  const campo: React.CSSProperties = {
    width: '100%', padding: '0.55rem 0.75rem', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)',
    backgroundColor: 'var(--bg-surface)', color: 'var(--text-primary)', fontSize: '0.84rem', fontFamily: 'inherit',
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="680px"
      title="Correo de agradecimiento a no seleccionados"
      subtitle={`Puesto: ${job.code} · ${job.title}`}
      footer={<div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'flex-end', gap: '0.5rem', width: '100%' }}>
        <Button variant="ghost" icon={<Copy size={15} />} disabled={!correos.length} onClick={() => copiar(correos.join(', '))}>Copiar correos</Button>
        <Button variant="ghost" icon={<Copy size={15} />} onClick={() => copiar(mensaje)}>Copiar mensaje</Button>
        <Button variant="primary" onClick={onClose}>Listo</Button>
      </div>}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
        <div style={{ padding: '0.85rem 1rem', backgroundColor: 'var(--bg-base)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', fontSize: '0.84rem', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
          <strong style={{ color: 'var(--text-primary)' }}>{correos.length} destinatarios</strong> que no están en Preseleccionado ni en una etapa posterior
          {sinCorreo > 0 && <> ({sinCorreo} sin correo registrado)</>}. Cada tanda abre Gmail con hasta {POR_TANDA} correos en <strong>CCO</strong>, para que
          nadie vea los correos de los demás; revisa y presiona «Enviar» en Gmail.
        </div>

        <ListaDestinatarios applications={noSeleccionados} candidates={candidates} selectedIds={selectedIds} onChange={cambiarSeleccion} />

        <div>
          <label style={etiqueta} htmlFor="agradecimiento-asunto">Asunto</label>
          <input id="agradecimiento-asunto" style={campo} value={asunto} onChange={(e) => { setAsunto(e.target.value); setAbiertas(new Set()); }} />
        </div>
        <div>
          <label style={etiqueta} htmlFor="agradecimiento-mensaje">Mensaje</label>
          <textarea id="agradecimiento-mensaje" rows={10} style={{ ...campo, resize: 'vertical', lineHeight: 1.45 }} value={mensaje} onChange={(e) => { setMensaje(e.target.value); setAbiertas(new Set()); }} />
        </div>

        <div>
          <span style={etiqueta}>Enviar desde Gmail</span>
          {tandas.length === 0
            ? <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)' }}>No hay destinatarios con correo.</p>
            : <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {tandas.map((tanda, i) => (
                <Button key={i} size="sm" variant={abiertas.has(i) ? 'secondary' : 'outline'}
                  icon={abiertas.has(i) ? <CheckCircle2 size={14} /> : <Mail size={14} />}
                  disabled={!asunto.trim() || !mensaje.trim()} onClick={() => abrirTanda(i)}>
                  {tandas.length > 1 ? `Tanda ${i + 1} · ` : 'Abrir en Gmail · '}{i * POR_TANDA + 1}–{i * POR_TANDA + tanda.length}
                </Button>
              ))}
            </div>}
        </div>
      </div>
    </Modal>
  );
}
