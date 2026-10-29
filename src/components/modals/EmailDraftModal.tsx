import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal.tsx';
import { Button } from '../common/Button.tsx';
import { Input } from '../common/Input.tsx';
import { Select } from '../common/Select.tsx';
import { Candidate, Application, JobPosting } from '../../types/index.ts';
import { Mail, Eye, Info, Send, Save } from 'lucide-react';
import { useApp } from '../../context/AppContext.tsx';
import { enviarCorreos } from '../../services/correo.ts';
import { supabase } from '../../services/supabase.ts';
import { workflowCandidateId, workflowJobId } from '../../services/sharedWorkflow.ts';
import { correoVigente } from '../../services/candidateContact.ts';
import { correoValido, guardarCorreo } from '../../services/correosPostulante.ts';

interface EmailDraftModalProps {
  isOpen: boolean;
  onClose: () => void;
  candidate: Candidate;
  application: Application;
  job: JobPosting;
  onSaveDraft: (draft: {
    applicationId: string;
    to: string;
    cc?: string;
    templateType: 'personal' | 'avance' | 'cierre' | 'entrevista';
    lang: 'es' | 'en';
    subject: string;
    body: string;
  }) => void;
}

export function EmailDraftModal({
  isOpen,
  onClose,
  candidate,
  application,
  job,
  onSaveDraft,
}: EmailDraftModalProps) {
  // Mismo correo que Multitest y el agradecimiento: el de la fila más reciente del CSV
  const [to, setTo] = useState(correoVigente(candidate));
  const [cc, setCc] = useState('');
  const [templateType, setTemplateType] = useState<'personal' | 'avance' | 'cierre' | 'entrevista'>('avance');
  const [lang, setLang] = useState<'es' | 'en'>('es');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [guardandoCorreo, setGuardandoCorreo] = useState(false);
  const { actualizarCorreoPostulante } = useApp();
  const guardarDestinatario = async () => {
    if (!correoValido(to)) { setEmailError('Escribe un correo válido.'); return; }
    setGuardandoCorreo(true);
    try {
      if (supabase) await guardarCorreo(supabase, workflowCandidateId(candidate), to);
      actualizarCorreoPostulante(workflowCandidateId(candidate), to);
      showToast(`Correo de ${candidate.name} actualizado en todos sus avisos.`, 'success');
    } catch (e) { setEmailError((e as Error).message); }
    finally { setGuardandoCorreo(false); }
  };
  const { showToast } = useApp();

  // Cargar texto según plantilla e idioma
  useEffect(() => {
    if (!isOpen) return;

    setTo(correoVigente(candidate));
    const candName = candidate.name;
    const jobTitle = job.title;

    if (lang === 'es') {
      switch (templateType) {
        case 'avance':
          setSubject(`Avance en proceso de selección: ${jobTitle} · ESAN`);
          setBody(
            `Estimado(a) ${candName},\n\nNos complace comunicarle que su perfil ha avanzado a la etapa de Preselección en la convocatoria "${jobTitle}".\n\nPróximamente el equipo de GTHC de la Universidad ESAN se pondrá en contacto con usted para las evaluaciones correspondientes.\n\nAtentamente,\nEquipo de GTHC · Universidad ESAN`
          );
          break;
        case 'entrevista':
          setSubject(`Coordinación de entrevista: ${jobTitle} · ESAN`);
          setBody(
            `Estimado(a) ${candName},\n\nQueremos invitarle a una entrevista de evaluación para el puesto de "${jobTitle}".\n\nLe agradeceremos confirmar su disponibilidad en los horarios que le compartiremos a continuación.\n\nAtentamente,\nEquipo de GTHC · Universidad ESAN`
          );
          break;
        case 'cierre':
          setSubject(`Agradecimiento por su postulación: ${jobTitle} · ESAN`);
          setBody(
            `Estimado(a) ${candName},\n\nAgradecemos sinceramente su participación en la convocatoria "${jobTitle}". En esta oportunidad hemos decidido continuar con otros perfiles que se alinean más estrechamente a los requerimientos específicos de la cátedra.\n\nConservaremos sus datos en nuestro Banco de Talento para futuras oportunidades institucionales.\n\nAtentamente,\nEquipo de GTHC · Universidad ESAN`
          );
          break;
        case 'personal':
          setSubject(`Comunicación sobre su postulación: ${jobTitle}`);
          setBody(
            `Estimado(a) ${candName},\n\nNos comunicamos del equipo de GTHC de ESAN respecto a su postulación en "${jobTitle}".\n\n[Escriba su mensaje aquí]\n\nAtentamente,\nEquipo de GTHC · Universidad ESAN`
          );
          break;
      }
    } else {
      // Inglés
      switch (templateType) {
        case 'avance':
          setSubject(`Update on your application: ${jobTitle} · ESAN`);
          setBody(
            `Dear ${candName},\n\nWe are pleased to inform you that your application for "${jobTitle}" has moved forward to the Preselection stage.\n\nOur GTHC team will be in touch shortly regarding the next steps.\n\nSincerely,\nGTHC Team · ESAN University`
          );
          break;
        case 'entrevista':
          setSubject(`Interview Invitation: ${jobTitle} · ESAN`);
          setBody(
            `Dear ${candName},\n\nWe would like to invite you to an interview for the position of "${jobTitle}".\n\nPlease let us know your availability.\n\nSincerely,\nGTHC Team · ESAN University`
          );
          break;
        case 'cierre':
          setSubject(`Thank you for your application: ${jobTitle} · ESAN`);
          setBody(
            `Dear ${candName},\n\nThank you for your interest in the "${jobTitle}" position at ESAN. At this time, we have decided to proceed with other candidates whose experience aligns more closely with our current requirements.\n\nWe will retain your profile in our Talent Pool for future opportunities.\n\nSincerely,\nGTHC Team · ESAN University`
          );
          break;
        case 'personal':
          setSubject(`Regarding your application: ${jobTitle}`);
          setBody(
            `Dear ${candName},\n\n[Write your message here]\n\nSincerely,\nGTHC Team · ESAN University`
          );
          break;
      }
    }
  }, [isOpen, templateType, lang, candidate, job]);

  const handleSave = () => {
    if (to && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to.trim())) {
      setEmailError('Ingrese un correo electrónico válido');
      return;
    }
    setEmailError('');

    onSaveDraft({
      applicationId: application.id,
      to,
      cc,
      templateType,
      lang,
      subject,
      body,
    });

    onClose();
  };

  const previewSubject = subject.replace(/{nombre}/g, candidate.name).replace(/{puesto}/g, job.title);
  const previewBody = body.replace(/{nombre}/g, candidate.name).replace(/{puesto}/g, job.title);

  // Envío real desde la cuenta de GTH (api/correo.ts); las respuestas llegan a esa misma cuenta.
  const handleSend = async () => {
    const destino = to.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(destino)) { setEmailError('Ingrese un correo electrónico válido'); return; }
    if (!supabase || !window.confirm(`Se enviará este correo a ${destino} desde la cuenta de GTH. ¿Continuar?`)) return;
    setEmailError(''); setEnviando(true);
    try {
      const [resultado] = await enviarCorreos(supabase, [{ destinatario: destino, asunto: previewSubject, cuerpo: previewBody, tipo: 'perfil',
        aviso_id: workflowJobId(job), id_postulante: workflowCandidateId(candidate) }]);
      if (!resultado?.ok) { setEmailError(resultado?.error || 'No se pudo enviar el correo.'); return; }
      showToast(`Correo enviado a ${destino}.`, 'success');
      onClose();
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Correo al postulante"
      subtitle={`Candidato: ${candidate.name} · Puesto: ${job.code}`}
      maxWidth="620px"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button variant="secondary" icon={<Mail size={16} />} onClick={handleSave} disabled={enviando || !subject.trim() || !body.trim()}>
            Guardar borrador
          </Button>
          <Button variant="primary" icon={<Send size={16} />} onClick={() => void handleSend()}
            disabled={!supabase || enviando || !to.trim() || !!cc.trim() || !subject.trim() || !body.trim()}
            title={cc.trim() ? 'El envío directo va solo al destinatario: deja vacío el campo CC' : 'Enviar desde la cuenta de GTH'}>
            {enviando ? 'Enviando…' : 'Enviar'}
          </Button>
        </>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
        {/* Aviso de integración pendiente con Gmail */}
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '0.65rem',
            padding: '0.75rem 0.95rem',
            backgroundColor: 'var(--info-bg)',
            color: 'var(--info-color)',
            borderRadius: 'var(--radius-md)',
            fontSize: '0.8125rem',
            lineHeight: 1.45,
          }}
        >
          <Info size={17} style={{ flexShrink: 0, marginTop: '0.1rem' }} />
          <div>
            <strong>Enviar</strong> manda el correo desde la cuenta de GTH y las respuestas llegan a esa cuenta.
            <strong> Guardar borrador</strong> solo lo deja en la actividad del candidato, sin enviarlo.
          </div>
        </div>

        {/* Destinatarios. «Guardar» deja el destinatario como correo del postulante en todos sus avisos */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.4rem' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <Input
                label="Destinatario"
                value={to}
                onChange={(e) => {
                  setTo(e.target.value);
                  setEmailError('');
                }}
                placeholder="correo@ejemplo.com"
                error={emailError}
                helperText={!correoVigente(candidate) ? 'El candidato no registró correo (campo editable)' : undefined}
              />
            </div>
            <Button variant="secondary" icon={<Save size={15} />} onClick={() => void guardarDestinatario()}
              disabled={guardandoCorreo || !correoValido(to) || to.trim().toLowerCase() === correoVigente(candidate).toLowerCase()}
              title="Guardar este correo para el postulante en todos sus avisos" aria-label="Guardar correo del postulante"
              style={{ marginBottom: emailError || !correoVigente(candidate) ? '1.35rem' : 0, padding: '0.55rem 0.65rem' }} />
          </div>
          <Input
            label="Copia (CC opcional)"
            value={cc}
            onChange={(e) => setCc(e.target.value)}
            placeholder="cc@esan.edu.pe"
          />
        </div>

        {/* Plantilla e Idioma */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '0.75rem' }}>
          <Select
            label="Plantilla base"
            value={templateType}
            onChange={(e) => setTemplateType(e.target.value as any)}
            options={[
              { value: 'avance', label: 'Avance a Preseleccionado' },
              { value: 'entrevista', label: 'Invitación a Entrevista' },
              { value: 'cierre', label: 'Cierre de Postulación' },
              { value: 'personal', label: 'Mensaje Personalizado' },
            ]}
          />
          <Select
            label="Idioma"
            value={lang}
            onChange={(e) => setLang(e.target.value as any)}
            options={[
              { value: 'es', label: 'Español' },
              { value: 'en', label: 'English' },
            ]}
          />
        </div>

        {/* Asunto */}
        <Input
          label="Asunto"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Asunto del correo"
          required
        />

        {/* Mensaje editable */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              Cuerpo del mensaje (soporta variables {'{nombre}'} y {'{puesto}'})
            </label>
            <button
              type="button"
              onClick={() => setShowPreview(!showPreview)}
              className="focus-ring"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                background: 'transparent',
                border: 'none',
                color: 'var(--primary-red)',
                fontSize: '0.78rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <Eye size={13} />
              {showPreview ? 'Ocultar vista previa' : 'Ver vista previa'}
            </button>
          </div>

          {showPreview ? (
            <div
              style={{
                padding: '1rem',
                backgroundColor: 'var(--bg-base)',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-default)',
                fontSize: '0.84rem',
                whiteSpace: 'pre-wrap',
                lineHeight: 1.5,
              }}
            >
              <div style={{ borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.5rem', marginBottom: '0.75rem', color: 'var(--text-secondary)' }}>
                <strong>Asunto:</strong> {previewSubject}
              </div>
              {previewBody}
            </div>
          ) : (
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={7}
              className="focus-ring"
              style={{
                width: '100%',
                padding: '0.65rem 0.75rem',
                fontSize: '0.875rem',
                color: 'var(--text-primary)',
                backgroundColor: 'var(--bg-surface)',
                border: '1px solid var(--border-default)',
                borderRadius: 'var(--radius-sm)',
                outline: 'none',
                fontFamily: 'inherit',
                lineHeight: 1.45,
              }}
            />
          )}
        </div>
      </div>
    </Modal>
  );
}
