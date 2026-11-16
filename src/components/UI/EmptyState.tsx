import React from 'react';
import { LucideIcon } from 'lucide-react';
import { cn } from '../../utils';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  className,
}) => {
  return (
    <div
      className={cn(
        'border border-dashed border-surface-border rounded-2xl p-12 text-center flex flex-col items-center justify-center bg-surface/30',
        className
      )}
    >
      <div className="w-14 h-14 rounded-2xl bg-surface-hover border border-surface-border flex items-center justify-center text-muted mb-4">
        <Icon className="w-7 h-7" />
      </div>
      <h3 className="text-base font-semibold text-slate-100 mb-1.5">{title}</h3>
      <p className="text-xs text-muted max-w-sm mb-6 leading-relaxed">{description}</p>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="px-4 py-2 bg-primary hover:bg-primary-hover text-white text-xs font-semibold rounded-xl transition-all shadow-sm shadow-primary/20"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
};
