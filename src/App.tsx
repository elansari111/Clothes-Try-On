import React, { useState } from 'react';
import { CLOTHES, Garment } from './types';
import { Camera, Sparkles, SlidersHorizontal, Shirt } from 'lucide-react';

export const App: React.FC = () => {
  const [selectedGarment, setSelectedGarment] = useState<Garment>(CLOTHES[0]);
  const [filter, setFilter] = useState<string>('All');

  const categories = ['All', 'T-Shirts', 'Shirts', 'Jackets', 'Pants'];

  const filteredClothes = filter === 'All'
    ? CLOTHES
    : CLOTHES.filter((c) => c.category === filter);

  return (
    <div className="flex h-screen w-screen bg-[#0d0f15] text-slate-100 font-sans select-none overflow-hidden">
      {/* 1. Zone Principale : Miroir / Webcam (Gauche) */}
      <div className="flex-1 flex flex-col p-6 border-r border-[#1e2330]">
        {/* Header simple */}
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-[#1e2330]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-sm font-bold tracking-tight text-white">Virtual Try-On</h1>
              <p className="text-[11px] text-slate-400">Miroir Virtuel en temps réel</p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>Caméra prête</span>
          </div>
        </div>

        {/* Cadre Caméra / Miroir */}
        <div className="flex-1 relative rounded-2xl bg-[#141824] border border-[#222838] flex flex-col items-center justify-center overflow-hidden">
          {/* Centre Placeholder Caméra */}
          <div className="flex flex-col items-center text-center p-6 max-w-sm">
            <div className="w-16 h-16 rounded-2xl bg-[#1c2233] border border-[#2d354b] flex items-center justify-center text-indigo-400 mb-4 shadow-lg">
              <Camera className="w-8 h-8" />
            </div>
            <h2 className="text-base font-semibold text-white mb-1">Aperçu Caméra</h2>
            <p className="text-xs text-slate-400 mb-6">
              Placez-vous devant votre webcam pour essayer le vêtement sélectionné.
            </p>
            <button
              type="button"
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl flex items-center gap-2 transition shadow-md shadow-indigo-600/30"
            >
              <Camera className="w-4 h-4" />
              <span>Activer la caméra</span>
            </button>
          </div>

          {/* Vêtement actuellement sélectionné (Overlay info en bas) */}
          <div className="absolute bottom-4 inset-x-4 bg-[#0d0f15]/90 backdrop-blur border border-[#222838] rounded-xl p-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img
                src={selectedGarment.image}
                alt={selectedGarment.name}
                className="w-11 h-11 rounded-lg object-cover border border-[#2d354b]"
              />
              <div>
                <span className="text-[10px] uppercase tracking-wider text-indigo-400 font-semibold">
                  Vêtement actif
                </span>
                <div className="text-xs font-bold text-white">{selectedGarment.name}</div>
                <div className="text-[11px] text-slate-400">{selectedGarment.price}</div>
              </div>
            </div>

            <button className="p-2 rounded-lg bg-[#181d2c] hover:bg-[#20273a] text-slate-300 border border-[#2d354b] transition">
              <SlidersHorizontal className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 2. Panneau Latéral : Sélection des Vêtements (Droite) */}
      <div className="w-96 flex flex-col p-6 bg-[#0f121a]">
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#1e2330]">
          <div className="flex items-center gap-2">
            <Shirt className="w-4 h-4 text-indigo-400" />
            <h2 className="text-sm font-bold text-white">Catalogue Vêtements</h2>
          </div>
          <span className="text-xs text-slate-400 font-mono">{filteredClothes.length} articles</span>
        </div>

        {/* Filtres de catégories */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-3 mb-3">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                filter === cat
                  ? 'bg-indigo-600 text-white font-semibold'
                  : 'bg-[#161a26] text-slate-400 hover:text-white border border-[#20273a]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Liste / Grille simple des vêtements */}
        <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
          {filteredClothes.map((garment) => {
            const isSelected = selectedGarment.id === garment.id;
            return (
              <div
                key={garment.id}
                onClick={() => setSelectedGarment(garment)}
                className={`flex items-center gap-3 p-2.5 rounded-xl border cursor-pointer transition ${
                  isSelected
                    ? 'bg-indigo-600/10 border-indigo-500 shadow-sm'
                    : 'bg-[#141824] border-[#1e2330] hover:border-[#2d354b]'
                }`}
              >
                <img
                  src={garment.image}
                  alt={garment.name}
                  className="w-14 h-14 rounded-lg object-cover bg-[#1c2233] border border-[#252c3f] shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold text-white truncate">{garment.name}</div>
                  <div className="text-[11px] text-slate-400">{garment.category}</div>
                  <div className="text-xs font-bold text-indigo-400 mt-0.5">{garment.price}</div>
                </div>
                {isSelected && (
                  <span className="text-[10px] font-bold text-indigo-400 bg-indigo-500/10 px-2 py-1 rounded-md border border-indigo-500/20">
                    Actif
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default App;
