import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: ReactNode;
  children?: ReactNode;
}

const variants = {
  primary: 'btn-primary',
  secondary: 'btn-secondary',
  danger: 'btn-danger',
  ghost: 'hover:bg-dark-800 text-dark-300 hover:text-dark-100',
};

const sizes = {
  sm: 'py-1.5 px-3 text-sm',
  md: 'py-2 px-4',
  lg: 'py-2.5 px-6 text-lg',
};

export function Button({
  variant = 'primary',
  size = 'md',
  loading,
  icon,
  children,
  className,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-2 font-medium rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed',
        variants[variant],
        sizes[size],
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <Loader2 size={18} className="animate-spin" />
      ) : (
        icon && <span className="flex-shrink-0">{icon}</span>
      )}
      {children}
    </button>
  );
}
