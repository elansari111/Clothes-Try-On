import React from 'react';
import { Search, X } from 'lucide-react';
import { cn } from '../../utils';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  value,
  onChange,
  placeholder = 'Search clothes, brands, fits...',
  className,
}) => {
  return (
    <div className={cn('relative w-full', className)}>
      <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-10 pr-10 py-2.5 bg-surface border border-surface-border rounded-xl text-sm text-slate-100 placeholder:text-muted focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
      />
      {value && (
        <button
          onClick={() => onChange('')}
          className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-muted hover:text-slate-100 rounded-md transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
};
