import React, { SelectHTMLAttributes, forwardRef } from 'react';

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: SelectOption[];
  helperText?: string;
  error?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, options, helperText, error, id, className = '', style, ...props }, ref) => {
    const selectId = id || (label ? `select-${label.toLowerCase().replace(/\s+/g, '-')}` : undefined);

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', width: '100%' }}>
        {label && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <label
              htmlFor={selectId}
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

        <select
          id={selectId}
          ref={ref}
          style={{
            width: '100%',
            padding: '0.5rem 0.75rem',
            fontSize: '0.875rem',
            color: 'var(--text-primary)',
            backgroundColor: 'var(--bg-surface)',
            border: `1px solid ${error ? '#DC2626' : 'var(--border-default)'}`,
            borderRadius: 'var(--radius-sm)',
            boxShadow: 'var(--shadow-sm)',
            outline: 'none',
            cursor: 'pointer',
            transition: 'all var(--transition-fast)',
            ...style,
          }}
          className={`focus-ring ${className}`}
          {...props}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        {helperText && !error && (
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{helperText}</span>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';
