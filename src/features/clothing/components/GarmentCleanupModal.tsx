import React, { useEffect, useRef, useState } from 'react';
import { ClothingItem, GarmentAnchors, UpperBodyAnchors } from '../types/clothing';
import { ClothingService } from '../services/clothingService';
import { GarmentAssetProcessor } from '../services/garmentAssetProcessor';
import { garmentLoader } from '../../live-ar/rendering/garmentLoader';
import { garmentAnchorService } from '../services/garmentAnchorService';
import { X, Eraser, Crosshair, RotateCcw, Check, Sparkles } from 'lucide-react';

interface GarmentCleanupModalProps {
  isOpen: boolean;
  garment: ClothingItem | null;
  onClose: () => void;
  onSaveSuccess: (updatedItem: ClothingItem) => void;
}

type ToolMode = 'eraser' | 'anchors';

const ANCHOR_LABELS: Record<string, string> = {
  neckCenter: 'Centre Col',
  leftShoulder: 'Épaule Gauche',
  rightShoulder: 'Épaule Droite',
  leftArmpit: 'Aisselle Gauche',
  rightArmpit: 'Aisselle Droite',
  leftBottom: 'Bas Gauche',
  rightBottom: 'Bas Droit',
  leftWaist: 'Taille Gauche',
  rightWaist: 'Taille Droite',
  leftAnkle: 'Cheville Gauche',
  rightAnkle: 'Cheville Droite',
};

export const GarmentCleanupModal: React.FC<GarmentCleanupModalProps> = ({
  isOpen,
  garment,
  onClose,
  onSaveSuccess,
}) => {
  const [tool, setTool] = useState<ToolMode>('eraser');
  const [brushSize, setBrushSize] = useState<number>(22);
  const [anchors, setAnchors] = useState<GarmentAnchors | null>(null);
  const [activeAnchorKey, setActiveAnchorKey] = useState<string | null>(null);
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string>('');

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const originalSnapshotRef = useRef<ImageData | null>(null);

  useEffect(() => {
    if (!isOpen || !garment) return;

    const initialAnchors =
      garment.garmentType === 'upper' || garment.category !== 'Pants'
        ? garmentAnchorService.ensureUpperBodyAnchors(garment.anchors as UpperBodyAnchors)
        : garment.anchors;
    setAnchors(initialAnchors);
    setActiveAnchorKey(null);
    setStatusMessage('');

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const processed = GarmentAssetProcessor.processGarmentImage(img, 768);
      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.width = processed.width;
      canvas.height = processed.height;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(processed.canvas, 0, 0);
      originalSnapshotRef.current = ctx.getImageData(0, 0, canvas.width, canvas.height);

      if (processed.hangerRemoved) {
        setStatusMessage('Cintre détecté et pré-nettoyé automatiquement.');
      } else if (processed.backgroundRemoved) {
        setStatusMessage('Fond uni retiré automatiquement.');
      }
    };
    img.src = garment.imagePath;
  }, [isOpen, garment]);

  if (!isOpen || !garment) return null;

  const getCanvasPoint = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
      normX: Math.max(0.01, Math.min(0.99, (e.clientX - rect.left) / rect.width)),
      normY: Math.max(0.01, Math.min(0.99, (e.clientY - rect.top) / rect.height)),
    };
  };

  const eraseAt = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const pt = getCanvasPoint(e);
    if (!pt) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, brushSize, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };

  const handlePointerDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (tool === 'eraser') {
      setIsDrawing(true);
      eraseAt(e);
    } else if (tool === 'anchors' && activeAnchorKey && anchors) {
      const pt = getCanvasPoint(e);
      if (!pt) return;
      setAnchors({
        ...anchors,
        [activeAnchorKey]: {
          x: Math.round(pt.normX * 1000) / 1000,
          y: Math.round(pt.normY * 1000) / 1000,
        },
      });
    }
  };

  const handlePointerMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (tool === 'eraser' && isDrawing) {
      eraseAt(e);
    }
  };

  const handlePointerUp = () => {
    setIsDrawing(false);
  };

  const handleResetMask = () => {
    const canvas = canvasRef.current;
    if (!canvas || !originalSnapshotRef.current) return;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.putImageData(originalSnapshotRef.current, 0, 0);
      setStatusMessage('Image restaurée.');
    }
  };

  const handleSave = () => {
    const canvas = canvasRef.current;
    if (!canvas || !anchors) return;

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    // Re-crop tightly after user erased hanger or stray artifacts
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const tightBox = GarmentAssetProcessor.detectBoundingBox(
      imgData.data,
      canvas.width,
      canvas.height
    );

    const outCanvas = document.createElement('canvas');
    outCanvas.width = tightBox.width;
    outCanvas.height = tightBox.height;
    const outCtx = outCanvas.getContext('2d');
    if (!outCtx) return;

    outCtx.clearRect(0, 0, tightBox.width, tightBox.height);
    outCtx.drawImage(
      canvas,
      tightBox.x,
      tightBox.y,
      tightBox.width,
      tightBox.height,
      0,
      0,
      tightBox.width,
      tightBox.height
    );

    const cleanDataUrl = outCanvas.toDataURL('image/png');

    // Remap anchors into the new tight crop box
    const remapped: Record<string, { x: number; y: number }> = {};
    for (const [k, pt] of Object.entries(anchors)) {
      const px = pt.x * canvas.width;
      const py = pt.y * canvas.height;
      remapped[k] = {
        x: Math.max(0.02, Math.min(0.98, Math.round(((px - tightBox.x) / tightBox.width) * 1000) / 1000)),
        y: Math.max(0.02, Math.min(0.98, Math.round(((py - tightBox.y) / tightBox.height) * 1000) / 1000)),
      };
    }

    const updatedAnchors = remapped as unknown as GarmentAnchors;

    const updatedList = ClothingService.updateItem(garment.id, {
      imagePath: cleanDataUrl,
      imageWidth: tightBox.width,
      imageHeight: tightBox.height,
      hasTransparency: true,
      anchors: updatedAnchors,
    });

    garmentLoader.invalidateItem(garment.id);

    const updatedItem = updatedList.find((item) => item.id === garment.id);
    if (updatedItem) {
      onSaveSuccess(updatedItem);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="bg-[#121622] border border-[#273044] rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1e2637]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white">
              <Eraser className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Nettoyer & Calibrer : {garment.name}</h2>
              <p className="text-[11px] text-slate-400">
                Effacez manuellement un cintre ou ajustez les points d&apos;ancrage (épaules, col)
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

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
          {/* Interactive Canvas */}
          <div className="md:col-span-7 flex flex-col items-center">
            <div
              className="relative rounded-xl border border-[#273044] overflow-hidden max-h-[55vh] flex items-center justify-center"
              style={{
                backgroundImage:
                  'linear-gradient(45deg, #1b2030 25%, transparent 25%), linear-gradient(-45deg, #1b2030 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #1b2030 75%), linear-gradient(-45deg, transparent 75%, #1b2030 75%)',
                backgroundSize: '16px 16px',
                backgroundPosition: '0 0, 0 8px, 8px -8px, -8px 0px',
                backgroundColor: '#121622',
              }}
            >
              <canvas
                ref={canvasRef}
                onMouseDown={handlePointerDown}
                onMouseMove={handlePointerMove}
                onMouseUp={handlePointerUp}
                onMouseLeave={handlePointerUp}
                className={`max-h-[54vh] max-w-full w-auto h-auto block ${
                  tool === 'eraser' ? 'cursor-crosshair' : 'cursor-pointer'
                }`}
              />

              {/* Anchor pins overlay */}
              {tool === 'anchors' &&
                anchors &&
                Object.entries(anchors).map(([key, pt]) => {
                  const isActive = activeAnchorKey === key;
                  return (
                    <div
                      key={key}
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveAnchorKey(key);
                      }}
                      className={`absolute w-3.5 h-3.5 -ml-[7px] -mt-[7px] rounded-full border-2 pointer-events-auto cursor-pointer transition-transform ${
                        isActive
                          ? 'bg-amber-400 border-white scale-125 z-20'
                          : 'bg-indigo-600 border-white'
                      }`}
                      style={{
                        left: `${pt.x * 100}%`,
                        top: `${pt.y * 100}%`,
                      }}
                      title={key}
                    />
                  );
                })}
            </div>

            {statusMessage && (
              <div className="mt-2.5 text-[11px] text-emerald-400 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                <span>{statusMessage}</span>
              </div>
            )}
          </div>

          {/* Right Controls */}
          <div className="md:col-span-5 space-y-4 text-xs">
            {/* Mode Switcher */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setTool('eraser')}
                className={`py-2 px-3 rounded-xl border flex items-center justify-center gap-1.5 font-semibold transition ${
                  tool === 'eraser'
                    ? 'bg-indigo-600 text-white border-indigo-500'
                    : 'bg-[#181d2c] text-slate-300 border-[#273044] hover:text-white'
                }`}
              >
                <Eraser className="w-3.5 h-3.5" />
                <span>Gomme Cintre</span>
              </button>
              <button
                type="button"
                onClick={() => setTool('anchors')}
                className={`py-2 px-3 rounded-xl border flex items-center justify-center gap-1.5 font-semibold transition ${
                  tool === 'anchors'
                    ? 'bg-indigo-600 text-white border-indigo-500'
                    : 'bg-[#181d2c] text-slate-300 border-[#273044] hover:text-white'
                }`}
              >
                <Crosshair className="w-3.5 h-3.5" />
                <span>Points Ancrage</span>
              </button>
            </div>

            {tool === 'eraser' ? (
              <div className="p-4 rounded-xl bg-[#161b29] border border-[#232b3e] space-y-3">
                <div className="flex justify-between text-[11px]">
                  <span className="text-slate-300 font-medium">Taille de la gomme</span>
                  <span className="font-mono text-indigo-400">{brushSize} px</span>
                </div>
                <input
                  type="range"
                  min={6}
                  max={60}
                  value={brushSize}
                  onChange={(e) => setBrushSize(parseInt(e.target.value, 10))}
                  className="w-full h-1.5 bg-[#232b3e] rounded-lg appearance-none cursor-pointer accent-indigo-500"
                />
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Maintenez le clic gauche et passez sur le cintre ou tout résidu de fond pour le
                  rendre transparent. Le vêtement sera recadré automatiquement à la sauvegarde.
                </p>
                <button
                  type="button"
                  onClick={handleResetMask}
                  className="w-full py-2 rounded-lg bg-[#1c2336] hover:bg-[#232c44] text-slate-300 border border-[#2d364d] flex items-center justify-center gap-1.5 transition"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Réinitialiser le gommage</span>
                </button>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-[#161b29] border border-[#232b3e] space-y-2.5">
                <span className="text-[11px] text-slate-300 font-medium block">
                  Sélectionnez un point puis cliquez sur le vêtement :
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {anchors &&
                    Object.keys(anchors).map((key) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setActiveAnchorKey(key)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] border transition ${
                          activeAnchorKey === key
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500 font-bold'
                            : 'bg-[#1c2336] text-slate-300 border-[#2d364d] hover:text-white'
                        }`}
                      >
                        {ANCHOR_LABELS[key] || key}
                      </button>
                    ))}
                </div>
                {activeAnchorKey && (
                  <p className="text-[11px] text-amber-300 pt-1">
                    Cliquez sur l&apos;image pour placer <strong>{activeAnchorKey}</strong>.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[#1e2637]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-[#181d2c] text-slate-300 hover:text-white border border-[#273044] text-xs transition"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 transition shadow-md shadow-indigo-600/30"
          >
            <Check className="w-4 h-4" />
            <span>Appliquer & Enregistrer</span>
          </button>
        </div>
      </div>
    </div>
  );
};
