import { cn } from '../../lib/utils';

interface StatusBadgeProps {
  status: 'online' | 'offline' | 'unknown' | 'running' | 'stopped' | 'error' | 'partial';
  label?: string;
  labels?: Partial<Record<StatusBadgeProps['status'], string>>;
  size?: 'sm' | 'md';
}

const statusConfig = {
  online: { color: 'bg-green-500', text: 'text-green-400', label: 'En ligne' },
  running: { color: 'bg-green-500', text: 'text-green-400', label: 'Actif' },
  partial: { color: 'bg-yellow-500', text: 'text-yellow-400', label: 'Partiel' },
  offline: { color: 'bg-red-500', text: 'text-red-400', label: 'Hors ligne' },
  stopped: { color: 'bg-red-500', text: 'text-red-400', label: 'Arrete' },
  error: { color: 'bg-orange-500', text: 'text-orange-400', label: 'Erreur' },
  unknown: { color: 'bg-dark-500', text: 'text-dark-400', label: 'Inconnu' },
};

export function StatusBadge({ status, label, labels, size = 'md' }: StatusBadgeProps) {
  const config = statusConfig[status];
  const displayLabel = label || labels?.[status] || config.label;

  return (
    <div className={cn('flex items-center gap-2', size === 'sm' && 'gap-1.5')}>
      <span
        className={cn(
          'rounded-full animate-pulse',
          config.color,
          size === 'sm' ? 'w-2 h-2' : 'w-2.5 h-2.5'
        )}
      />
      <span
        className={cn(
          'font-medium',
          config.text,
          size === 'sm' ? 'text-xs' : 'text-sm'
        )}
      >
        {displayLabel}
      </span>
    </div>
  );
}
