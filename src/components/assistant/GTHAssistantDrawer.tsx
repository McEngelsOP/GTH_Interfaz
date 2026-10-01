import React, { useState } from 'react';
import { useApp } from '../../context/AppContext.tsx';
import { Drawer } from '../common/Drawer.tsx';
import { Button } from '../common/Button.tsx';
import { Badge } from '../common/Badge.tsx';
import {
  Sparkles,
  Send,
  Info,
  ShieldCheck,
  User,
  Bot,
  HelpCircle,
  ExternalLink,
  RotateCcw,
} from 'lucide-react';

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  candidateIds?: string[];
  timestamp: string;
}

export function GTHAssistantDrawer() {
  const {
    isAssistantDrawerOpen,
    setAssistantDrawerOpen,
    activeJob,
    activeJobApplications,
    appState,
    setSelectedCandidateId,
    setCandidateDrawerOpen,
  } = useApp();

  const [inputQuestion, setInputQuestion] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      text: '¡Hola! Soy el asistente de demostración de TalentAI · GTH ESAN. Puedo ayudarte a responder consultas sobre los candidatos y requisitos de la convocatoria activa basándome en los datos estructurados en memoria.',
      timestamp: 'Ahora',
    },
  ]);

  // Preguntas sugeridas contextuales según la convocatoria activa
  const suggestedQuestions = [
    '¿Quiénes son los candidatos con mayor Score ML?',
    '¿Quiénes cumplen el requisito obligatorio?',
    '¿Cuántos candidatos se encuentran preseleccionados?',
    '¿Cuáles son las ponderaciones de esta convocatoria?',
  ];

  const handleAsk = (questionText: string) => {
    if (!questionText.trim()) return;

    const userMsg: ChatMessage = {
      id: String(Date.now()),
      sender: 'user',
      text: questionText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    // Procesamiento contextual inteligente en memoria
    let assistantReply = '';
    let linkedCandidates: string[] = [];

    const q = questionText.toLowerCase();

    if (!activeJob) {
      assistantReply = 'Por favor selecciona primero una convocatoria activa para poder consultar candidatos y criterios.';
    } else if (q.includes('score ml') || q.includes('mayor score') || q.includes('mejores ml')) {
      const sortedByML = [...activeJobApplications]
        .filter((a) => a.mlScore !== null)
        .sort((a, b) => (b.mlScore || 0) - (a.mlScore || 0))
        .slice(0, 3);

      if (sortedByML.length === 0) {
        assistantReply = 'No hay candidatos con puntaje ML calculado en esta convocatoria.';
      } else {
        const lines = sortedByML.map((a, i) => {
          const cand = appState.candidates.find((c) => c.id === a.candidateId);
          return `${i + 1}. ${cand?.name || 'Candidato'} — Score ML: ${a.mlScore}/100`;
        });
        assistantReply = `Los 3 candidatos con mayor Score ML para ${activeJob.code} son:\n${lines.join('\n')}`;
        linkedCandidates = sortedByML.map((a) => a.candidateId);
      }
    } else if (q.includes('requisito obligatorio') || q.includes('knockout') || q.includes('cumplen')) {
      const compliant = activeJobApplications.filter((a) => a.mandatoryRequirementStatus === 'verificado');
      assistantReply = `Para la convocatoria ${activeJob.code}, el requisito obligatorio es: "${activeJob.knockoutRule}".\nActualmente, ${compliant.length} de ${activeJobApplications.length} postulantes cumplen plenamente con esta condición.`;
      linkedCandidates = compliant.slice(0, 4).map((a) => a.candidateId);
    } else if (q.includes('preseleccionado') || q.includes('etapa') || q.includes('avance')) {
      const preselected = activeJobApplications.filter((a) => a.stage === 'preseleccionado');
      assistantReply = `En la convocatoria ${activeJob.code}, hay actualmente ${preselected.length} candidato(s) en etapa "Preseleccionado".`;
      linkedCandidates = preselected.map((a) => a.candidateId);
    } else if (q.includes('ponderacion') || q.includes('criterio') || q.includes('pesos')) {
      const critLines = activeJob.criteria.map((c) => `• ${c.label} (${c.type}): ${c.weightPct}%`);
      assistantReply = `Los criterios de evaluación de la versión ${activeJob.criteriaVersion} para ${activeJob.code} son:\n${critLines.join('\n')}\n(Total: 100%)`;
    } else {
      assistantReply = `He consultado los registros de ${activeJob.code}: Hay ${activeJobApplications.length} candidatos registrados. Puedes consultar sobre puntajes ML/LLM, cumplimiento de requisitos knockout o candidatos preseleccionados.`;
    }

    const assistantMsg: ChatMessage = {
      id: String(Date.now() + 1),
      sender: 'assistant',
      text: assistantReply,
      candidateIds: linkedCandidates.length > 0 ? linkedCandidates : undefined,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setInputQuestion('');
  };

  const handleOpenCandidate = (candidateId: string) => {
    setSelectedCandidateId(candidateId);
    setCandidateDrawerOpen(true);
  };

  return (
    <Drawer
      isOpen={isAssistantDrawerOpen}
      onClose={() => setAssistantDrawerOpen(false)}
      title="Asistente de Consulta · TalentAI"
      subtitle={activeJob ? `Convocatoria: ${activeJob.code} · ${activeJob.title}` : 'Sin convocatoria activa'}
      width="460px"
    >
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '1rem' }}>
        {/* Banner de Honestidad Técnica (Sección 21 de la especificación) */}
        <div
          style={{
            padding: '0.75rem 0.85rem',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'var(--bg-base)',
            border: '1px solid var(--border-subtle)',
            fontSize: '0.78rem',
            color: 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '0.65rem',
            lineHeight: 1.45,
          }}
        >
          <Info size={16} style={{ color: 'var(--accent-gold)', flexShrink: 0, marginTop: '0.1rem' }} />
          <div>
            <strong>Asistente de demostración · Sin conexión a IA externa:</strong> Responde en base a las reglas y
            datos estructurados cargados en memoria. No realiza llamadas de red ni envía datos a proveedores de LLM.
          </div>
        </div>

        {/* Historial de Mensajes */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.85rem',
            paddingRight: '0.25rem',
          }}
        >
          {messages.map((msg) => (
            <div
              key={msg.id}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: msg.sender === 'user' ? 'flex-end' : 'flex-start',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  fontSize: '0.72rem',
                  color: 'var(--text-muted)',
                  marginBottom: '0.25rem',
                }}
              >
                {msg.sender === 'user' ? (
                  <>
                    <span>Tú</span>
                    <User size={12} />
                  </>
                ) : (
                  <>
                    <Bot size={12} style={{ color: 'var(--primary-red)' }} />
                    <span>Asistente TalentAI</span>
                  </>
                )}
                <span>· {msg.timestamp}</span>
              </div>

              <div
                style={{
                  maxWidth: '90%',
                  padding: '0.75rem 0.85rem',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor:
                    msg.sender === 'user' ? 'var(--primary-red)' : 'var(--bg-surface)',
                  color: msg.sender === 'user' ? '#FFFFFF' : 'var(--text-primary)',
                  border: msg.sender === 'user' ? 'none' : '1px solid var(--border-default)',
                  fontSize: '0.8125rem',
                  lineHeight: 1.5,
                  whiteSpace: 'pre-wrap',
                  boxShadow: 'var(--shadow-sm)',
                }}
              >
                {msg.text}

                {/* Enlaces directos a expedientes de candidatos */}
                {msg.candidateIds && msg.candidateIds.length > 0 && (
                  <div
                    style={{
                      marginTop: '0.65rem',
                      paddingTop: '0.5rem',
                      borderTop: '1px solid var(--border-subtle)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.35rem',
                    }}
                  >
                    <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                      Candidatos referenciados:
                    </span>
                    {msg.candidateIds.map((cid) => {
                      const cand = appState.candidates.find((c) => c.id === cid);
                      if (!cand) return null;
                      return (
                        <button
                          key={cid}
                          type="button"
                          onClick={() => handleOpenCandidate(cid)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            backgroundColor: 'var(--bg-base)',
                            border: '1px solid var(--border-subtle)',
                            padding: '0.35rem 0.6rem',
                            borderRadius: 'var(--radius-sm)',
                            fontSize: '0.75rem',
                            color: 'var(--primary-red)',
                            fontWeight: 600,
                            cursor: 'pointer',
                            textAlign: 'left',
                          }}
                        >
                          <span>{cand.name}</span>
                          <ExternalLink size={12} />
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Preguntas Sugeridas */}
        <div>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
            Preguntas sugeridas:
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
            {suggestedQuestions.map((q, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleAsk(q)}
                style={{
                  fontSize: '0.72rem',
                  padding: '0.35rem 0.55rem',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'var(--bg-base)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-primary)',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                {q}
              </button>
            ))}
          </div>
        </div>

        {/* Input de Pregunta */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleAsk(inputQuestion);
          }}
          style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}
        >
          <input
            type="text"
            placeholder="Haz una consulta sobre la convocatoria..."
            value={inputQuestion}
            onChange={(e) => setInputQuestion(e.target.value)}
            className="focus-ring"
            style={{
              flex: 1,
              padding: '0.6rem 0.75rem',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-default)',
              backgroundColor: 'var(--bg-surface)',
              color: 'var(--text-primary)',
              fontSize: '0.84rem',
            }}
          />
          <Button
            type="submit"
            variant="primary"
            size="sm"
            icon={<Send size={14} />}
            disabled={!inputQuestion.trim()}
          >
            Enviar
          </Button>
        </form>
      </div>
    </Drawer>
  );
}
