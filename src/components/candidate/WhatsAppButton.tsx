import React from 'react';
import { MessageCircle } from 'lucide-react';
import { Button } from '../common/Button.tsx';
import type { Candidate } from '../../types/index.ts';
import { candidateWhatsappUrl } from '../../services/candidateContact.ts';

export function WhatsAppButton({ candidate, jobTitle, compact = false }: { candidate: Candidate; jobTitle: string; compact?: boolean }) {
  const url = candidateWhatsappUrl(candidate, jobTitle);
  return <span title={url ? 'Abre tu cuenta activa de WhatsApp con un mensaje editable. Revisa y envía desde WhatsApp.' : 'Sin celular registrado'}>
    <Button type="button" variant="ghost" size="sm" icon={<MessageCircle size={15} />} disabled={!url}
      aria-label={url ? `Abrir WhatsApp para ${candidate.name}` : `Sin celular registrado para ${candidate.name}`}
      onClick={() => { if (url) window.open(url, '_blank', 'noopener,noreferrer'); }}>
      {compact ? undefined : url ? 'WhatsApp' : 'Sin celular registrado'}
    </Button>
  </span>;
}
