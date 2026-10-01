import React from 'react';
import { useApp } from '../../context/AppContext.tsx';
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';

export function ToastContainer() {
  const { toasts, removeToast } = useApp();

  if (toasts.length === 0) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '1.25rem',
        right: '1.25rem',
        zIndex: 1100,
        display: 'flex',
        flexDirection: 'column',
        gap: '0.65rem',
        maxWidth: '420px',
        width: 'calc(100vw - 2.5rem)',
        pointerEvents: 'none',
      }}
    >
      {toasts.map((toast) => {
        const icons = {
          success: <CheckCircle2 size={18} style={{ color: '#16A34A', flexShrink: 0 }} />,
          warning: <AlertTriangle size={18} style={{ color: '#D97706', flexShrink: 0 }} />,
          error: <AlertCircle size={18} style={{ color: '#DC2626', flexShrink: 0 }} />,
          info: <Info size={18} style={{ color: '#0284C7', flexShrink: 0 }} />,
        };

        return (
          <div
            key={toast.id}
            role="status"
            aria-live="polite"
            style={{
              pointerEvents: 'auto',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.75rem',
              padding: '0.85rem 1rem',
              backgroundColor: 'var(--bg-surface)',
              borderRadius: 'var(--radius-md)',
              boxShadow: 'var(--shadow-lg)',
              border: '1px solid var(--border-default)',
              animation: 'slideUp 180ms cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          >
            {icons[toast.type]}
            <div style={{ flex: 1, fontSize: '0.84rem', color: 'var(--text-primary)', lineHeight: 1.4 }}>
              {toast.message}
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="focus-ring"
              aria-label="Cerrar notificación"
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                padding: '0.2rem',
                display: 'flex',
                borderRadius: 'var(--radius-sm)',
              }}
            >
              <X size={15} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
