import { useEffect, useRef, useState } from 'react';
import { Mail, Calendar, Check, X } from 'lucide-react';
import { useApp } from '../../context/AppContext.tsx';
import { Modal } from '../common/Modal.tsx';
import { Button } from '../common/Button.tsx';
import type { Application, Candidate, JobPosting } from '../../types/index.ts';
import { finishCommunication, reserveCommunication, workflowCandidateId, type SharedAction, type WorkflowAction } from '../../services/sharedWorkflow.ts';
import { gmailComposeUrl, prepararCorreoMultitest } from '../../services/emailComposition.ts';
import { whatsappNumber } from '../../services/candidateContact.ts';

interface Props {
  action: WorkflowAction;
  job: JobPosting;
  applications: Application[];
  onClose: () => void;
  multitest: { enlace: string; plazo: string };
}
const titles: Record<WorkflowAction, string> = { multitest: 'Enviar Multitest', agradecimiento: 'Agradecer a no seleccionados', entrevista: 'Agendar entrevista' };

export function WorkflowCommunicationModal({ action, job, applications, onClose, multitest }: Props) {
  const { appState, workflow } = useApp();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [channel, setChannel] = useState<'correo' | 'whatsapp'>('correo');
  const [date, setDate] = useState('');
  const [place, setPlace] = useState('');
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const [error, setError] = useState('');
  const [opened, setOpened] = useState<Set<string>>(new Set());
  const candidates = new Map(appState.candidates.map(c => [c.id, c]));
  const people = applications.map(app => candidates.get(app.candidateId)).filter((c): c is Candidate => !!c);
  const actions = new Map(workflow.actions.filter(a => a.accion === action).map(a => [a.id_postulante, a]));
  const blocked = new Set(workflow.actions.filter(a => a.estado === 'preparado').map(a => a.id_postulante));
  const available = people.filter(c => !actions.has(workflowCandidateId(c)) && !blocked.has(workflowCandidateId(c)) && (channel === 'correo' ? !!c.email?.trim() : !!whatsappNumber(c.phone)));
  const chosen = available.filter(c => selected.has(c.id));
  const pending = workflow.actions.filter(a => a.accion === action && a.estado === 'preparado' && a.creado_por === workflow.userId);
  const grouped = new Map<string, SharedAction[]>();
  pending.forEach(a => {
    // Agrupa solo mensajes idénticos; no mezcla horarios ni canales de entrevistas.
    const { destinatario: _, ...content } = a.detalle;
    const key = JSON.stringify(content);
    grouped.set(key, [...(grouped.get(key) || []), a]);
  });

  const groups = new Map<string, SharedAction[]>();
  grouped.forEach((items, key) => {
    const size = items[0].detalle.canal === 'correo' ? 40 : 1;
    for (let i = 0; i < items.length; i += size) groups.set(`${key}:${i}`, items.slice(i, i + size));
  });

  useEffect(() => {
    if (action === 'multitest') {
      const template = prepararCorreoMultitest({ puesto: job.title, ...multitest });
      setSubject(template.asunto); setMessage(template.mensaje);
    } else if (action === 'agradecimiento') {
      setSubject(`Gracias por su postulación · ${job.title}`);
      setMessage(`Estimado(a) postulante:\n\nGracias por su interés en la convocatoria «${job.title}». En esta oportunidad continuaremos el proceso con otros perfiles. Agradecemos el tiempo y la confianza depositados en la Universidad ESAN.\n\nAtentamente,\nEquipo de GTHC · Universidad ESAN`);
    } else {
      setSubject(`Invitación a entrevista · ${job.title}`);
      setMessage(`Le invitamos a una entrevista para la convocatoria «${job.title}». Por favor, confirme su disponibilidad.\n\nEquipo de GTHC · Universidad ESAN`);
    }
  }, [action, job.id, multitest.enlace, multitest.plazo]);
  useEffect(() => {
    setSelected(new Set(action === 'entrevista' ? [] : available.map(c => c.id)));
  }, [action, channel]);

  const run = async (task: () => Promise<void>) => {
    if (busyRef.current) return;
    busyRef.current = true; setBusy(true); setError('');
    try { await task(); } catch (e) { setError(e instanceof Error ? e.message : 'No se pudo completar la acción.'); }
    finally { await workflow.reload(); busyRef.current = false; setBusy(false); }
  };
  const prepare = () => run(async () => {
    if (!workflow.ready || !chosen.length) throw new Error('Actualiza los destinatarios y selecciona al menos uno disponible.');
    if (!subject.trim() || !message.trim()) throw new Error('Completa el asunto y el mensaje.');
    if (action === 'entrevista' && (!date || !place.trim() || !Number.isFinite(new Date(date).getTime()) || new Date(date).getTime() <= Date.now())) throw new Error('Indica una fecha futura y el lugar o enlace de la entrevista.');
    const body = action === 'entrevista' ? `${message.trim()}\n\nFecha y hora (Perú): ${new Date(date).toLocaleString('es-PE', { timeZone: 'America/Lima' })}\nLugar o enlace: ${place.trim()}` : message.trim();
    await reserveCommunication(job, action, chosen.map(candidate => ({ candidate, detail: {
      asunto: subject.trim(), mensaje: body, canal: channel,
      destinatario: channel === 'correo' ? candidate.email!.trim() : whatsappNumber(candidate.phone)!,
      ...(action === 'entrevista' ? { fecha: new Date(date).toISOString(), lugar: place.trim() } : {}),
    } })));
    setSelected(new Set());
  });
  const open = (key: string, group: SharedAction[]) => {
    const detail = group[0].detalle;
    const url = detail.canal === 'correo' ? gmailComposeUrl([...new Set(group.map(a => a.detalle.destinatario))], detail.asunto, detail.mensaje)
      : `https://wa.me/${detail.destinatario}?text=${encodeURIComponent(detail.mensaje)}`;
    // Síncrono desde el clic: evita bloqueos de ventanas tras esperar la base de datos.
    const popup = window.open(url, '_blank');
    if (!popup) { setError('Permite las ventanas emergentes para abrir el borrador. No se ha confirmado ningún envío.'); return; }
    popup.opener = null;
    setOpened(prev => new Set(prev).add(key));
  };
  const finish = (group: SharedAction[], cancel: boolean) => run(async () => {
    if (cancel && !window.confirm('Libera la preparación solo si NO enviaste el mensaje. Otros colaboradores podrán prepararlo nuevamente.')) return;
    await finishCommunication(job, action, group.map(a => a.id_postulante), cancel);
  });

  return <Modal isOpen onClose={() => { if (!busy) onClose(); }} title={titles[action]} subtitle={job.title} maxWidth="780px"
    footer={<Button variant="ghost" disabled={busy} onClick={onClose}>Cerrar</Button>}>
    <div className="workflow-compose">
      <p className="workflow-help">Preparar reserva los destinatarios para ti. Revisa y envía desde {channel === 'correo' ? 'Gmail' : 'WhatsApp'}; después confirma el envío aquí. Los demás colaboradores verán el bloqueo.</p>
      {!workflow.ready && <p role="alert">{workflow.error || 'Conecta y activa el avance compartido para preparar comunicaciones.'}</p>}
      {error && <p role="alert">{error}</p>}
      {pending.length > 0 && <section className="workflow-prepared" aria-label="Comunicaciones preparadas">
        <h3>Preparadas por ti · {pending.length}</h3>
        {[...groups].map(([key, group]) => <div key={key} className="workflow-prepared-group">
          <p><strong>{group.length} destinatario{group.length === 1 ? '' : 's'}</strong> · {group[0].detalle.asunto}</p>
          <p className="workflow-help">{group.map(a => people.find(c => workflowCandidateId(c) === a.id_postulante)?.name || a.detalle.destinatario).join(', ')}</p>
          <details><summary>Revisar mensaje preparado</summary><p className="workflow-message">{group[0].detalle.mensaje}</p></details>
          <div className="workflow-buttons">
            <Button size="sm" disabled={busy || !workflow.ready} icon={<Mail size={15} />} onClick={() => open(key, group)}>Abrir {group[0].detalle.canal === 'correo' ? 'Gmail' : 'WhatsApp'}</Button>
            <Button size="sm" variant="outline" disabled={busy || !workflow.ready || !opened.has(key)} icon={<Check size={15} />} onClick={() => void finish(group, false)}>Confirmar envío realizado ({group.length})</Button>
            <Button size="sm" variant="ghost" disabled={busy || !workflow.ready} icon={<X size={15} />} onClick={() => void finish(group, true)}>Liberar preparación</Button>
          </div>
        </div>)}
      </section>}
      {action === 'entrevista' && <div className="workflow-form-grid">
        <label>Canal<select value={channel} onChange={e => setChannel(e.target.value as 'correo' | 'whatsapp')}><option value="correo">Correo</option><option value="whatsapp">WhatsApp</option></select></label>
        <label>Fecha y hora local<input type="datetime-local" value={date} onChange={e => setDate(e.target.value)} /></label>
        <label className="workflow-full">Lugar o enlace<input value={place} onChange={e => setPlace(e.target.value)} placeholder="Indica la sala o el enlace de la reunión" maxLength={500} /></label>
      </div>}
      <section aria-label="Destinatarios de la comunicación">
        <div className="workflow-recipient-heading"><h3>Destinatarios disponibles · {available.length}</h3>
          {action !== 'entrevista' && <Button size="sm" variant="ghost" disabled={busy} onClick={() => setSelected(new Set(available.map(c => c.id)))}>Seleccionar todos</Button>}
        </div>
        <label>Buscar destinatario por nombre<input type="search" value={query} onChange={e => setQuery(e.target.value)} /></label>
        <div className="workflow-recipients">
          {people.filter(c => c.name.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())).map(c => {
            const record = actions.get(workflowCandidateId(c));
            const valid = available.some(item => item.id === c.id);
            const status = record ? record.estado === 'confirmado' ? 'Envío confirmado' : record.creado_por === workflow.userId ? 'Preparado por ti' : 'En preparación por otro colaborador'
              : blocked.has(workflowCandidateId(c)) ? 'Otra comunicación en preparación' : !valid ? channel === 'correo' ? 'Sin correo' : 'Sin celular válido' : 'Disponible';
            return <label className="workflow-recipient" key={c.id}>
              <input type={action === 'entrevista' ? 'radio' : 'checkbox'} name="workflow-recipient" aria-label={`Incluir a ${c.name}`} disabled={busy || !workflow.ready || !valid} checked={valid && selected.has(c.id)}
                onChange={e => setSelected(prev => { const ids = action === 'entrevista' ? new Set<string>() : new Set(prev); if (e.target.checked) ids.add(c.id); else ids.delete(c.id); return ids; })} />
              <span>{c.name}<small>{status}</small></span>
            </label>;
          })}
          {people.length === 0 && <p>No hay candidatos en esta etapa.</p>}
        </div>
      </section>
      <label>Asunto<input value={subject} onChange={e => setSubject(e.target.value)} maxLength={200} /></label>
      <label>Mensaje<textarea rows={6} value={message} onChange={e => setMessage(e.target.value)} maxLength={4000} /></label>
      <p className="workflow-help">{action === 'agradecimiento' ? 'Confirmar el agradecimiento cierra la postulación de quienes aún estaban en Postulado. ' : ''}Una comunicación confirmada no puede enviarse nuevamente desde este flujo.</p>
      <Button disabled={busy || !workflow.ready || !chosen.length || !subject.trim() || !message.trim()} icon={action === 'entrevista' ? <Calendar size={16} /> : <Mail size={16} />} onClick={() => void prepare()}>
        {busy ? 'Guardando…' : `Preparar ${channel === 'correo' ? 'correo' : 'WhatsApp'} (${chosen.length})`}
      </Button>
      {chosen.length > 40 && <p role="status">Se prepararán tandas de hasta 40 destinatarios, con correos en CCO.</p>}
    </div>
  </Modal>;
}
