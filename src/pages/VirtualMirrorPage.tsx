import React from 'react';
import { PageId, Product } from '../types';
import { MOCK_PRODUCTS } from '../constants/mockData';
import { PageContainer } from '../components/UI/PageContainer';
import { formatPrice } from '../utils';
import {
  Camera,
  Play,
  RotateCcw,
  Sliders,
  Sparkles,
  Maximize2,
  Scan,
  Check,
  ChevronRight,
  Info,
} from 'lucide-react';

interface VirtualMirrorPageProps {
  selectedProduct: Product | null;
  onSelectProduct: (product: Product) => void;
  onNavigate: (page: PageId) => void;
}

export const VirtualMirrorPage: React.FC<VirtualMirrorPageProps> = ({
  selectedProduct,
  onSelectProduct,
  onNavigate,
}) => {
  const currentGarment = selectedProduct || MOCK_PRODUCTS[0];

  return (
    <PageContainer className="max-w-[1600px] h-full">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Main Mirror Viewport Area (8 cols) */}
        <div className="lg:col-span-8 flex flex-col gap-4">
          <div className="relative aspect-[16/9] w-full bg-surface border border-surface-border rounded-2xl overflow-hidden flex flex-col items-center justify-center shadow-2xl">
            {/* Mirror HUD Overlay Elements */}
            <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
              <div className="px-3 py-1.5 rounded-lg bg-background/80 backdrop-blur-md border border-white/10 flex items-center gap-2 text-xs font-medium text-slate-200">
                <span className="w-2 h-2 rounded-full bg-amber-400 inline-block animate-pulse" />
                <span>Webcam: Standby</span>
              </div>
              <div className="px-3 py-1.5 rounded-lg bg-background/80 backdrop-blur-md border border-white/10 text-xs font-mono text-muted">
                33 Landmark Points
              </div>
            </div>

            <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
              <button
                className="p-2 rounded-lg bg-background/80 backdrop-blur-md border border-white/10 text-slate-300 hover:text-white transition-colors"
                title="Fullscreen"
              >
                <Maximize2 className="w-4 h-4" />
              </button>
            </div>

            {/* Central Camera Placeholder & Action Button */}
            <div className="text-center p-8 max-w-md flex flex-col items-center z-10">
              <div className="relative mb-5">
                <div className="w-20 h-20 rounded-2xl bg-surface-hover border border-surface-border flex items-center justify-center text-primary-light shadow-xl shadow-primary/10">
                  <Camera className="w-10 h-10" />
                </div>
                <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-primary flex items-center justify-center text-white border-2 border-surface">
                  <Sparkles className="w-3.5 h-3.5" />
                </div>
              </div>

              <h3 className="text-lg font-bold text-white mb-2">Webcam Feed Inactive</h3>
              <p className="text-xs text-muted mb-6 leading-relaxed">
                Position your camera at chest level and stand approximately 1.5 to 2 meters away.
                Press the button below to initialize the camera stream in Phase 03.
              </p>

              {/* Start Camera Visual Placeholder */}
              <button
                type="button"
                className="group px-6 py-3 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-bold flex items-center gap-2.5 shadow-xl shadow-primary/25 transition-all transform active:scale-95"
              >
                <Play className="w-4 h-4 fill-white group-hover:scale-110 transition-transform" />
                <span>Start Camera Feed</span>
              </button>

              <span className="text-[11px] text-muted-dark mt-3 font-mono">
                * Visual placeholder — Hardware access disabled in Phase 02
              </span>
            </div>

            {/* Simulated Body Guide Reticle */}
            <div className="absolute inset-x-1/4 inset-y-12 border border-dashed border-primary/20 rounded-3xl pointer-events-none flex items-center justify-center">
              <div className="w-full h-full opacity-10 flex flex-col items-center justify-center">
                <Scan className="w-24 h-24 text-primary" />
              </div>
            </div>

            {/* Bottom HUD Controls Bar */}
            <div className="absolute bottom-4 inset-x-4 px-4 py-2.5 rounded-xl bg-background/85 backdrop-blur-md border border-white/10 flex items-center justify-between z-10">
              <div className="flex items-center gap-3">
                <button
                  className="px-3 py-1.5 rounded-lg bg-surface border border-surface-border text-xs text-slate-300 hover:text-white flex items-center gap-1.5 transition-colors"
                  title="Calibrate alignment"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Recalibrate</span>
                </button>
                <button
                  className="px-3 py-1.5 rounded-lg bg-surface border border-surface-border text-xs text-slate-300 hover:text-white flex items-center gap-1.5 transition-colors"
                  title="Pose overlay"
                >
                  <Scan className="w-3.5 h-3.5" />
                  <span>Show Skeleton</span>
                </button>
              </div>

              <div className="text-xs font-mono text-muted flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span>FPS: 00 • Latency: --ms</span>
              </div>
            </div>
          </div>

          {/* Quick Garment Switcher Strip */}
          <div className="bg-surface border border-surface-border rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-primary-light" />
                <h4 className="text-xs font-semibold text-slate-200 uppercase tracking-wider">
                  Quick Garment Switcher
                </h4>
              </div>
              <button
                onClick={() => onNavigate('explore')}
                className="text-xs text-primary-light hover:text-primary flex items-center gap-1 transition-colors"
              >
                <span>Full Catalog</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex items-center gap-3 overflow-x-auto pb-1 no-scrollbar">
              {MOCK_PRODUCTS.map((prod) => {
                const isSelected = prod.id === currentGarment.id;
                return (
                  <button
                    key={prod.id}
                    onClick={() => onSelectProduct(prod)}
                    className={`flex items-center gap-3 p-2 rounded-xl border text-left shrink-0 transition-all ${
                      isSelected
                        ? 'bg-primary/10 border-primary shadow-sm'
                        : 'bg-surface-hover/50 border-surface-border hover:border-surface-border/80'
                    }`}
                  >
                    <img
                      src={prod.imageUrl}
                      alt={prod.name}
                      className="w-10 h-10 rounded-lg object-cover bg-surface-border"
                    />
                    <div className="pr-2">
                      <div className="text-xs font-semibold text-white max-w-[120px] truncate">
                        {prod.name}
                      </div>
                      <div className="text-[10px] text-muted">{formatPrice(prod.price)}</div>
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-primary ml-1 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Garment Details & Fitting Control Panel (4 cols) */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          {/* Active Garment Card */}
          <div className="bg-surface border border-surface-border rounded-2xl p-5">
            <div className="flex items-center justify-between text-xs text-muted mb-3">
              <span className="uppercase tracking-wider font-semibold">Active Garment</span>
              <span className="px-2 py-0.5 rounded bg-primary/15 text-primary-light font-mono text-[10px]">
                {currentGarment.category}
              </span>
            </div>

            <div className="flex gap-4 mb-4">
              <img
                src={currentGarment.imageUrl}
                alt={currentGarment.name}
                className="w-24 h-28 object-cover rounded-xl border border-surface-border bg-surface-hover"
              />
              <div className="flex flex-col justify-between">
                <div>
                  <span className="text-[11px] font-mono text-muted">{currentGarment.brand}</span>
                  <h3 className="text-sm font-bold text-white leading-tight mt-0.5 mb-1">
                    {currentGarment.name}
                  </h3>
                  <div className="text-xs text-muted leading-relaxed line-clamp-2">
                    {currentGarment.description}
                  </div>
                </div>
                <div className="text-sm font-extrabold text-primary-light">
                  {formatPrice(currentGarment.price)}
                </div>
              </div>
            </div>

            {/* Garment Attributes */}
            <div className="grid grid-cols-2 gap-2 pt-3 border-t border-surface-border text-xs">
              <div className="p-2.5 rounded-lg bg-surface-hover/70 border border-surface-border">
                <span className="text-muted text-[10px] block">Color</span>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span
                    className="w-2.5 h-2.5 rounded-full border border-white/20"
                    style={{ backgroundColor: currentGarment.colorHex }}
                  />
                  <span className="font-semibold text-slate-200">{currentGarment.color}</span>
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-surface-hover/70 border border-surface-border">
                <span className="text-muted text-[10px] block">Fit Cut</span>
                <span className="font-semibold text-slate-200 mt-0.5 block">
                  {currentGarment.fitType || 'Regular Fit'}
                </span>
              </div>
            </div>
          </div>

          {/* Fitting Engine Controls (Visual Only) */}
          <div className="bg-surface border border-surface-border rounded-2xl p-5 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-surface-border">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-primary-light" />
                <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                  Fitting Adjustments
                </h4>
              </div>
              <span className="text-[10px] font-mono text-muted-dark">AI Calibration</span>
            </div>

            {/* Slider 1: Scale */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-300">Garment Scale</span>
                <span className="font-mono text-primary-light text-[11px]">100%</span>
              </div>
              <input
                type="range"
                defaultValue={100}
                min={80}
                max={120}
                className="w-full h-1.5 bg-surface-border rounded-lg appearance-none cursor-pointer accent-primary"
              />
            </div>

            {/* Slider 2: Vertical Offset */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-300">Vertical Offset</span>
                <span className="font-mono text-primary-light text-[11px]">0 mm</span>
              </div>
              <input
                type="range"
                defaultValue={50}
                min={0}
                max={100}
                className="w-full h-1.5 bg-surface-border rounded-lg appearance-none cursor-pointer accent-primary"
              />
            </div>

            {/* Slider 3: Warp & Curvature */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-300">Body Wrap Tension</span>
                <span className="font-mono text-primary-light text-[11px]">Dynamic</span>
              </div>
              <input
                type="range"
                defaultValue={75}
                min={0}
                max={100}
                className="w-full h-1.5 bg-surface-border rounded-lg appearance-none cursor-pointer accent-primary"
              />
            </div>

            <div className="p-3 rounded-xl bg-primary/10 border border-primary/20 flex items-start gap-2.5 text-xs text-primary-light">
              <Info className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                Pose landmark mesh dynamically deforms garment sleeves and shoulders to match your
                real-time posture.
              </span>
            </div>
          </div>
        </div>
      </div>
    </PageContainer>
  );
};
