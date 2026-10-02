import React, { useEffect, useRef, useState } from 'react';
import { useApp } from '../../context/AppContext.tsx';
import { Drawer } from '../common/Drawer.tsx';
import { Button } from '../common/Button.tsx';
import { Badge } from '../common/Badge.tsx';
import { Bot, Send, RotateCcw, PlugZap, RefreshCw } from 'lucide-react';
import { askAssistant, AssistantConfiguration, AssistantMessage, buildAssistantContext, getAssistantConfiguration, testAssistantConnection } from '../../services/assistantService.ts';
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
  const controller = useRef<AbortController | null>(null);
  const requestVersion = useRef(0);
  const transcriptEnd = useRef<HTMLDivElement>(null);

  const cancelRequest = () => { requestVersion.current++; controller.current?.abort(); controller.current = null; };
  const refreshConfiguration = async () => {
    cancelRequest();
    const version = requestVersion.current, abort = new AbortController(); controller.current = abort;
    setCheckingConfiguration(true); setError(''); setConnectionChecked(false);
    try {
      const config = await getAssistantConfiguration(abort.signal);
      if (version === requestVersion.current) setConfiguration(config);
    } catch (reason) {
      if (version === requestVersion.current) { setConfiguration(null); setError(reason instanceof Error ? reason.message : 'No se pudo revisar Gemini.'); }
    } finally { if (version === requestVersion.current) setCheckingConfiguration(false); }
  };

  useEffect(() => {
    setMessages([]); setQuestion(''); setIncludeCandidates(false); setError(''); setConnectionChecked(false);
  }, [activeJob?.id]);
  useEffect(() => {
    if (isAssistantDrawerOpen) void refreshConfiguration();
    return () => { cancelRequest(); setBusy(null); setCheckingConfiguration(false); };
  }, [isAssistantDrawerOpen, activeJob?.id]);
  useEffect(() => { transcriptEnd.current?.scrollIntoView({ behavior: 'auto', block: 'end' }); }, [messages, busy]);

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
      setQuestion(''); setConnectionChecked(true);
    } catch (reason) {
      if (version === requestVersion.current) { setQuestion(snapshot); setError(reason instanceof Error ? reason.message : 'No se pudo responder la consulta.'); }
    } finally { if (version === requestVersion.current) setBusy(null); }
  };

  const checkConnection = async () => {
    if (busy || checkingConfiguration || !configuration?.configured) return;
    cancelRequest();
    const version = requestVersion.current, abort = new AbortController(); controller.current = abort;
    setBusy('check'); setError(''); setConnectionChecked(false);
    try {
      await testAssistantConnection(abort.signal);
      if (version === requestVersion.current) setConnectionChecked(true);
    } catch (reason) {
      if (version === requestVersion.current) setError(reason instanceof Error ? reason.message : 'No se pudo probar Gemini.');
    } finally { if (version === requestVersion.current) setBusy(null); }
  };

  return <Drawer isOpen={isAssistantDrawerOpen} onClose={() => setAssistantDrawerOpen(false)}
    title="Asistente GTH · Gemini" subtitle={activeJob ? `${activeJob.code} · ${activeJob.title}` : 'Selecciona una convocatoria'} width="500px"
    footer={<form className="assistant-compose" onSubmit={(event) => { event.preventDefault(); void ask(question); }}>
      <label htmlFor="assistant-question">Pregunta al asistente</label>
      <textarea id="assistant-question" value={question} maxLength={2000} rows={2}
        placeholder="Escribe tu consulta sobre esta convocatoria…" disabled={Boolean(busy)}
        onChange={(event) => setQuestion(event.target.value)} onKeyDown={(event) => {
          if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); void ask(question); }
        }} />
      <div className="assistant-compose-actions"><span>Enter para enviar · Shift + Enter para nueva línea</span>
        <Button type="submit" variant="primary" size="sm" icon={<Send size={15} />}
          disabled={!question.trim() || !configuration?.configured || Boolean(busy) || checkingConfiguration || !activeJob}>Enviar consulta</Button></div>
    </form>}>
    <div className="assistant-content">
      <div className="assistant-configuration">
        <div className="assistant-configuration-heading"><strong>Google Gemini</strong>
          <Badge size="sm" variant={connectionChecked ? 'success' : configuration?.configured ? 'info' : 'neutral'}>
            {checkingConfiguration ? 'Revisando…' : connectionChecked ? 'Conexión verificada' : configuration?.configured ? 'Clave configurada' : 'Pendiente de configurar'}
          </Badge></div>
        <p>{configuration?.configured ? `Modelo: ${configuration.model}` : 'Configura tu clave API en Vercel para activar las respuestas.'}</p>
        <div className="assistant-controls">
          <Button size="sm" variant="secondary" icon={<RefreshCw size={14} />} onClick={() => void refreshConfiguration()}
            disabled={Boolean(busy) || checkingConfiguration}>Actualizar estado</Button>
          <Button size="sm" variant="secondary" icon={<PlugZap size={14} />} onClick={() => void checkConnection()}
            disabled={Boolean(busy) || checkingConfiguration || !configuration?.configured}>Probar conexión</Button>
        </div>
        <details open={configuration?.configured === false} className="assistant-setup"><summary>Configurar Gemini</summary>
          <ol><li>Crea o copia tu clave en <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer">Google AI Studio</a>.</li>
            <li>En Vercel abre <strong>etapa_1 → Settings → Environment Variables</strong>.</li>
            <li>Añade <code>GEMINI_API_KEY</code> y pega la clave como valor. Selecciona <strong>Production</strong> y guarda.</li>
            <li>El modelo predeterminado es <code>gemini-3.5-flash-lite</code>. Para cambiarlo añade <code>GEMINI_MODEL</code>.</li>
            <li>En <strong>Deployments</strong>, vuelve a desplegar la versión de <strong>ETAPA-I</strong>. Después pulsa <strong>Actualizar estado</strong> y <strong>Probar conexión</strong>.</li>
          </ol></details>
      </div>
      <div className="assistant-sharing">
        <p>Al enviar compartes con Google Gemini la conversación, los criterios y los conteos de esta convocatoria.</p>
        <label><input type="checkbox" checked={includeCandidates} disabled={Boolean(busy)} onChange={(event) => {
          setIncludeCandidates(event.target.checked); setMessages([]); setError('');
        }} /> Incluir nombres, etapas y puntajes de candidatos (hasta 50)</label>
      </div>
      {error && <p className="assistant-error" role="alert">{error}</p>}
      <div className="assistant-transcript" role="log" aria-label="Conversación con Gemini" aria-live="polite" aria-busy={Boolean(busy)}>
        {!messages.length && <div className="assistant-welcome"><Bot size={22} />
          <p>Consulta sobre los criterios, el avance y los resultados registrados de esta convocatoria. Las respuestas orientan la revisión del equipo.</p></div>}
        {messages.map((message) => <div key={message.id} className={`assistant-message ${message.role}`}>
          <span>{message.role === 'user' ? 'Tú' : 'Gemini'}</span><p>{message.text}</p>
        </div>)}
        {busy && <p className="assistant-pending" role="status">{busy === 'check' ? 'Probando conexión con Gemini…' : 'Gemini está preparando la respuesta…'}</p>}
        <div ref={transcriptEnd} />
      </div>
      <div className="assistant-suggestions">
        {['¿Cuántos candidatos hay y en qué etapas están?', '¿Qué falta para elegir el Top-N?', '¿Cuáles son los criterios y sus pesos?'].map((suggestion) =>
          <button key={suggestion} type="button" className="assistant-suggestion" disabled={Boolean(busy) || checkingConfiguration || !configuration?.configured || !activeJob}
            onClick={() => { setQuestion(suggestion); void ask(suggestion); }}>{suggestion}</button>)}
        <Button variant="ghost" size="sm" icon={<RotateCcw size={14} />} disabled={Boolean(busy) || !messages.length}
          onClick={() => { setMessages([]); setQuestion(''); setError(''); }}>Limpiar conversación</Button>
      </div>
    </div>
  </Drawer>;
}
