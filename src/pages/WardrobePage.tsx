import React from 'react';
import { PageId, Product } from '../types';
import { MOCK_PRODUCTS } from '../constants/mockData';
import { PageContainer } from '../components/UI/PageContainer';
import { ProductCard } from '../components/Clothing/ProductCard';
import { EmptyState } from '../components/UI/EmptyState';
import { Shirt, Sparkles, Heart } from 'lucide-react';

interface WardrobePageProps {
  savedProductIds: string[];
  onTryOn: (product: Product) => void;
  onToggleSave: (product: Product) => void;
  onNavigate: (page: PageId) => void;
}

export const WardrobePage: React.FC<WardrobePageProps> = ({
  savedProductIds,
  onTryOn,
  onToggleSave,
  onNavigate,
}) => {
  const savedClothes = MOCK_PRODUCTS.filter((p) => savedProductIds.includes(p.id));

  return (
    <PageContainer>
      {/* Header Info */}
      <div className="flex items-center justify-between pb-4 border-b border-surface-border">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center">
            <Heart className="w-4 h-4 fill-rose-400" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">Your Saved Fitting Wardrobe</h2>
            <p className="text-xs text-muted">
              {savedClothes.length} {savedClothes.length === 1 ? 'garment' : 'garments'} saved for quick mirror try-on sessions
            </p>
          </div>
        </div>

        {savedClothes.length > 0 && (
          <button
            onClick={() => onNavigate('virtual-mirror')}
            className="px-4 py-2 bg-primary hover:bg-primary-hover text-white text-xs font-semibold rounded-xl flex items-center gap-2 shadow-sm shadow-primary/20 transition-all"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Try in Mirror</span>
          </button>
        )}
      </div>

      {/* Grid or Empty State */}
      {savedClothes.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
          {savedClothes.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              isSaved={true}
              onTryOn={onTryOn}
              onToggleSave={onToggleSave}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Shirt}
          title="Your wardrobe is empty"
          description="You haven't saved any garments yet. Browse the collection and tap the heart icon to assemble your try-on wishlist."
          actionLabel="Explore Clothes"
          onAction={() => onNavigate('explore')}
        />
      )}
    </PageContainer>
  );
};
