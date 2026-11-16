import React, { useState, useMemo } from 'react';
import { Product, Category } from '../types';
import { MOCK_PRODUCTS } from '../constants/mockData';
import { PageContainer } from '../components/UI/PageContainer';
import { SearchBar } from '../components/UI/SearchBar';
import { CategoryFilter } from '../components/Clothing/CategoryFilter';
import { ProductCard } from '../components/Clothing/ProductCard';
import { EmptyState } from '../components/UI/EmptyState';
import { Shirt, Sparkles, Filter } from 'lucide-react';

interface ExplorePageProps {
  onTryOn: (product: Product) => void;
  onToggleSave: (product: Product) => void;
  savedProductIds: string[];
}

const CATEGORIES: Category[] = ['All', 'T-Shirts', 'Shirts', 'Jackets', 'Pants'];

export const ExplorePage: React.FC<ExplorePageProps> = ({
  onTryOn,
  onToggleSave,
  savedProductIds,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<Category>('All');

  // Filter products by search and category
  const filteredProducts = useMemo(() => {
    return MOCK_PRODUCTS.filter((product) => {
      const matchesCategory =
        selectedCategory === 'All' || product.category === selectedCategory;

      const query = searchQuery.toLowerCase().trim();
      const matchesSearch =
        query === '' ||
        product.name.toLowerCase().includes(query) ||
        product.brand.toLowerCase().includes(query) ||
        product.category.toLowerCase().includes(query) ||
        product.color.toLowerCase().includes(query);

      return matchesCategory && matchesSearch;
    });
  }, [searchQuery, selectedCategory]);

  return (
    <PageContainer>
      {/* Top Filter and Search Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 bg-surface border border-surface-border p-4 rounded-2xl">
        <CategoryFilter
          categories={CATEGORIES}
          selectedCategory={selectedCategory}
          onSelectCategory={setSelectedCategory}
          className="flex-1"
        />

        <div className="w-full md:w-80">
          <SearchBar
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search clothes, brands, fits..."
          />
        </div>
      </div>

      {/* Catalog Header & Count */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-primary-light" />
          <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
            Showing {filteredProducts.length} {filteredProducts.length === 1 ? 'item' : 'items'}
          </span>
          {selectedCategory !== 'All' && (
            <span className="text-xs text-muted">in &quot;{selectedCategory}&quot;</span>
          )}
        </div>

        <div className="text-xs text-muted flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-primary-light" />
          <span>Real-time Try-On ready</span>
        </div>
      </div>

      {/* Products Grid or Empty State */}
      {filteredProducts.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
          {filteredProducts.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              isSaved={savedProductIds.includes(product.id)}
              onTryOn={onTryOn}
              onToggleSave={onToggleSave}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Shirt}
          title="No clothes match your criteria"
          description="Try broadening your search term or select another category filter to explore our catalogue."
          actionLabel="Clear Filters"
          onAction={() => {
            setSearchQuery('');
            setSelectedCategory('All');
          }}
        />
      )}
    </PageContainer>
  );
};
