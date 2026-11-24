import React, { useEffect, useRef, useState } from 'react';
import { ClothingItem } from '../../clothing/types/clothing';
import { useAITryOn } from '../hooks/useAITryOn';
import {
  X,
  Sparkles,
  Camera,
  Upload,
  Loader2,
  AlertCircle,
  Download,
  RefreshCw,
  CheckCircle2,
} from 'lucide-react';

interface AITryOnModalProps {
  isOpen: boolean;
  onClose: () => void;
  garment: ClothingItem | null;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  isCameraActive: boolean;
  isMirrored: boolean;
}

function resizeImageToDataUrl(img: HTMLImageElement, maxDim: number = 1280): string {
  let w = img.naturalWidth || img.width;
  let h = img.naturalHeight || img.height;
  if (w > maxDim || h > maxDim) {
    const ratio = Math.min(maxDim / w, maxDim / h);
    w = Math.round(w * ratio);
    h = Math.round(h * ratio);
  }
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D indisponible');
  ctx.drawImage(img, 0, 0, w, h);
  return canvas.toDataURL('image/jpeg', 0.92);
}

export const AITryOnModal: React.FC<AITryOnModalProps> = ({
  isOpen,
  onClose,
  garment,
  videoRef,
  isCameraActive,
  isMirrored,
}) => {
  const { activeJob, providerStatus, isLoading, error, refreshStatus, submitJob, resetJob } =
    useAITryOn();

  const [personDataUrl, setPersonDataUrl] = useState<string | null>(null);
  const [resolution, setResolution] = useState<'default' | '2k'>('default');
  const [localError, setLocalError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      setLocalError(null);
      void refreshStatus(true);
    } else {
      resetJob();
    }
  }, [isOpen, refreshStatus, resetJob]);

  if (!isOpen || !garment) return null;

  const handleCaptureFromCamera = () => {
    setLocalError(null);
    const video = videoRef.current;
    if (!video || !isCameraActive || video.videoWidth === 0) {
      setLocalError('Activez la caméra pour capturer une photo.');
      return;
    }

    const canvas = document.createElement('canvas');
    const maxDim = 1280;
    let w = video.videoWidth;
    let h = video.videoHeight;
    if (w > maxDim || h > maxDim) {
      const ratio = Math.min(maxDim / w, maxDim / h);
      w = Math.round(w * ratio);
      h = Math.round(h * ratio);
    }
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (isMirrored) {
      ctx.translate(w, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, 0, 0, w, h);
    setPersonDataUrl(canvas.toDataURL('image/jpeg', 0.92));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    if (!['image/png', 'image/jpeg', 'image/jpg', 'image/webp'].includes(file.type)) {
      setLocalError('Format non supporté. Utilisez PNG, JPG ou WEBP.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        try {
          setPersonDataUrl(resizeImageToDataUrl(img, 1280));
        } catch (err) {
          setLocalError(err instanceof Error ? err.message : 'Erreur lecture image');
        }
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleGenerate = async () => {
    setLocalError(null);
    if (!personDataUrl) {
      setLocalError('Capturez ou importez d’abord une photo de vous.');
      return;
    }

    await submitJob(personDataUrl, garment.imagePath, {
      garmentId: garment.id,
      garmentTitle: garment.name,
      garmentDescription: garment.description,
      category: garment.category,
      resolution,
    });
  };

  const displayError = localError || error;
  const resultUrl = activeJob?.status === 'completed' ? activeJob.resultImageUrl : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="bg-[#121622] border border-[#273044] rounded-2xl w-full max-w-4xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1e2637]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Essayage IA Haute Précision (Genlook)</h2>
              <p className="text-[11px] text-slate-400">
                Vêtement sélectionné : <strong className="text-slate-200">{garment.name}</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {providerStatus && (
              <div
                className={`px-2.5 py-1 rounded-lg border text-[11px] font-mono flex items-center gap-1.5 ${
                  providerStatus.configured && !providerStatus.error
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                    : 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    providerStatus.configured && !providerStatus.error
                      ? 'bg-emerald-400'
                      : 'bg-amber-400'
                  }`}
                />
                <span>
                  {providerStatus.configured
                    ? providerStatus.creditBalance !== undefined
                      ? `Genlook prêt • ${providerStatus.creditBalance} crédits`
                      : 'Genlook configuré'
                    : 'Non configuré'}
                </span>
              </div>
            )}
            <button
              onClick={onClose}
              className="p-1 text-slate-400 hover:text-white rounded-lg transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* Left: Person & Garment Source */}
          <div className="md:col-span-5 space-y-4">
            <div className="bg-[#161b29] border border-[#232b3e] rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-white">1. Photo du modèle</span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handleCaptureFromCamera}
                    disabled={!isCameraActive || isLoading}
                    className="px-2.5 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 disabled:opacity-40 text-indigo-300 border border-indigo-500/30 text-[11px] font-medium flex items-center gap-1 transition"
                    title={
                      isCameraActive
                        ? 'Capturer depuis la webcam'
                        : 'Activez d’abord la caméra'
                    }
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>Webcam</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isLoading}
                    className="px-2.5 py-1.5 rounded-lg bg-[#1c2336] hover:bg-[#232c44] disabled:opacity-40 text-slate-200 border border-[#2d364d] text-[11px] font-medium flex items-center gap-1 transition"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Importer</span>
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </div>
              </div>

              <div className="aspect-[3/4] w-full rounded-xl bg-[#0e121b] border border-[#232b3e] flex items-center justify-center overflow-hidden">
                {personDataUrl ? (
                  <img
                    src={personDataUrl}
                    alt="Modèle"
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="text-center p-4 text-xs text-slate-400 space-y-1">
                    <Camera className="w-7 h-7 mx-auto text-slate-500 mb-2" />
                    <p>Capturez votre flux webcam ou importez une photo portrait / plein pied.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Garment preview & options */}
            <div className="bg-[#161b29] border border-[#232b3e] rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-3">
                <img
                  src={garment.imagePath}
                  alt={garment.name}
                  className="w-12 h-12 rounded-lg object-contain bg-[#1c2233] border border-[#2d354b]"
                />
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-semibold text-white truncate">{garment.name}</div>
                  <div className="text-[11px] text-slate-400">{garment.category}</div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-[#232b3e]">
                <span className="text-[11px] text-slate-300">Résolution de sortie</span>
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => setResolution('default')}
                    className={`px-2.5 py-1 rounded-lg text-[11px] border transition ${
                      resolution === 'default'
                        ? 'bg-indigo-600 text-white border-indigo-500 font-semibold'
                        : 'bg-[#1c2336] text-slate-300 border-[#2d364d]'
                    }`}
                  >
                    Standard (1 crédit)
                  </button>
                  <button
                    type="button"
                    onClick={() => setResolution('2k')}
                    className={`px-2.5 py-1 rounded-lg text-[11px] border transition ${
                      resolution === '2k'
                        ? 'bg-indigo-600 text-white border-indigo-500 font-semibold'
                        : 'bg-[#1c2336] text-slate-300 border-[#2d364d]'
                    }`}
                  >
                    2K HD (2 crédits)
                  </button>
                </div>
              </div>

              <button
                type="button"
                onClick={handleGenerate}
                disabled={isLoading || !personDataUrl || !providerStatus?.configured}
                className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-600/40 disabled:cursor-not-allowed text-white text-xs font-semibold flex items-center justify-center gap-2 transition shadow-md shadow-indigo-600/25"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>
                      {activeJob?.status === 'queued'
                        ? 'En file d’attente...'
                        : 'Génération IA Genlook en cours...'}
                    </span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Générer avec Genlook IA</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Right: Generated Result */}
          <div className="md:col-span-7 flex flex-col bg-[#161b29] border border-[#232b3e] rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-white">2. Résultat Essayage IA</span>
              {resultUrl && (
                <a
                  href={resultUrl}
                  download={`genlook-${garment.id}.png`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-2.5 py-1 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 text-[11px] font-medium flex items-center gap-1 transition"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Télécharger</span>
                </a>
              )}
            </div>

            {displayError && (
              <div className="mb-3 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{displayError}</span>
              </div>
            )}

            {providerStatus?.error && !displayError && (
              <div className="mb-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{providerStatus.error}</span>
              </div>
            )}

            <div className="flex-1 min-h-[380px] rounded-xl bg-[#0e121b] border border-[#232b3e] flex items-center justify-center overflow-hidden relative">
              {resultUrl ? (
                <>
                  <img
                    src={resultUrl}
                    alt="Résultat Genlook Try-On"
                    className="w-full h-full object-contain"
                  />
                  <div className="absolute bottom-3 left-3 px-2.5 py-1 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[11px] flex items-center gap-1.5 backdrop-blur-md">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Génération terminée</span>
                  </div>
                </>
              ) : isLoading ? (
                <div className="text-center p-6 space-y-3">
                  <Loader2 className="w-8 h-8 animate-spin text-indigo-400 mx-auto" />
                  <div className="text-xs font-medium text-white">
                    Traitement IA en cours ({activeJob?.progress ?? 15}%)
                  </div>
                  <p className="text-[11px] text-slate-400 max-w-xs">
                    Genlook ajuste le vêtement sur votre silhouette (~5 à 10 secondes)...
                  </p>
                </div>
              ) : (
                <div className="text-center p-6 text-xs text-slate-400 space-y-2 max-w-xs">
                  <Sparkles className="w-7 h-7 mx-auto text-indigo-400/60" />
                  <p>
                    Le rendu photoréaliste généré par l&apos;API Genlook apparaîtra ici.
                  </p>
                  {activeJob?.id && (
                    <button
                      type="button"
                      onClick={() => void refreshStatus(true)}
                      className="inline-flex items-center gap-1 text-[11px] text-indigo-400 hover:text-indigo-300"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>Actualiser les crédits</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
