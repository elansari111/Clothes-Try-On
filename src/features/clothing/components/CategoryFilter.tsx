import React from 'react';
import { Category } from '../../../shared/types';
import { cn } from '../../../shared/utils';

interface CategoryFilterProps {
  categories: Category[];
  selectedCategory: Category;
  onSelectCategory: (category: Category) => void;
  className?: string;
}

export const CategoryFilter: React.FC<CategoryFilterProps> = ({
  categories,
  selectedCategory,
  onSelectCategory,
  className,
}) => {
  return (
    <div className={cn('flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar', className)}>
      {categories.map((cat) => {
        const isActive = selectedCategory === cat;
        return (
          <button
            key={cat}
            onClick={() => onSelectCategory(cat)}
            className={cn(
              'px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border',
              isActive
                ? 'bg-primary text-white border-primary shadow-sm shadow-primary/30'
                : 'bg-surface text-muted hover:text-slate-200 border-surface-border hover:bg-surface-hover'
            )}
          >
            {cat}
          </button>
        );
      })}
    </div>
  );
};
