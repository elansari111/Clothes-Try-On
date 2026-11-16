import React from 'react';
import { Product } from '../../types';
import { formatPrice } from '../../utils';
import { Heart, Sparkles, Eye } from 'lucide-react';
import { cn } from '../../utils';

interface ProductCardProps {
  product: Product;
  onTryOn?: (product: Product) => void;
  onToggleSave?: (product: Product) => void;
  isSaved?: boolean;
  className?: string;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  onTryOn,
  onToggleSave,
  isSaved = false,
  className,
}) => {
  return (
    <div
      className={cn(
        'group bg-surface border border-surface-border rounded-xl overflow-hidden flex flex-col hover:border-surface-border/80 transition-all duration-200',
        className
      )}
    >
      {/* Product Image Section */}
      <div className="relative aspect-[4/5] bg-surface-hover overflow-hidden">
        <img
          src={product.imageUrl}
          alt={product.name}
          className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-300"
          loading="lazy"
        />

        {/* Category tag */}
        <div className="absolute top-3 left-3">
          <span className="px-2.5 py-1 text-[11px] font-medium bg-background/80 backdrop-blur-md text-slate-200 rounded-md border border-white/5">
            {product.category}
          </span>
        </div>

        {/* Save button */}
        <button
          onClick={() => onToggleSave?.(product)}
          className={cn(
            'absolute top-3 right-3 p-2 rounded-lg backdrop-blur-md transition-all',
            isSaved
              ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
              : 'bg-background/70 text-slate-300 hover:text-white border border-white/5 hover:bg-background/90'
          )}
          title={isSaved ? 'Remove from Wardrobe' : 'Save to Wardrobe'}
        >
          <Heart className={cn('w-4 h-4', isSaved && 'fill-rose-400')} />
        </button>

        {/* Hover quick action overlay */}
        <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-background/90 via-background/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
          <button
            onClick={() => onTryOn?.(product)}
            className="flex-1 py-2 px-3 rounded-lg bg-primary hover:bg-primary-hover text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow-lg shadow-primary/20 transition-all"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Try On</span>
          </button>
          <div className="p-2 rounded-lg bg-surface/80 text-slate-300 border border-surface-border flex items-center justify-center">
            <Eye className="w-3.5 h-3.5" />
          </div>
        </div>
      </div>

      {/* Info Section */}
      <div className="p-4 flex flex-col flex-1 justify-between gap-3">
        <div>
          <div className="flex items-center justify-between text-xs text-muted mb-1">
            <span>{product.brand}</span>
            {product.fitType && (
              <span className="text-[10px] font-mono text-muted-dark">{product.fitType}</span>
            )}
          </div>
          <h3 className="text-sm font-semibold text-slate-100 line-clamp-1 group-hover:text-primary-light transition-colors">
            {product.name}
          </h3>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-surface-border/50">
          <div className="flex items-center gap-1.5">
            <span
              className="w-3 h-3 rounded-full border border-white/20 inline-block"
              style={{ backgroundColor: product.colorHex }}
              title={product.color}
            />
            <span className="text-xs text-muted truncate max-w-[90px]">{product.color}</span>
          </div>
          <span className="text-sm font-bold text-white tracking-tight">
            {formatPrice(product.price)}
          </span>
        </div>
      </div>
    </div>
  );
};
