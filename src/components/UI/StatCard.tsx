import React from 'react';
import { StatItem } from '../../types';
import { ArrowUpRight, TrendingUp } from 'lucide-react';
import { cn } from '../../utils';

interface StatCardProps {
  stat: StatItem;
  icon?: React.ReactNode;
}

export const StatCard: React.FC<StatCardProps> = ({ stat, icon }) => {
  return (
    <div className="bg-surface border border-surface-border rounded-xl p-5 hover:border-surface-border/80 transition-all">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium text-muted tracking-wide uppercase">
          {stat.label}
        </span>
        <div className="w-8 h-8 rounded-lg bg-surface-hover flex items-center justify-center text-primary-light">
          {icon || <TrendingUp className="w-4 h-4" />}
        </div>
      </div>
      <div className="flex items-baseline justify-between">
        <div className="text-2xl font-bold tracking-tight text-white">{stat.value}</div>
        {stat.change && (
          <div
            className={cn(
              'flex items-center text-xs font-medium px-2 py-0.5 rounded-full',
              stat.positive
                ? 'bg-emerald-500/10 text-emerald-400'
                : 'bg-rose-500/10 text-rose-400'
            )}
          >
            {stat.change}
            {stat.positive && <ArrowUpRight className="w-3 h-3 ml-0.5" />}
          </div>
        )}
      </div>
      {stat.subValue && (
        <div className="text-xs text-muted-dark mt-1">{stat.subValue}</div>
      )}
    </div>
  );
};
