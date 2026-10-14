import React, { useState } from 'react';
import { ExternalLink, FileX2, Loader2 } from 'lucide-react';
import { Modal } from '../common/Modal.tsx';
import type { CvPersonal } from '../../services/bumeranSync.ts';

/** Muestra el CV personal (PDF o Word) que el postulante adjuntó en Bumeran, desde Google Drive. */
export function VisorCV({ nombre, cv, onClose }: { nombre: string | null; cv: CvPersonal | null; onClose: () => void }) {
  const [cargando, setCargando] = useState(true);
  const candidate = nombre ? { name: nombre } : null;
  cv = cv || { estado: 'pendiente', enlace: null, vista: null };
  return (
    <Modal isOpen={Boolean(candidate)} onClose={() => { setCargando(true); onClose(); }} maxWidth="1000px"
      title={`CV personal · ${candidate?.name || ''}`}
      subtitle={cv.estado === 'disponible' ? 'Documento adjuntado por el postulante en Bumeran' : undefined}
      footer={cv.enlace ? (
        <a href={cv.enlace} target="_blank" rel="noreferrer" className="conv-enlace focus-ring">
          <ExternalLink size={14} /> Abrir en una pestaña nueva
        </a>
      ) : undefined}>
      {cv.vista ? (
        <div style={{ position: 'relative', height: '72vh', borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid var(--border-subtle)', background: 'var(--bg-base)' }}>
          {cargando && <div role="status" style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: '.5rem', color: 'var(--text-secondary)', fontSize: '.875rem' }}><Loader2 size={18} className="spin" /> Cargando documento…</div>}
          <iframe key={cv.vista} src={cv.vista} title={`CV de ${candidate?.name || 'postulante'}`} allow="autoplay"
            onLoad={() => setCargando(false)} style={{ width: '100%', height: '100%', border: 0, position: 'relative' }} />
        </div>
      ) : (
        <div role="status" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '.6rem', padding: '2.5rem 1rem', textAlign: 'center' }}>
          <FileX2 size={34} style={{ color: 'var(--text-muted)' }} />
          <strong style={{ color: 'var(--text-primary)' }}>
            {cv.estado === 'sin_adjunto' ? 'Este postulante no adjuntó un CV personal en Bumeran.' : 'El CV personal todavía no está disponible.'}
          </strong>
          <span style={{ fontSize: '.84rem', color: 'var(--text-secondary)', maxWidth: '52ch' }}>
            {cv.estado === 'sin_adjunto'
              ? 'Su información de experiencia y estudios está en «Detalles».'
              : 'Se mostrará cuando el proceso de extracción suba su CV a Google Drive. Puedes revisar su perfil en «Detalles».'}
          </span>
        </div>
      )}
    </Modal>
  );
}
