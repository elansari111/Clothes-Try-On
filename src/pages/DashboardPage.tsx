import React from 'react';
import { PageId, Product } from '../types';
import { MOCK_STATS, MOCK_PRODUCTS } from '../constants/mockData';
import { PageContainer } from '../components/UI/PageContainer';
import { StatCard } from '../components/UI/StatCard';
import { ProductCard } from '../components/Clothing/ProductCard';
import {
  Sparkles,
  Compass,
  Shirt,
  Video,
  Clock,
  ArrowRight,
} from 'lucide-react';

interface DashboardPageProps {
  onNavigate: (page: PageId) => void;
  onTryOn: (product: Product) => void;
  onToggleSave: (product: Product) => void;
  savedProductIds: string[];
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  onNavigate,
  onTryOn,
  onToggleSave,
  savedProductIds,
}) => {
  const recentClothes = MOCK_PRODUCTS.slice(0, 4);

  return (
    <PageContainer>
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-surface to-surface-hover border border-surface-border p-8">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary-light text-xs font-semibold mb-4">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Virtual Try-On V1.0 • AI-Assisted Fitting</span>
          </div>
          <h2 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight leading-tight mb-3">
            Try on clothes virtually in real time from your desktop.
          </h2>
          <p className="text-sm text-muted mb-6 leading-relaxed">
            Position yourself in front of your webcam, browse our curated technical wardrobe, and
            preview instant dynamic fitting tailored to your posture and size.
          </p>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => onNavigate('virtual-mirror')}
              className="px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-primary/20 transition-all"
            >
              <Video className="w-4 h-4" />
              <span>Launch Virtual Mirror</span>
            </button>
            <button
              onClick={() => onNavigate('explore')}
              className="px-5 py-2.5 rounded-xl bg-surface border border-surface-border hover:bg-surface-hover text-slate-200 text-xs font-semibold flex items-center gap-2 transition-all"
            >
              <Compass className="w-4 h-4" />
              <span>Browse Catalog</span>
            </button>
          </div>
        </div>

        {/* Ambient background glow */}
        <div className="absolute -right-16 -top-16 w-80 h-80 bg-primary/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute right-32 -bottom-20 w-64 h-64 bg-accent-cyan/10 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {MOCK_STATS.map((stat) => (
          <StatCard key={stat.id} stat={stat} />
        ))}
      </div>

      {/* Quick Action Cards */}
      <div>
        <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-wider mb-4">
          Quick Actions
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div
            onClick={() => onNavigate('virtual-mirror')}
            className="group cursor-pointer bg-surface border border-surface-border hover:border-primary/50 rounded-xl p-5 transition-all flex items-start justify-between"
          >
            <div className="space-y-1">
              <div className="w-9 h-9 rounded-lg bg-primary/15 text-primary-light flex items-center justify-center mb-3">
                <Video className="w-4 h-4" />
              </div>
              <h4 className="text-sm font-semibold text-white group-hover:text-primary-light transition-colors">
                Start Mirror Session
              </h4>
              <p className="text-xs text-muted">
                Turn on your webcam and experience real-time body tracking fit.
              </p>
            </div>
            <ArrowRight className="w-4 h-4 text-muted group-hover:text-primary-light transition-all -translate-x-1 group-hover:translate-x-0" />
          </div>

          <div
            onClick={() => onNavigate('explore')}
            className="group cursor-pointer bg-surface border border-surface-border hover:border-primary/50 rounded-xl p-5 transition-all flex items-start justify-between"
          >
            <div className="space-y-1">
              <div className="w-9 h-9 rounded-lg bg-accent-cyan/15 text-accent-cyan flex items-center justify-center mb-3">
                <Compass className="w-4 h-4" />
              </div>
              <h4 className="text-sm font-semibold text-white group-hover:text-primary-light transition-colors">
                Explore Collection
              </h4>
              <p className="text-xs text-muted">
                Filter by shirts, jackets, pants, or oversized technical wear.
              </p>
            </div>
            <ArrowRight className="w-4 h-4 text-muted group-hover:text-primary-light transition-all -translate-x-1 group-hover:translate-x-0" />
          </div>

          <div
            onClick={() => onNavigate('wardrobe')}
            className="group cursor-pointer bg-surface border border-surface-border hover:border-primary/50 rounded-xl p-5 transition-all flex items-start justify-between"
          >
            <div className="space-y-1">
              <div className="w-9 h-9 rounded-lg bg-accent-purple/15 text-accent-purple flex items-center justify-center mb-3">
                <Shirt className="w-4 h-4" />
              </div>
              <h4 className="text-sm font-semibold text-white group-hover:text-primary-light transition-colors">
                Review Wardrobe
              </h4>
              <p className="text-xs text-muted">
                Manage your saved garments and organize your favorite outfits.
              </p>
            </div>
            <ArrowRight className="w-4 h-4 text-muted group-hover:text-primary-light transition-all -translate-x-1 group-hover:translate-x-0" />
          </div>
        </div>
      </div>

      {/* Recently Viewed / Recommended Clothes */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-primary-light" />
            <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-wider">
              Trending Clothes
            </h3>
          </div>
          <button
            onClick={() => onNavigate('explore')}
            className="text-xs font-semibold text-primary-light hover:text-primary flex items-center gap-1 transition-colors"
          >
            <span>View All</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {recentClothes.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              isSaved={savedProductIds.includes(product.id)}
              onTryOn={onTryOn}
              onToggleSave={onToggleSave}
            />
          ))}
        </div>
      </div>
    </PageContainer>
  );
};
