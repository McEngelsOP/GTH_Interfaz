import React, { useRef, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useDialog } from './useDialog.ts';
import { X } from 'lucide-react';

export interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title?: ReactNode;
  subtitle?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  width?: string;
  position?: 'right' | 'left';
  className?: string;
}

export function Drawer({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  footer,
  width = '580px',
  position = 'right',
  className,
}: DrawerProps) {
  const drawerRef = useRef<HTMLDivElement>(null);

  useDialog(isOpen, drawerRef, onClose);

  if (!isOpen) return null;

  return createPortal(
    <div
      className={className}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1040,
        display: 'flex',
        justifyContent: position === 'right' ? 'flex-end' : 'flex-start',
        backgroundColor: 'rgba(15, 20, 28, 0.55)',
        backdropFilter: 'blur(2px)',
        animation: 'fadeIn 160ms cubic-bezier(0.16, 1, 0.3, 1)',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="drawer-panel"
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === 'string' ? title : 'Ficha del candidato'}
        tabIndex={-1}
        style={{
          width: '100%',
          maxWidth: width,
          height: '100dvh',
          backgroundColor: 'var(--bg-surface)',
          boxShadow: 'var(--shadow-drawer)',
          borderLeft: position === 'right' ? '1px solid var(--border-default)' : 'none',
          borderRight: position === 'left' ? '1px solid var(--border-default)' : 'none',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          animation: 'slideInRight 200ms cubic-bezier(0.16, 1, 0.3, 1)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera del Drawer */}
        {(title || subtitle) && (
          <div
            className="drawer-header"
            style={{
              padding: '1.25rem 1.5rem',
              borderBottom: '1px solid var(--border-subtle)',
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              gap: '1rem',
              backgroundColor: 'var(--bg-surface)',
            }}
          >
            <div style={{ flex: 1 }}>
              {typeof title === 'string' ? (
                <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>{title}</h2>
              ) : (
                title
              )}
              {subtitle && (
                <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                  {subtitle}
                </div>
              )}
            </div>
            <button
              onClick={onClose}
              aria-label="Cerrar panel"
              className="focus-ring"
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--text-muted)',
                padding: '0.35rem',
                borderRadius: 'var(--radius-sm)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <X size={20} />
            </button>
          </div>
        )}

        {/* Contenido desplazable */}
        <div
          className="drawer-body"
          style={{
            flex: 1,
            minHeight: 0,
            overflowY: 'auto',
            padding: '1.5rem',
          }}
        >
          {children}
        </div>

        {/* Pie con acciones */}
        {footer && (
          <div
            className="drawer-footer"
            style={{
              padding: '1.25rem 1.5rem',
              borderTop: '1px solid var(--border-subtle)',
              backgroundColor: 'var(--bg-base)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '1rem',
            }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>, document.body
  );
}

