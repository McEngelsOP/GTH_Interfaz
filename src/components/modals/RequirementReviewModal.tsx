import { useState } from 'react';
import { useApp } from '../../context/AppContext.tsx';
import type { Application, RequirementStatus } from '../../types/index.ts';
import { Modal } from '../common/Modal.tsx';
import { Button } from '../common/Button.tsx';
export function RequirementReviewModal({ application, rule, onClose }: { application:Application; rule:string; onClose:()=>void }) {
  const { handleReviewRequirement } = useApp();
  const [status,setStatus] = useState<RequirementStatus>(application.mandatoryRequirementStatus);
  const [note,setNote] = useState(''), [error,setError] = useState('');
  const save = () => {
    try { handleReviewRequirement(application.id,status,note); onClose(); }
    catch (e) { setError(e instanceof Error ? e.message : 'No se pudo registrar la revisión.'); }
  };
  return <Modal isOpen onClose={onClose} title="Revisar requisito obligatorio" subtitle="Registro de revisión humana" footer={<><Button size="sm" onClick={onClose}>Cancelar</Button><Button size="sm" variant="primary" onClick={save} disabled={!note.trim()}>Guardar revisión</Button></>}>
    <p style={{ marginBottom:'1rem',fontSize:'.9rem' }}>{rule}</p>
    <p style={{ marginBottom:'1rem',fontSize:'.85rem',color:'var(--text-secondary)' }}>El CV declarado y el puntaje LLM no acreditan por sí solos el requisito. Registra la evidencia que revisaste y la fuente de verificación. Esta nota permanece en el navegador.</p>
    <label style={{ display:'block',marginBottom:'.8rem' }}>Estado del requisito<select aria-label="Estado del requisito" value={status} onChange={(e) => setStatus(e.target.value as RequirementStatus)} style={{ display:'block',width:'100%',padding:'.6rem',marginTop:'.4rem',background:'var(--bg-base)',color:'var(--text-primary)',border:'1px solid var(--border-default)',borderRadius:'var(--radius-sm)' }}>
      <option value="sin_verificar">Sin verificar</option><option value="parcial">Parcial</option><option value="verificado">Verificado</option><option value="no_cumple">No cumple</option></select></label>
    <label style={{ display:'block' }}>Evidencia o motivo de revisión<textarea aria-label="Evidencia o motivo de revisión" value={note} onChange={(e) => setNote(e.target.value)} maxLength={2000} rows={4} style={{ display:'block',width:'100%',padding:'.6rem',marginTop:'.4rem',background:'var(--bg-base)',color:'var(--text-primary)',border:'1px solid var(--border-default)',borderRadius:'var(--radius-sm)' }}/></label>
    {error && <p role="alert">{error}</p>}
  </Modal>;
}
