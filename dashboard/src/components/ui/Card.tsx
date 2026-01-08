import type { ReactNode } from 'react';
import { cn } from '../../lib/utils';

interface CardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
  onClick?: () => void;
}

export function Card({ children, className, hover, onClick }: CardProps) {
  return (
    <div
      className={cn(
        'card',
        hover && 'card-hover cursor-pointer',
        className
      )}
      onClick={onClick}
    >
      {children}
    </div>
  );
}

interface CardHeaderProps {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}

export function CardHeader({ title, subtitle, action }: CardHeaderProps) {
  return (
    <div className="flex items-start justify-between mb-4">
      <div>
        <h3 className="text-lg font-semibold text-dark-100">{title}</h3>
        {subtitle && <p className="text-sm text-dark-400 mt-0.5">{subtitle}</p>}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}
