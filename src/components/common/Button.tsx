import React, { ButtonHTMLAttributes, ReactNode } from 'react';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  icon?: ReactNode;
  iconPosition?: 'left' | 'right';
  children?: ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'secondary',
      size = 'md',
      icon,
      iconPosition = 'left',
      children,
      className = '',
      disabled,
      ...props
    },
    ref
  ) => {
    const baseStyles: React.CSSProperties = {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '0.5rem',
      fontWeight: 500,
      borderRadius: 'var(--radius-sm)',
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.55 : 1,
      transition: 'background-color var(--transition-fast), color var(--transition-fast), border-color var(--transition-fast), opacity var(--transition-fast), transform var(--transition-fast)',
      border: '1px solid transparent',
      textDecoration: 'none',
      whiteSpace: 'nowrap',
    };

    const sizeStyles: Record<string, React.CSSProperties> = {
      sm: {
        padding: '0.35rem 0.75rem',
        fontSize: '0.8125rem',
        minHeight: '34px',
      },
      md: {
        padding: '0.5rem 1rem',
        fontSize: '0.875rem',
        minHeight: '40px',
      },
      lg: {
        padding: '0.75rem 1.35rem',
        fontSize: '1rem',
        minHeight: '46px',
      },
    };

    const variantStyles: Record<string, React.CSSProperties> = {
      primary: {
        backgroundColor: 'var(--primary-red)',
        color: '#FFFFFF',
        borderColor: 'var(--primary-red)',
        boxShadow: '0 1px 2px rgba(183, 25, 54, 0.2)',
      },
      secondary: {
        backgroundColor: 'var(--bg-surface)',
        color: 'var(--text-primary)',
        borderColor: 'var(--border-default)',
        boxShadow: 'var(--shadow-sm)',
      },
      outline: {
        backgroundColor: 'transparent',
        color: 'var(--primary-red)',
        borderColor: 'var(--primary-red)',
      },
      ghost: {
        backgroundColor: 'transparent',
        color: 'var(--text-secondary)',
        borderColor: 'transparent',
      },
      danger: {
        backgroundColor: '#DC2626',
        color: '#FFFFFF',
        borderColor: '#DC2626',
      },
    };

    const { style: customStyle, ...restProps } = props;

    return (
      <button
        ref={ref}
        disabled={disabled}
        style={{
          ...baseStyles,
          ...sizeStyles[size],
          ...variantStyles[variant],
          ...customStyle,
        }}
        className={`ui-button ui-button-${variant} focus-ring ${className}`}
        {...restProps}
      >
        {icon && iconPosition === 'left' && <span style={{ display: 'flex' }}>{icon}</span>}
        {children && <span>{children}</span>}
        {icon && iconPosition === 'right' && <span style={{ display: 'flex' }}>{icon}</span>}
      </button>
    );
  }
);

Button.displayName = 'Button';
