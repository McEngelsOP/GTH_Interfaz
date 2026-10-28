import React, { ReactNode } from 'react';

export interface BadgeProps {
  children: ReactNode;
  variant?: 'neutral' | 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'purple';
  size?: 'xs' | 'sm' | 'md';
  icon?: ReactNode;
  className?: string;
  title?: string;
}

export function Badge({
  children,
  variant = 'neutral',
  size = 'md',
  icon,
  className = '',
  title,
}: BadgeProps) {
  const baseStyles: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.35rem',
    borderRadius: 'var(--radius-full)',
    fontWeight: 500,
    lineHeight: 1,
    whiteSpace: 'nowrap',
    border: '1px solid transparent',
  };

  const sizeStyles: Record<string, React.CSSProperties> = {
    xs: {
      padding: '0.15rem 0.4rem',
      fontSize: '0.6875rem',
      gap: '0.25rem',
    },
    sm: {
      padding: '0.2rem 0.5rem',
      fontSize: '0.75rem',
    },
    md: {
      padding: '0.3rem 0.65rem',
      fontSize: '0.8125rem',
    },
  };

  const variantStyles: Record<string, React.CSSProperties> = {
    neutral: {
      backgroundColor: 'var(--bg-muted)',
      color: 'var(--text-secondary)',
      borderColor: 'var(--border-subtle)',
    },
    primary: {
      backgroundColor: 'var(--primary-red-subtle)',
      color: 'var(--primary-red)',
      borderColor: 'var(--primary-red-border)',
    },
    success: {
      backgroundColor: 'var(--status-verified-bg)',
      color: 'var(--status-verified-text)',
      borderColor: 'var(--status-verified-border)',
    },
    warning: {
      backgroundColor: 'var(--status-partial-bg)',
      color: 'var(--status-partial-text)',
      borderColor: 'var(--status-partial-border)',
    },
    danger: {
      backgroundColor: 'var(--status-failed-bg)',
      color: 'var(--status-failed-text)',
      borderColor: 'var(--status-failed-border)',
    },
    info: {
      backgroundColor: 'var(--info-bg)',
      color: 'var(--info-color)',
      borderColor: 'rgba(3, 105, 161, 0.2)',
    },
    purple: {
      backgroundColor: 'var(--method-llm-bg)',
      color: 'var(--method-llm-color)',
      borderColor: 'rgba(109, 40, 217, 0.2)',
    },
  };

  return (
    <span
      style={{
        ...baseStyles,
        ...sizeStyles[size],
        ...variantStyles[variant],
      }}
      className={className}
      title={title}
    >
      {icon && <span style={{ display: 'flex', alignItems: 'center' }}>{icon}</span>}
      <span>{children}</span>
    </span>
  );
}
