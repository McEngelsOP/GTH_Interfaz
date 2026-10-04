import React, { useEffect, useRef, useState } from 'react';
import { useApp } from '../../context/AppContext.tsx';
import { Drawer } from '../common/Drawer.tsx';
import { Button } from '../common/Button.tsx';
import { Badge } from '../common/Badge.tsx';
import { Bot, Send, RotateCcw, PlugZap, RefreshCw, SlidersHorizontal, ChevronRight, ShieldCheck } from 'lucide-react';
import { askAssistant, AssistantConfiguration, AssistantMessage, AssistantRequestError, buildAssistantContext, getAssistantConfiguration, testAssistantConnection } from '../../services/assistantService.ts';
import '../../styles/assistant.css';

interface ChatMessage extends AssistantMessage { id: string }

export function GTHAssistantDrawer() {
  const { isAssistantDrawerOpen, setAssistantDrawerOpen, activeJob, appState } = useApp();
  const [question, setQuestion] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [configuration, setConfiguration] = useState<AssistantConfiguration | null>(null);
  const [includeCandidates, setIncludeCandidates] = useState(false);
  const [busy, setBusy] = useState<'chat' | 'check' | null>(null);
  const [error, setError] = useState('');
  const [connectionChecked, setConnectionChecked] = useState(false);
  const [checkingConfiguration, setCheckingConfiguration] = useState(false);
  const [connectionFailed, setConnectionFailed] = useState(false);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const controller = useRef<AbortController | null>(null);
  const requestVersion = useRef(0);
  const transcriptEnd = useRef<HTMLDivElement>(null);

  const cancelRequest = () => { requestVersion.current++; controller.current?.abort(); controller.current = null; };
  const refreshConfiguration = async () => {
    cancelRequest();
    const version = requestVersion.current, abort = new AbortController(); controller.current = abort;
    setCheckingConfiguration(true); setConfiguration(null); setError(''); setConnectionChecked(false); setConnectionFailed(false);
    try {
      const config = await getAssistantConfiguration(abort.signal);
      if (version === requestVersion.current) setConfiguration(config);
    } catch (reason) {
      if (version === requestVersion.current) { setConfiguration(null); setConnectionFailed(true); setError(reason instanceof Error ? reason.message : 'No se pudo revisar Gemini.'); }
    } finally { if (version === requestVersion.current) setCheckingConfiguration(false); }
  };

  useEffect(() => {
    setMessages([]); setQuestion(''); setIncludeCandidates(false); setError(''); setConnectionChecked(false); setConnectionFailed(false); setOptionsOpen(false);
  }, [activeJob?.id]);
  useEffect(() => {
    if (isAssistantDrawerOpen) { setOptionsOpen(false); void refreshConfiguration(); }
    return () => { cancelRequest(); setBusy(null); setCheckingConfiguration(false); };
  }, [isAssistantDrawerOpen, activeJob?.id]);
  useEffect(() => { transcriptEnd.current?.scrollIntoView({ behavior: 'auto', block: 'end' }); }, [messages, busy]);

  const markConnectionFailure = (reason: unknown) => {
    if (!(reason instanceof AssistantRequestError) || reason.status >= 500) { setConnectionFailed(true); setConnectionChecked(false); }
  };

  const ask = async (value: string) => {
    if (!value.trim() || value.length > 2000 || busy || !configuration?.configured || !activeJob || checkingConfiguration) return;
    cancelRequest();
    const version = requestVersion.current, abort = new AbortController(); controller.current = abort;
    const snapshot = value.trim();
    setBusy('chat'); setError('');
    try {
      const answer = await askAssistant(snapshot, messages.map(({ role, text }) => ({ role, text })),
        buildAssistantContext(appState, activeJob, includeCandidates), abort.signal);
      if (version !== requestVersion.current) return;
      setMessages((previous) => [...previous, { id: crypto.randomUUID(), role: 'user' as const, text: snapshot },
        { id: crypto.randomUUID(), role: 'assistant' as const, text: answer.text }].slice(-24));
      setQuestion(''); setConnectionChecked(true); setConnectionFailed(false);
    } catch (reason) {
      if (version === requestVersion.current) { markConnectionFailure(reason); setQuestion(snapshot); setError(reason instanceof Error ? reason.message : 'No se pudo responder la consulta.'); }
    } finally { if (version === requestVersion.current) setBusy(null); }
  };

  const checkConnection = async () => {
    if (busy || checkingConfiguration || !configuration?.configured) return;
    cancelRequest();
    const version = requestVersion.current, abort = new AbortController(); controller.current = abort;
    setBusy('check'); setError(''); setConnectionChecked(false);
    try {
      await testAssistantConnection(abort.signal);
      if (version === requestVersion.current) { setConnectionChecked(true); setConnectionFailed(false); }
    } catch (reason) {
      if (version === requestVersion.current) { markConnectionFailure(reason); setError(reason instanceof Error ? reason.message : 'No se pudo probar Gemini.'); }
    } finally { if (version === requestVersion.current) setBusy(null); }
  };

  const showConnectionHelp = !checkingConfiguration && (configuration?.configured === false || connectionFailed);
  const suggestions = [
    { label: 'Avance de candidatos', question: '¿Cuántos candidatos hay y en qué etapas están?' },
    { label: 'Revisar el Top-N', question: '¿Qué falta para elegir el Top-N?' },
    { label: 'Criterios de evaluación', question: '¿Cuáles son los criterios y sus pesos?' },
  ];

  return <Drawer isOpen={isAssistantDrawerOpen} onClose={() => setAssistantDrawerOpen(false)}
    className="assistant-drawer" title="Asistente GTH · Gemini"
    subtitle={activeJob ? `${activeJob.code} · ${activeJob.title}` : 'Selecciona una convocatoria'} width="480px"
    footer={<form className="assistant-compose" onSubmit={(event) => { event.preventDefault(); void ask(question); }}>
      <label className="assistant-input-label" htmlFor="assistant-question">Pregunta al asistente</label>
      <div className="assistant-input-box">
        <textarea id="assistant-question" value={question} maxLength={2000} rows={2}
          placeholder="Pregunta sobre esta convocatoria…" disabled={Boolean(busy)}
          onChange={(event) => setQuestion(event.target.value)} onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); void ask(question); }
          }} />
        <Button type="submit" variant="primary" size="sm" className="assistant-send" icon={<Send size={17} />}
          aria-label="Enviar consulta" title="Enviar consulta"
          disabled={!question.trim() || question.length > 2000 || !configuration?.configured || Boolean(busy) || checkingConfiguration || !activeJob} />
      </div>
      <div className="assistant-compose-hint"><span>Enter para enviar · Shift + Enter para nueva línea</span><span>{question.length}/2000</span></div>
      <p className="assistant-sharing-notice"><ShieldCheck size={13} /> Compartes conversación, criterios y conteos con Google Gemini{includeCandidates ? ', además de nombres, etapas y puntajes de hasta 50 candidatos' : '. Sin nombres de candidatos'}.</p>
    </form>}>
    <div className={`assistant-content${showConnectionHelp ? ' assistant-disconnected' : ''}`}>
      <div className="assistant-toolbar">
        <div className="assistant-provider"><span className="assistant-provider-icon"><Bot size={18} /></span>
          <div><strong>Google Gemini</strong>
            <Badge size="sm" variant={connectionFailed ? 'warning' : connectionChecked ? 'success' : configuration?.configured ? 'info' : 'neutral'}>
              {checkingConfiguration ? 'Revisando…' : connectionFailed ? 'Sin conexión' : connectionChecked ? 'Conexión verificada' : configuration?.configured ? 'Clave configurada' : 'Pendiente de configurar'}
            </Badge></div>
        </div>
        <div className="assistant-toolbar-actions">
          <Button variant="ghost" size="sm" icon={<RotateCcw size={16} />} aria-label="Limpiar conversación" title="Limpiar conversación"
            disabled={Boolean(busy) || !messages.length} onClick={() => { setMessages([]); setQuestion(''); setError(''); }} />
          <Button variant="ghost" size="sm" icon={<SlidersHorizontal size={17} />} aria-label="Opciones del asistente" title="Opciones del asistente"
            aria-expanded={optionsOpen} aria-controls="assistant-options" onClick={() => setOptionsOpen(!optionsOpen)} />
        </div>
      </div>
      {optionsOpen && <section id="assistant-options" className="assistant-options" aria-label="Opciones del asistente">
        <p className="assistant-model">Modelo: {configuration?.model || 'Por confirmar'}</p>
        <div className="assistant-controls">
          <Button size="sm" variant="secondary" icon={<RefreshCw size={14} />} onClick={() => void refreshConfiguration()}
            disabled={Boolean(busy) || checkingConfiguration}>Actualizar estado</Button>
          <Button size="sm" variant="secondary" icon={<PlugZap size={14} />} onClick={() => void checkConnection()}
            disabled={Boolean(busy) || checkingConfiguration || !configuration?.configured}>Probar conexión</Button>
        </div>
        <label className="assistant-candidate-sharing"><input type="checkbox" checked={includeCandidates} disabled={Boolean(busy)} onChange={(event) => {
          setIncludeCandidates(event.target.checked); setMessages([]); setError('');
        }} /> Incluir nombres, etapas y puntajes de candidatos (hasta 50)</label>
        <p className="assistant-options-hint">Al cambiar esta opción se limpia la conversación.</p>
      </section>}
      {error && <p className="assistant-error" role="alert">{error}</p>}
      {showConnectionHelp && <section className="assistant-connection-help" aria-label="Ayuda de conexión">
        <details open={configuration?.configured === false} className="assistant-setup">
          <summary>{configuration?.configured === false ? 'Conectar Google Gemini' : 'Revisar conexión con Gemini'}</summary>
          <ol><li>Crea o copia tu clave en <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer">Google AI Studio</a>.</li>
            <li>En Vercel abre <strong>etapa_1 → Settings → Environment Variables</strong>.</li>
            <li>Añade <code>GEMINI_API_KEY</code>, pega la clave y guarda en <strong>Production</strong>.</li>
            <li>Para cambiar el modelo, configura <code>GEMINI_MODEL</code>. El predeterminado es <code>gemini-3.5-flash-lite</code>.</li>
            <li>Vuelve a desplegar <strong>ETAPA-I</strong> desde <strong>Deployments</strong> y actualiza el estado aquí.</li>
          </ol>
        </details>
        <Button size="sm" variant="secondary" icon={<RefreshCw size={14} />} onClick={() => void refreshConfiguration()}
          disabled={Boolean(busy) || checkingConfiguration}>Volver a revisar</Button>
      </section>}
      <div className="assistant-transcript" role="log" aria-label="Conversación con Gemini" aria-live="polite" aria-busy={Boolean(busy)}>
        {!messages.length && <div className="assistant-welcome">
          <div className="assistant-welcome-icon"><Bot size={28} /></div>
          <h3>¿Qué revisamos hoy?</h3>
          <p>Consulta el avance, los criterios y los resultados registrados de tu convocatoria.</p>
          <div className="assistant-suggestions">
            {suggestions.map((suggestion) => <button key={suggestion.label} type="button" className="assistant-suggestion"
              disabled={Boolean(busy) || checkingConfiguration || !configuration?.configured || !activeJob}
              onClick={() => { setQuestion(suggestion.question); void ask(suggestion.question); }}>
              <span>{suggestion.label}</span><ChevronRight size={15} />
            </button>)}
          </div>
        </div>}
        {messages.map((message) => <div key={message.id} className={`assistant-message ${message.role}`}>
          <span className="assistant-message-author">{message.role === 'user' ? 'Tú' : <><Bot size={12} /> Gemini</>}</span><p>{message.text}</p>
        </div>)}
        {busy && <div className="assistant-pending" role="status"><span className="assistant-thinking" aria-hidden="true"><i /><i /><i /></span>
          {busy === 'check' ? 'Probando conexión con Gemini…' : 'Gemini está preparando la respuesta…'}</div>}
        <div ref={transcriptEnd} />
      </div>
      <p className="assistant-review-note">Las respuestas orientan la revisión del equipo.</p>
    </div>
  </Drawer>;
}
