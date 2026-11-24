import React, { useEffect, useRef, useState } from 'react';
import { ClothingItem } from '../../clothing/types/clothing';
import { CameraStatus } from '../../camera/types/camera';
import { useAITryOn } from '../hooks/useAITryOn';
import {
  Sparkles,
  Camera,
  CameraOff,
  Upload,
  Loader2,
  AlertCircle,
  Download,
  RefreshCw,
  CheckCircle2,
  FlipHorizontal,
  Eraser,
  Aperture,
} from 'lucide-react';

interface AITryOnWorkspaceProps {
  garment: ClothingItem | null;
  cameraStatus: CameraStatus;
  cameraStream: MediaStream | null;
  isMirrored: boolean;
  cameraError: string | null;
  onStartCamera: () => Promise<void>;
  onStopCamera: () => void;
  onToggleMirror: () => void;
  onOpenCleanup: () => void;
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

export const AITryOnWorkspace: React.FC<AITryOnWorkspaceProps> = ({
  garment,
  cameraStatus,
  cameraStream,
  isMirrored,
  cameraError,
  onStartCamera,
  onStopCamera,
  onToggleMirror,
  onOpenCleanup,
}) => {
  const { activeJob, providerStatus, isLoading, error, refreshStatus, submitJob } = useAITryOn();

  const [personDataUrl, setPersonDataUrl] = useState<string | null>(null);
  const [showCameraFeed, setShowCameraFeed] = useState<boolean>(false);
  const [resolution, setResolution] = useState<'default' | '2k'>('default');
  const [localError, setLocalError] = useState<string | null>(null);

  const previewVideoRef = useRef<HTMLVideoElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Check Genlook status & credits on mount
  useEffect(() => {
    void refreshStatus(true);
  }, [refreshStatus]);

  // Bind live camera stream to preview video element whenever camera is active
  useEffect(() => {
    const video = previewVideoRef.current;
    if (video && cameraStream && showCameraFeed) {
      video.srcObject = cameraStream;
      video.play().catch(() => {
        // Autoplay handled silently
      });
    }
  }, [cameraStream, showCameraFeed, cameraStatus]);

  const handleOpenWebcamCapture = async () => {
    setLocalError(null);
    setShowCameraFeed(true);
    if (cameraStatus !== 'active') {
      await onStartCamera();
    }
  };

  const handleCaptureSnapshot = () => {
    setLocalError(null);
    const video = previewVideoRef.current;
    if (!video || cameraStatus !== 'active' || video.videoWidth === 0) {
      setLocalError('Flux vidéo non prêt. Patientez un instant.');
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
    setShowCameraFeed(false);
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
          setShowCameraFeed(false);
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
    if (!garment) {
      setLocalError('Sélectionnez d’abord un vêtement dans le catalogue à droite.');
      return;
    }
    if (!personDataUrl) {
      setLocalError('Ajoutez ou capturez d’abord votre photo (panneau de gauche).');
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

  const displayError = localError || error || (showCameraFeed ? cameraError : null);
  const resultUrl = activeJob?.status === 'completed' ? activeJob.resultImageUrl : null;

  return (
    <div className="flex-1 flex flex-col gap-4 min-h-0">
      {/* Main 2-panel AI Try-On Studio */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-4 min-h-0">
        {/* Stage 1: Person Photo / Camera Capture */}
        <div className="flex flex-col rounded-2xl bg-[#141824] border border-[#222838] p-4 min-h-0">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-white flex items-center gap-2">
              <span className="w-5 h-5 rounded-md bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center text-[11px]">
                1
              </span>
              <span>Votre Photo (Modèle)</span>
            </span>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleOpenWebcamCapture}
                disabled={isLoading}
                className={`px-2.5 py-1.5 rounded-lg text-[11px] font-medium flex items-center gap-1 border transition ${
                  showCameraFeed
                    ? 'bg-indigo-600 text-white border-indigo-500'
                    : 'bg-[#1a2030] hover:bg-[#222a3f] text-slate-200 border-[#2b344b]'
                }`}
              >
                <Camera className="w-3.5 h-3.5" />
                <span>Webcam</span>
              </button>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isLoading}
                className="px-2.5 py-1.5 rounded-lg bg-[#1a2030] hover:bg-[#222a3f] text-slate-200 border border-[#2b344b] text-[11px] font-medium flex items-center gap-1 transition"
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

          <div className="flex-1 relative rounded-xl bg-[#0d0f15] border border-[#1e2536] flex flex-col items-center justify-center overflow-hidden min-h-[260px]">
            {showCameraFeed ? (
              <>
                <video
                  ref={previewVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className={`w-full h-full object-cover ${
                    cameraStatus === 'active' ? 'opacity-100' : 'opacity-0'
                  } ${isMirrored ? 'scale-x-[-1]' : ''}`}
                />

                {cameraStatus === 'initializing' && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-[#0d0f15]/80">
                    <Loader2 className="w-7 h-7 animate-spin text-indigo-400" />
                    <span className="text-xs text-slate-300">Démarrage de la caméra...</span>
                  </div>
                )}

                {cameraStatus === 'active' && (
                  <>
                    <div className="absolute top-3 right-3 flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={onToggleMirror}
                        className={`p-2 rounded-lg backdrop-blur-md border transition ${
                          isMirrored
                            ? 'bg-indigo-600/80 text-white border-indigo-500'
                            : 'bg-[#0d0f15]/80 text-slate-300 border-[#222838]'
                        }`}
                        title="Mode miroir"
                      >
                        <FlipHorizontal className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowCameraFeed(false);
                          onStopCamera();
                        }}
                        className="p-2 rounded-lg bg-rose-600/80 hover:bg-rose-600 text-white border border-rose-500 transition"
                        title="Fermer la caméra"
                      >
                        <CameraOff className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={handleCaptureSnapshot}
                      className="absolute bottom-4 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-2 shadow-xl shadow-indigo-600/40 transition"
                    >
                      <Aperture className="w-4 h-4" />
                      <span>Capturer cette photo</span>
                    </button>
                  </>
                )}
              </>
            ) : personDataUrl ? (
              <img
                src={personDataUrl}
                alt="Photo du modèle"
                className="w-full h-full object-contain"
              />
            ) : (
              <div className="text-center p-6 max-w-xs space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-[#161b29] border border-[#273044] flex items-center justify-center text-indigo-400 mx-auto">
                  <Camera className="w-7 h-7" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-xs font-semibold text-white">Ajoutez votre photo</h3>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Prenez une photo face à la webcam ou importez une image (buste ou plein pied).
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-2 justify-center">
                  <button
                    type="button"
                    onClick={handleOpenWebcamCapture}
                    className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>Prendre photo</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3.5 py-2 rounded-xl bg-[#1a2030] hover:bg-[#232b40] text-slate-200 border border-[#2d364d] text-xs font-medium flex items-center justify-center gap-1.5 transition"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Fichier PC</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Stage 2: Genlook AI Try-On Result */}
        <div className="flex flex-col rounded-2xl bg-[#141824] border border-[#222838] p-4 min-h-0">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-white flex items-center gap-2">
              <span className="w-5 h-5 rounded-md bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center text-[11px]">
                2
              </span>
              <span>Résultat Essai IA (Genlook)</span>
            </span>

            <div className="flex items-center gap-2">
              {providerStatus && (
                <button
                  type="button"
                  onClick={() => void refreshStatus(true)}
                  title="Actualiser le solde de crédits Genlook"
                  className={`px-2.5 py-1 rounded-lg border text-[11px] font-mono flex items-center gap-1.5 transition ${
                    providerStatus.configured && !providerStatus.error
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
                      : 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      providerStatus.configured && !providerStatus.error
                        ? 'bg-emerald-400'
                        : 'bg-amber-400'
                    }`}
                  />
                  <span>
                    {providerStatus.configured
                      ? providerStatus.creditBalance !== undefined
                        ? `${providerStatus.creditBalance} crédits`
                        : 'Genlook prêt'
                      : 'Clé requise'}
                  </span>
                  <RefreshCw className="w-3 h-3 opacity-75" />
                </button>
              )}

              {resultUrl && (
                <a
                  href={resultUrl}
                  download={`genlook-${garment?.id || 'result'}.png`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-2.5 py-1 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 text-[11px] font-medium flex items-center gap-1 transition"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Télécharger</span>
                </a>
              )}
            </div>
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

          <div className="flex-1 relative rounded-xl bg-[#0d0f15] border border-[#1e2536] flex flex-col items-center justify-center overflow-hidden min-h-[260px]">
            {resultUrl ? (
              <>
                <img
                  src={resultUrl}
                  alt="Résultat Genlook Try-On"
                  className="w-full h-full object-contain"
                />
                <div className="absolute bottom-3 left-3 px-2.5 py-1 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[11px] flex items-center gap-1.5 backdrop-blur-md">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Essayage IA terminé</span>
                </div>
              </>
            ) : isLoading ? (
              <div className="text-center p-6 space-y-3">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-400 mx-auto" />
                <div className="text-xs font-semibold text-white">
                  Génération Genlook en cours ({activeJob?.progress ?? 20}%)
                </div>
                <p className="text-[11px] text-slate-400 max-w-xs">
                  Adaptation photoréaliste du vêtement sur votre silhouette (~5 à 10 secondes)...
                </p>
              </div>
            ) : (
              <div className="text-center p-6 max-w-xs space-y-2">
                <Sparkles className="w-8 h-8 mx-auto text-indigo-400/60 mb-1" />
                <h3 className="text-xs font-semibold text-slate-200">Rendu IA Photoréaliste</h3>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Sélectionnez un vêtement à droite, ajoutez votre photo à gauche, puis cliquez sur{' '}
                  <strong className="text-indigo-300">Générer l&apos;Essai IA</strong>.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Selected Garment & Primary Generate Action Bar */}
      {garment && (
        <div className="bg-[#141824] border border-[#222838] rounded-2xl p-3.5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <img
              src={garment.imagePath}
              alt={garment.name}
              className="w-12 h-12 rounded-xl object-contain bg-[#1c2233] border border-[#2d354b] shrink-0"
            />
            <div className="min-w-0">
              <span className="text-[10px] uppercase tracking-wider text-indigo-400 font-semibold">
                Vêtement sélectionné {garment.isCustom && '• Importé'}
              </span>
              <div className="text-xs font-bold text-white truncate">{garment.name}</div>
              <div className="text-[11px] text-slate-400">
                {garment.category} • {garment.price}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Resolution Switch */}
            <div className="flex items-center bg-[#0d0f15] p-1 rounded-xl border border-[#222838]">
              <button
                type="button"
                onClick={() => setResolution('default')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition ${
                  resolution === 'default'
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Standard (1 cr.)
              </button>
              <button
                type="button"
                onClick={() => setResolution('2k')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition ${
                  resolution === '2k'
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                2K HD (2 cr.)
              </button>
            </div>

            <button
              type="button"
              onClick={onOpenCleanup}
              className="p-2.5 rounded-xl bg-[#181d2c] hover:bg-[#20273a] text-slate-300 hover:text-white border border-[#2d354b] transition"
              title="Nettoyer l'image / retirer un cintre"
            >
              <Eraser className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={handleGenerate}
              disabled={isLoading || !personDataUrl || !providerStatus?.configured}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-600/40 disabled:cursor-not-allowed text-white text-xs font-bold flex items-center gap-2 transition shadow-lg shadow-indigo-600/25"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Génération en cours...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Générer l&apos;Essai IA</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
