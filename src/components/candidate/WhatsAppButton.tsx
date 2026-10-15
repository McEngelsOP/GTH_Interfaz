import React from 'react';
import { Button } from '../common/Button.tsx';
import type { Candidate } from '../../types/index.ts';
import { candidateWhatsappUrl } from '../../services/candidateContact.ts';

export function WhatsAppButton({ candidate, jobTitle, compact = false }: { candidate: Candidate; jobTitle: string; compact?: boolean }) {
  const url = candidateWhatsappUrl(candidate, jobTitle);
  return <span title={url ? 'Abre tu cuenta activa de WhatsApp con un mensaje editable. Revisa y envía desde WhatsApp.' : 'Sin celular registrado'}>
    <Button type="button" variant="ghost" size="sm" icon={<svg width={15} height={15} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false">
      <path d="M20.52 3.449A11.875 11.875 0 0 0 12.037 0C5.467 0 .12 5.346.117 11.916c0 2.1.549 4.15 1.589 5.96L0 24l6.335-1.652a11.94 11.94 0 0 0 5.698 1.448h.005c6.569 0 11.916-5.346 11.919-11.916a11.84 11.84 0 0 0-3.437-8.431ZM12.038 21.78h-.004a9.89 9.89 0 0 1-5.031-1.378l-.361-.214-3.759.985 1.003-3.665-.235-.376a9.87 9.87 0 0 1-1.512-5.216c.002-5.456 4.442-9.895 9.903-9.895a9.83 9.83 0 0 1 7.001 2.904 9.82 9.82 0 0 1 2.897 7.005c-.003 5.458-4.443 9.9-9.902 9.9Zm5.43-7.414c-.298-.149-1.762-.87-2.035-.969-.273-.099-.472-.149-.67.149-.199.298-.77.969-.944 1.168-.174.198-.348.223-.646.074-.298-.149-1.258-.464-2.396-1.479-.885-.789-1.482-1.764-1.656-2.062-.174-.298-.019-.459.13-.607.134-.133.298-.348.447-.522.149-.174.199-.298.298-.497.099-.198.05-.373-.025-.522-.074-.149-.67-1.615-.919-2.211-.242-.579-.487-.5-.67-.51-.174-.008-.373-.01-.571-.01-.199 0-.522.075-.795.373-.273.298-1.043 1.019-1.043 2.485 0 1.466 1.068 2.882 1.217 3.081.149.199 2.103 3.211 5.096 4.502.712.307 1.268.49 1.701.628.715.227 1.366.195 1.88.118.573-.085 1.762-.721 2.01-1.417.249-.696.249-1.292.174-1.417-.074-.124-.273-.198-.571-.347Z" />
    </svg>} disabled={!url}
      aria-label={url ? `Abrir WhatsApp para ${candidate.name}` : `Sin celular registrado para ${candidate.name}`}
      onClick={() => { if (url) window.open(url, '_blank', 'noopener,noreferrer'); }}>
      {compact ? undefined : url ? 'WhatsApp' : 'Sin celular registrado'}
    </Button>
  </span>;
}
