import React, { useState, useRef } from 'react';
import { ClothingCategory, GarmentAnchors } from '../../types/clothing';
import { ClothingService } from '../../services/product-importer/clothingService';
import { ClothingValidator } from '../../services/product-importer/clothingValidator';
import { ImageProcessor } from '../../services/image-processing/imageProcessor';
import { garmentAnchorService } from '../../engines/clothing/garmentAnchorService';
import { X, Upload, Check, AlertCircle, Sparkles } from 'lucide-react';

interface ClothingImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportSuccess: () => void;
}

export const ClothingImportModal: React.FC<ClothingImportModalProps> = ({
  isOpen,
  onClose,
  onImportSuccess,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [imageMeta, setImageMeta] = useState<{
    width: number;
    height: number;
    hasTransparency: boolean;
    format: string;
  } | null>(null);

  const [name, setName] = useState('');
  const [category, setCategory] = useState<ClothingCategory>('T-Shirts');
  const [price, setPrice] = useState('45 €');
  const [color, setColor] = useState('');
  const [description, setDescription] = useState('');

  // Anchor points state
  const [anchors, setAnchors] = useState<GarmentAnchors>(
    garmentAnchorService.getDefaultAnchors('T-Shirts')
  );

  const [activeAnchorKey, setActiveAnchorKey] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const imageContainerRef = useRef<HTMLDivElement | null>(null);

  if (!isOpen) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMsg(null);
    const validation = ClothingValidator.validateFile(file);
    if (!validation.isValid) {
      setErrorMsg(validation.error || 'Fichier invalide');
      return;
    }

    try {
      setIsProcessing(true);
      const proc = await ImageProcessor.processImage(file, 1024);
      setSelectedFile(file);
      setPreviewUrl(proc.dataUrl);
      setImageMeta({
        width: proc.width,
        height: proc.height,
        hasTransparency: proc.hasTransparency,
        format: proc.format.toUpperCase(),
      });

      // Default name from filename if empty
      if (!name) {
        const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
        setName(cleanName.charAt(0).toUpperCase() + cleanName.slice(1));
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Erreur de traitement image');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCategoryChange = (newCat: ClothingCategory) => {
    setCategory(newCat);
    setAnchors(garmentAnchorService.getDefaultAnchors(newCat));
  };

  // Click on preview to set active anchor point
  const handleImageClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!activeAnchorKey || !imageContainerRef.current) return;

    const rect = imageContainerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));

    setAnchors((prev) => ({
      ...prev,
      [activeAnchorKey]: { x: Math.round(x * 1000) / 1000, y: Math.round(y * 1000) / 1000 },
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      setErrorMsg('Veuillez sélectionner une image pour le vêtement.');
      return;
    }

    try {
      setIsProcessing(true);
      await ClothingService.importClothing(
        selectedFile,
        name,
        category,
        price,
        color,
        description,
        anchors
      );
      onImportSuccess();
      onClose();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Erreur lors de l'enregistrement.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-[#121622] border border-[#273044] rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1e2637]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white">
              <Upload className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Importer un vêtement</h2>
              <p className="text-[11px] text-slate-400">
                Formats autorisés : PNG, JPG, JPEG, WEBP (max 10 Mo)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left: File upload & visual Anchor editor */}
            <div className="space-y-4">
              {!previewUrl ? (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-[#273044] hover:border-indigo-500/60 rounded-2xl aspect-[3/4] flex flex-col items-center justify-center p-6 text-center cursor-pointer transition bg-[#151926]/50 group"
                >
                  <div className="w-12 h-12 rounded-xl bg-[#1c2233] text-indigo-400 flex items-center justify-center mb-3 group-hover:scale-105 transition">
                    <Upload className="w-6 h-6" />
                  </div>
                  <span className="text-xs font-semibold text-white mb-1">
                    Choisir une image locale
                  </span>
                  <span className="text-[11px] text-slate-400">Glisser-déposer ou parcourir</span>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>Aperçu & Points d&apos;ancrage</span>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="text-indigo-400 hover:underline text-[11px]"
                    >
                      Changer d&apos;image
                    </button>
                  </div>

                  {/* Interactive preview with anchor dots */}
                  <div
                    ref={imageContainerRef}
                    onClick={handleImageClick}
                    className="relative border border-[#273044] rounded-xl overflow-hidden aspect-[3/4] bg-[#0c0e14] flex items-center justify-center cursor-crosshair select-none"
                  >
                    <img
                      src={previewUrl}
                      alt="Aperçu vêtement"
                      className="w-full h-full object-contain"
                    />

                    {/* Anchor point overlays */}
                    {Object.entries(anchors).map(([key, pt]) => {
                      const isActive = activeAnchorKey === key;
                      return (
                        <div
                          key={key}
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveAnchorKey(key);
                          }}
                          className={`absolute w-3.5 h-3.5 -ml-[7px] -mt-[7px] rounded-full border-2 transition-transform cursor-pointer ${
                            isActive
                              ? 'bg-amber-400 border-white scale-125 z-20 shadow-lg'
                              : 'bg-indigo-600 border-white shadow'
                          }`}
                          style={{
                            left: `${pt.x * 100}%`,
                            top: `${pt.y * 100}%`,
                          }}
                          title={`Point: ${key}`}
                        />
                      );
                    })}
                  </div>

                  {/* Image info chips */}
                  {imageMeta && (
                    <div className="flex items-center gap-2 text-[10px] font-mono text-slate-400">
                      <span className="px-2 py-0.5 rounded bg-[#181d2c] border border-[#273044]">
                        {imageMeta.width} x {imageMeta.height} px
                      </span>
                      <span className="px-2 py-0.5 rounded bg-[#181d2c] border border-[#273044]">
                        {imageMeta.format}
                      </span>
                      {imageMeta.hasTransparency && (
                        <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          Transparence OK
                        </span>
                      )}
                    </div>
                  )}

                  {/* Quick Anchor Selection Bar */}
                  <div className="p-2.5 rounded-xl bg-[#141824] border border-[#222838] space-y-1.5">
                    <span className="text-[10px] font-semibold text-slate-300 block">
                      Positionner un point :
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {Object.keys(anchors).map((key) => (
                        <button
                          key={key}
                          type="button"
                          onClick={() => setActiveAnchorKey(key)}
                          className={`px-2 py-1 rounded text-[10px] transition border ${
                            activeAnchorKey === key
                              ? 'bg-amber-500/20 text-amber-300 border-amber-500 font-bold'
                              : 'bg-[#181d2c] text-slate-400 border-[#273044] hover:text-white'
                          }`}
                        >
                          {key}
                        </button>
                      ))}
                    </div>
                    {activeAnchorKey && (
                      <span className="text-[10px] text-amber-300 block mt-1">
                        * Cliquez sur l&apos;image pour placer &quot;{activeAnchorKey}&quot;
                      </span>
                    )}
                  </div>
                </div>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/webp"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>

            {/* Right: Metadata Inputs */}
            <div className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 mb-1 font-medium">
                  Nom du vêtement *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: T-Shirt Minimal Noir"
                  className="w-full bg-[#181d2c] border border-[#273044] rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-medium">Catégorie *</label>
                <select
                  value={category}
                  onChange={(e) => handleCategoryChange(e.target.value as ClothingCategory)}
                  className="w-full bg-[#181d2c] border border-[#273044] rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="T-Shirts">T-Shirts</option>
                  <option value="Shirts">Shirts</option>
                  <option value="Jackets">Jackets</option>
                  <option value="Pants">Pants</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1 font-medium">Prix estimé</label>
                  <input
                    type="text"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="45 €"
                    className="w-full bg-[#181d2c] border border-[#273044] rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 mb-1 font-medium">Couleur dominante</label>
                  <input
                    type="text"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    placeholder="Ex: Noir"
                    className="w-full bg-[#181d2c] border border-[#273044] rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-medium">
                  Description (optionnelle)
                </label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Détails du vêtement..."
                  className="w-full bg-[#181d2c] border border-[#273044] rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="p-3 rounded-xl bg-indigo-600/10 border border-indigo-600/20 text-indigo-300 text-[11px] flex items-start gap-2">
                <Sparkles className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  Le vêtement importé et ses points d&apos;ancrage seront sauvegardés localement et
                  directement utilisables dans le catalogue et le miroir virtuel.
                </span>
              </div>
            </div>
          </div>

          {/* Modal Footer */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#1e2637]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-[#181d2c] text-slate-300 hover:text-white border border-[#273044] transition"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isProcessing || !selectedFile}
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold flex items-center gap-2 transition shadow-md shadow-indigo-600/30"
            >
              <Check className="w-4 h-4" />
              <span>Enregistrer le vêtement</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
