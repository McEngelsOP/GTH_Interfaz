import React, { InputHTMLAttributes, forwardRef, ReactNode } from 'react';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helperText?: string;
  error?: string;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, helperText, error, leftIcon, rightIcon, id, className = '', style, ...props }, ref) => {
    const inputId = id || (label ? `input-${label.toLowerCase().replace(/\s+/g, '-')}` : undefined);

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', width: '100%' }}>
        {label && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <label
              htmlFor={inputId}
              style={{
                fontSize: '0.8125rem',
                fontWeight: 600,
                color: 'var(--text-primary)',
              }}
            >
              {label}
              {props.required && <span style={{ color: 'var(--primary-red)', marginLeft: '0.2rem' }}>*</span>}
            </label>
            {error && (
              <span style={{ fontSize: '0.75rem', color: '#DC2626', fontWeight: 500 }}>
                {error}
              </span>
            )}
          </div>
        )}

        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', width: '100%' }}>
          {leftIcon && (
            <span
              style={{
                position: 'absolute',
                left: '0.75rem',
                color: 'var(--text-muted)',
                display: 'flex',
                alignItems: 'center',
                pointerEvents: 'none',
              }}
            >
              {leftIcon}
            </span>
          )}

          <input
            id={inputId}
            ref={ref}
            style={{
              width: '100%',
              padding: leftIcon ? '0.5rem 0.75rem 0.5rem 2.25rem' : rightIcon ? '0.5rem 2.25rem 0.5rem 0.75rem' : '0.5rem 0.75rem',
              fontSize: '0.875rem',
              color: 'var(--text-primary)',
              backgroundColor: 'var(--bg-surface)',
              border: `1px solid ${error ? '#DC2626' : 'var(--border-default)'}`,
              borderRadius: 'var(--radius-sm)',
              boxShadow: 'var(--shadow-sm)',
              outline: 'none',
              transition: 'all var(--transition-fast)',
              ...style,
            }}
            className={`focus-ring ${className}`}
            {...props}
          />

          {rightIcon && (
            <span
              style={{
                position: 'absolute',
                right: '0.75rem',
                color: 'var(--text-muted)',
                display: 'flex',
                alignItems: 'center',
                pointerEvents: 'none',
              }}
            >
              {rightIcon}
            </span>
          )}
        </div>

        {helperText && !error && (
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{helperText}</span>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
