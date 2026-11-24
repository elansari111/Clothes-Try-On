import React, { useState, useRef, useEffect } from 'react';
import {
  ClothingItem,
  GarmentCalibration,
  ClothingService,
  ClothingImportModal,
  GarmentCleanupModal,
} from '../features/clothing';
import {
  TryOnAdjustments,
  DebugRenderOptions,
  virtualTryOnEngine,
} from '../features/live-ar';
import { useCamera, VideoResolution } from '../features/camera';
import { usePoseTracking } from '../features/body-tracking';
import { AITryOnModal } from '../features/ai-try-on';
import {
  Camera,
  CameraOff,
  Sparkles,
  SlidersHorizontal,
  Shirt,
  RotateCw,
  FlipHorizontal,
  Loader2,
  AlertCircle,
  X,
  ChevronDown,
  Activity,
  Scan,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  RotateCcw,
  Eraser,
  Bug,
  Save,
  Check,
} from 'lucide-react';

const INITIAL_ADJUSTMENTS: TryOnAdjustments = {
  scale: 1.0,
  shoulderWidthScale: 1.0,
  garmentWidthScale: 1.0,
  garmentHeightScale: 1.0,
  necklineOffsetY: 0,
  offsetX: 0,
  offsetY: 0,
  rotationOffsetDeg: 0,
  meshWarpStrength: 0.8,
  opacity: 0.96,
  enableWarping: true,
  enableArmOcclusion: false,
};

export const App: React.FC = () => {
  // Load persisted clothes from ClothingService
  const [clothesList, setClothesList] = useState<ClothingItem[]>(() => ClothingService.getClothes());
  const [selectedGarment, setSelectedGarment] = useState<ClothingItem>(() => {
    const initial = ClothingService.getClothes();
    return initial[0];
  });

  const [filter, setFilter] = useState<string>('All');
  const [showSettingsModal, setShowSettingsModal] = useState<boolean>(false);
  const [showImportModal, setShowImportModal] = useState<boolean>(false);
  const [showCleanupModal, setShowCleanupModal] = useState<boolean>(false);
  const [showAITryOnModal, setShowAITryOnModal] = useState<boolean>(false);
  const [showSkeleton, setShowSkeleton] = useState<boolean>(false);
  const [showGarment, setShowGarment] = useState<boolean>(true);
  const [adjustments, setAdjustments] = useState<TryOnAdjustments>(INITIAL_ADJUSTMENTS);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string>('');
  const [showDebugDrawer, setShowDebugDrawer] = useState<boolean>(false);
  const [debugOptions, setDebugOptions] = useState<DebugRenderOptions>({
    showSkeleton: false,
    showLandmarks: false,
    showReferenceLines: false,
    showGarmentAnchors: false,
    showBoundingBox: false,
    showMeshWireframe: false,
    showTransformCenter: false,
    showConfidence: false,
    showArmOcclusion: false,
  });

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const {
    status: cameraStatus,
    devices,
    activeDeviceId,
    resolution,
    isMirrored,
    errorMessage,
    videoRef,
    startCamera,
    stopCamera,
    restartCamera,
    switchDevice,
    changeResolution,
    toggleMirror,
  } = useCamera();

  // MediaPipe Pose tracking + Virtual Try-On unified loop
  const {
    status: poseStatus,
    delegate,
    fps,
    renderLatencyMs,
    confidence,
    measurements,
    assetStatus,
  } = usePoseTracking({
    videoRef,
    canvasRef,
    isCameraActive: cameraStatus === 'active',
    isMirrored,
    showSkeleton,
    selectedGarment,
    showGarment,
    adjustments,
    debugOptions,
  });

  const categories = ['All', 'T-Shirts', 'Shirts', 'Jackets', 'Pants', 'Other'];

  const filteredClothes =
    filter === 'All' ? clothesList : clothesList.filter((c) => c.category === filter);

  // Refresh clothing list when an item is imported or removed
  const refreshClothes = () => {
    const updated = ClothingService.getClothes();
    setClothesList(updated);
    if (!updated.some((item) => item.id === selectedGarment?.id)) {
      if (updated.length > 0) {
        setSelectedGarment(updated[0]);
      }
    }
  };

  const handleDeleteClothing = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm('Voulez-vous supprimer ce vêtement ?')) {
      const updated = ClothingService.deleteItem(id);
      setClothesList(updated);
      if (selectedGarment.id === id && updated.length > 0) {
        setSelectedGarment(updated[0]);
      }
    }
  };

  const handleResetAdjustments = () => {
    if (selectedGarment?.calibration) {
      setAdjustments({
        scale: selectedGarment.calibration.scale ?? 1.0,
        shoulderWidthScale: selectedGarment.calibration.shoulderWidthScale ?? 1.0,
        garmentWidthScale: selectedGarment.calibration.garmentWidthScale ?? 1.0,
        garmentHeightScale: selectedGarment.calibration.garmentHeightScale ?? 1.0,
        necklineOffsetY: selectedGarment.calibration.necklineOffsetY ?? 0,
        offsetX: selectedGarment.calibration.offsetX ?? 0,
        offsetY: selectedGarment.calibration.offsetY ?? 0,
        rotationOffsetDeg: selectedGarment.calibration.rotationOffsetDeg ?? 0,
        meshWarpStrength: selectedGarment.calibration.meshWarpStrength ?? 0.8,
        opacity: selectedGarment.calibration.opacity ?? 0.96,
        enableWarping: selectedGarment.calibration.enableWarping ?? true,
        enableArmOcclusion: selectedGarment.calibration.enableArmOcclusion ?? false,
      });
    } else {
      setAdjustments(INITIAL_ADJUSTMENTS);
    }
    virtualTryOnEngine.resetTransform();
  };

  // Load per-garment calibration when selectedGarment changes
  useEffect(() => {
    if (!selectedGarment) return;
    if (selectedGarment.calibration) {
      setAdjustments({
        scale: selectedGarment.calibration.scale ?? 1.0,
        shoulderWidthScale: selectedGarment.calibration.shoulderWidthScale ?? 1.0,
        garmentWidthScale: selectedGarment.calibration.garmentWidthScale ?? 1.0,
        garmentHeightScale: selectedGarment.calibration.garmentHeightScale ?? 1.0,
        necklineOffsetY: selectedGarment.calibration.necklineOffsetY ?? 0,
        offsetX: selectedGarment.calibration.offsetX ?? 0,
        offsetY: selectedGarment.calibration.offsetY ?? 0,
        rotationOffsetDeg: selectedGarment.calibration.rotationOffsetDeg ?? 0,
        meshWarpStrength: selectedGarment.calibration.meshWarpStrength ?? 0.8,
        opacity: selectedGarment.calibration.opacity ?? 0.96,
        enableWarping: selectedGarment.calibration.enableWarping ?? true,
        enableArmOcclusion: selectedGarment.calibration.enableArmOcclusion ?? false,
      });
    } else {
      setAdjustments(INITIAL_ADJUSTMENTS);
    }
    virtualTryOnEngine.resetTransform();
  }, [selectedGarment?.id]);

  const handleSaveCalibration = () => {
    if (!selectedGarment) return;
    const calib: GarmentCalibration = {
      scale: adjustments.scale,
      shoulderWidthScale: adjustments.shoulderWidthScale,
      garmentWidthScale: adjustments.garmentWidthScale ?? 1.0,
      garmentHeightScale: adjustments.garmentHeightScale ?? 1.0,
      necklineOffsetY: adjustments.necklineOffsetY,
      offsetX: adjustments.offsetX,
      offsetY: adjustments.offsetY,
      rotationOffsetDeg: adjustments.rotationOffsetDeg ?? 0,
      meshWarpStrength: adjustments.meshWarpStrength ?? 0.8,
      opacity: adjustments.opacity,
      enableWarping: adjustments.enableWarping,
      enableArmOcclusion: adjustments.enableArmOcclusion ?? false,
    };
    const updated = ClothingService.saveCalibration(selectedGarment.id, calib);
    setClothesList(updated);
    const updatedGarment = updated.find((c) => c.id === selectedGarment.id);
    if (updatedGarment) setSelectedGarment(updatedGarment);

    setSaveSuccessMessage('Calibration sauvegardée !');
    setTimeout(() => setSaveSuccessMessage(''), 2500);
  };

  // Sync selectedGarment if empty
  useEffect(() => {
    if (!selectedGarment && clothesList.length > 0) {
      setSelectedGarment(clothesList[0]);
    }
  }, [clothesList, selectedGarment]);

  // Dynamic Camera status display
  const getCameraStatusDisplay = () => {
    switch (cameraStatus) {
      case 'active':
        return {
          label: 'Caméra active',
          dotClass: 'bg-emerald-500 animate-pulse',
          textClass: 'text-emerald-400',
        };
      case 'initializing':
        return {
          label: 'Démarrage...',
          dotClass: 'bg-amber-400 animate-ping',
          textClass: 'text-amber-400',
        };
      case 'error':
        return {
          label: 'Erreur caméra',
          dotClass: 'bg-rose-500',
          textClass: 'text-rose-400',
        };
      case 'ready':
      default:
        return {
          label: 'Caméra prête',
          dotClass: 'bg-slate-500',
          textClass: 'text-slate-400',
        };
    }
  };

  // Dynamic Pose Tracking status display
  const getPoseStatusDisplay = () => {
    switch (poseStatus) {
      case 'active':
        return {
          label: `Corps détecté (${confidence}%)`,
          dotClass: 'bg-emerald-400',
          textClass: 'text-emerald-400',
        };
      case 'detecting':
        return {
          label: 'Recherche du corps...',
          dotClass: 'bg-cyan-400 animate-pulse',
          textClass: 'text-cyan-400',
        };
      case 'initializing':
        return {
          label: 'Modèle IA en chargement...',
          dotClass: 'bg-amber-400 animate-spin',
          textClass: 'text-amber-400',
        };
      case 'lost':
        return {
          label: 'Suivi perdu',
          dotClass: 'bg-amber-500',
          textClass: 'text-amber-400',
        };
      case 'error':
        return {
          label: 'Erreur détection',
          dotClass: 'bg-rose-500',
          textClass: 'text-rose-400',
        };
      case 'no_person':
      default:
        return {
          label: 'Aucun utilisateur détecté',
          dotClass: 'bg-slate-500',
          textClass: 'text-slate-400',
        };
    }
  };

  const cameraDisplay = getCameraStatusDisplay();
  const poseDisplay = getPoseStatusDisplay();

  return (
    <div className="flex h-screen w-screen bg-[#0d0f15] text-slate-100 font-sans select-none overflow-hidden">
      {/* 1. Zone Principale : Miroir / Webcam (Gauche) */}
      <div className="flex-1 flex flex-col p-6 border-r border-[#1e2330]">
        {/* Header simple avec sélecteur direct de toutes les caméras */}
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

          <div className="flex items-center gap-3">
            {/* Sélecteur direct de toutes les caméras disponibles */}
            <div className="relative flex items-center">
              <Camera className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 pointer-events-none" />
              <select
                value={activeDeviceId || ''}
                onChange={(e) => switchDevice(e.target.value)}
                className="pl-8 pr-7 py-1.5 bg-[#141824] hover:bg-[#1a2030] border border-[#222838] hover:border-indigo-500/50 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-indigo-500 appearance-none cursor-pointer transition max-w-[210px] truncate"
                title="Sélectionner la caméra"
              >
                {devices.length === 0 ? (
                  <option value="">Caméra par défaut</option>
                ) : (
                  devices.map((device, idx) => (
                    <option key={device.deviceId} value={device.deviceId}>
                      {device.label || `Caméra ${idx + 1}`}
                    </option>
                  ))
                )}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 pointer-events-none" />
            </div>

            {/* Badge Tracking Body Status, FPS & Latency lorsque la caméra est active */}
            {cameraStatus === 'active' && (
              <div className="flex items-center gap-2 text-xs px-2.5 py-1 rounded-xl bg-[#141824] border border-[#222838]">
                <Activity className="w-3.5 h-3.5 text-indigo-400" />
                <span className="text-[11px] font-mono text-slate-300">
                  {fps} FPS • {renderLatencyMs}ms • {delegate}
                </span>
              </div>
            )}

            {/* Indicateur de statut de la caméra */}
            <div className="flex items-center gap-2 text-xs px-2.5 py-1 rounded-xl bg-[#141824] border border-[#222838]">
              <span className={`w-2 h-2 rounded-full ${cameraDisplay.dotClass}`}></span>
              <span className={cameraDisplay.textClass}>{cameraDisplay.label}</span>
            </div>
          </div>
        </div>

        {/* Cadre Caméra / Miroir */}
        <div className="flex-1 relative rounded-2xl bg-[#141824] border border-[#222838] flex flex-col items-center justify-center overflow-hidden">
          {/* Vidéo de flux en direct */}
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${
              cameraStatus === 'active' ? 'opacity-100' : 'opacity-0 pointer-events-none'
            } ${isMirrored ? 'scale-x-[-1]' : ''}`}
          />

          {/* Canvas 2D unifié pour le rendu Virtual Try-On + Squelette */}
          <canvas
            ref={canvasRef}
            className={`absolute inset-0 w-full h-full object-cover pointer-events-none transition-opacity duration-200 ${
              cameraStatus === 'active' ? 'opacity-100' : 'opacity-0'
            }`}
          />

          {/* HUD d'état du suivi corporel en haut à gauche */}
          {cameraStatus === 'active' && (
            <div className="absolute top-4 left-4 z-10 flex items-center gap-2 bg-[#0d0f15]/85 backdrop-blur-md border border-[#222838] px-3 py-1.5 rounded-xl text-xs">
              <span className={`w-2 h-2 rounded-full ${poseDisplay.dotClass}`} />
              <span className={`font-medium ${poseDisplay.textClass}`}>{poseDisplay.label}</span>
            </div>
          )}

          {/* Contrôles HUD rapides quand la caméra est active */}
          {cameraStatus === 'active' && (
            <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
              {/* Toggle Vêtement (Afficher / Masquer) */}
              <button
                onClick={() => setShowGarment((prev) => !prev)}
                className={`p-2 rounded-xl backdrop-blur-md border transition ${
                  showGarment
                    ? 'bg-indigo-600/80 text-white border-indigo-500'
                    : 'bg-[#0d0f15]/80 text-slate-300 hover:text-white border-[#222838]'
                }`}
                title={showGarment ? 'Masquer le vêtement' : 'Afficher le vêtement'}
              >
                {showGarment ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              </button>

              {/* Toggle Squelette */}
              <button
                onClick={() => setShowSkeleton((prev) => !prev)}
                className={`p-2 rounded-xl backdrop-blur-md border transition ${
                  showSkeleton
                    ? 'bg-indigo-600/80 text-white border-indigo-500'
                    : 'bg-[#0d0f15]/80 text-slate-300 hover:text-white border-[#222838]'
                }`}
                title={showSkeleton ? 'Masquer le squelette' : 'Afficher le squelette'}
              >
                <Scan className="w-4 h-4" />
              </button>

              {/* Mode Développeur / Diagnostics */}
              <button
                onClick={() => setShowDebugDrawer((prev) => !prev)}
                className={`p-2 rounded-xl backdrop-blur-md border transition ${
                  showDebugDrawer
                    ? 'bg-amber-500/80 text-white border-amber-400 shadow-md shadow-amber-500/20'
                    : 'bg-[#0d0f15]/80 text-slate-300 hover:text-white border-[#222838]'
                }`}
                title="Mode Développeur : Diagnostics, Repères & Wireframe"
              >
                <Bug className="w-4 h-4" />
              </button>

              {/* Mode Miroir (Selfie) */}
              <button
                onClick={toggleMirror}
                className={`p-2 rounded-xl backdrop-blur-md border transition ${
                  isMirrored
                    ? 'bg-indigo-600/80 text-white border-indigo-500'
                    : 'bg-[#0d0f15]/80 text-slate-300 hover:text-white border-[#222838]'
                }`}
                title="Mode miroir (Selfie)"
              >
                <FlipHorizontal className="w-4 h-4" />
              </button>

              {/* Redémarrer la caméra */}
              <button
                onClick={() => restartCamera()}
                className="p-2 rounded-xl bg-[#0d0f15]/80 hover:bg-[#181d2c] text-slate-300 hover:text-white backdrop-blur-md border border-[#222838] transition"
                title="Redémarrer la caméra"
              >
                <RotateCw className="w-4 h-4" />
              </button>

              {/* Arrêter la caméra */}
              <button
                onClick={stopCamera}
                className="p-2 rounded-xl bg-rose-600/80 hover:bg-rose-600 text-white backdrop-blur-md border border-rose-500 transition"
                title="Arrêter la caméra"
              >
                <CameraOff className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Panneau Développeur / Diagnostics Overlay */}
          {cameraStatus === 'active' && showDebugDrawer && (
            <div className="absolute top-16 right-4 w-80 max-h-[75%] overflow-y-auto bg-[#10141f]/95 backdrop-blur-md border border-[#2b354d] rounded-2xl p-4 shadow-2xl z-20 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-[#1e2637]">
                <div className="flex items-center gap-2">
                  <Bug className="w-4 h-4 text-amber-400" />
                  <span className="text-xs font-bold text-white">Diagnostics & Repères</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      const allEnabled = Object.values(debugOptions).every(Boolean);
                      setDebugOptions({
                        showSkeleton: !allEnabled,
                        showLandmarks: !allEnabled,
                        showReferenceLines: !allEnabled,
                        showGarmentAnchors: !allEnabled,
                        showBoundingBox: !allEnabled,
                        showMeshWireframe: !allEnabled,
                        showTransformCenter: !allEnabled,
                        showConfidence: !allEnabled,
                        showArmOcclusion: !allEnabled,
                      });
                    }}
                    className="text-[10px] text-amber-400 hover:text-amber-300 font-semibold underline"
                  >
                    {Object.values(debugOptions).every(Boolean) ? 'Tout masquer' : 'Tout activer'}
                  </button>
                  <button
                    onClick={() => setShowDebugDrawer(false)}
                    className="text-slate-400 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="space-y-1.5 text-xs">
                {[
                  { key: 'showLandmarks', label: 'Repères 33 numérotés' },
                  { key: 'showReferenceLines', label: 'Lignes anatomiques (épaules, col, hanches)' },
                  { key: 'showGarmentAnchors', label: 'Points ancrage vêtement (diamants)' },
                  { key: 'showBoundingBox', label: 'Boîte englobante (quad délimité)' },
                  { key: 'showMeshWireframe', label: 'Maillage triangulaire (wireframe)' },
                  { key: 'showTransformCenter', label: 'Centre & angle de rotation' },
                  { key: 'showConfidence', label: 'Télémétrie HUD & Score confiance' },
                  { key: 'showArmOcclusion', label: 'Zones occlusion des bras' },
                  { key: 'showSkeleton', label: 'Squelette complet MediaPipe' },
                ].map(({ key, label }) => {
                  const isChecked = !!debugOptions[key as keyof DebugRenderOptions];
                  return (
                    <div
                      key={key}
                      onClick={() =>
                        setDebugOptions((prev) => ({
                          ...prev,
                          [key]: !prev[key as keyof DebugRenderOptions],
                        }))
                      }
                      className="flex items-center justify-between p-2 rounded-lg bg-[#151a28] hover:bg-[#1a2233] cursor-pointer transition"
                    >
                      <span className="text-[11px] text-slate-200">{label}</span>
                      <div
                        className={`w-8 h-4 rounded-full relative transition ${
                          isChecked ? 'bg-amber-500' : 'bg-[#273044]'
                        }`}
                      >
                        <span
                          className={`w-3 h-3 bg-white rounded-full absolute top-0.5 transition-all ${
                            isChecked ? 'right-0.5' : 'left-0.5'
                          }`}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Centre Placeholder Caméra (quand inactive, chargement ou erreur) */}
          {cameraStatus !== 'active' && (
            <div className="flex flex-col items-center text-center p-6 max-w-sm z-10">
              <div className="w-16 h-16 rounded-2xl bg-[#1c2233] border border-[#2d354b] flex items-center justify-center text-indigo-400 mb-4 shadow-lg">
                {cameraStatus === 'initializing' ? (
                  <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
                ) : cameraStatus === 'error' ? (
                  <AlertCircle className="w-8 h-8 text-rose-400" />
                ) : (
                  <Camera className="w-8 h-8" />
                )}
              </div>

              <h2 className="text-base font-semibold text-white mb-1">
                {cameraStatus === 'initializing'
                  ? 'Initialisation de la caméra...'
                  : cameraStatus === 'error'
                  ? 'Erreur de connexion webcam'
                  : 'Aperçu Caméra'}
              </h2>

              <p className="text-xs text-slate-400 mb-6">
                {errorMessage
                  ? errorMessage
                  : 'Placez-vous devant votre webcam pour essayer le vêtement sélectionné.'}
              </p>

              {cameraStatus === 'initializing' ? (
                <button
                  disabled
                  className="px-5 py-2.5 bg-indigo-600/50 text-white text-xs font-semibold rounded-xl flex items-center gap-2 cursor-wait"
                >
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Démarrage en cours...</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => startCamera()}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl flex items-center gap-2 transition shadow-md shadow-indigo-600/30"
                >
                  <Camera className="w-4 h-4" />
                  <span>{cameraStatus === 'error' ? 'Réessayer' : 'Activer la caméra'}</span>
                </button>
              )}
            </div>
          )}

          {/* Vêtement actuellement sélectionné (Overlay info en bas) */}
          {selectedGarment && (
            <div className="absolute bottom-4 inset-x-4 bg-[#0d0f15]/90 backdrop-blur border border-[#222838] rounded-xl p-3 flex items-center justify-between z-10">
              <div className="flex items-center gap-3">
                <img
                  src={selectedGarment.imagePath}
                  alt={selectedGarment.name}
                  className="w-11 h-11 rounded-lg object-contain bg-[#1c2233] border border-[#2d354b]"
                />
                <div>
                  <span className="text-[10px] uppercase tracking-wider text-indigo-400 font-semibold flex items-center gap-1.5">
                    <span>Vêtement actif {selectedGarment.isCustom && '• Importé'}</span>
                    {assetStatus && assetStatus.hangerRemoved && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-indigo-500/15 text-indigo-300 border border-indigo-500/25 normal-case">
                        Cintre retiré
                      </span>
                    )}
                    {assetStatus && assetStatus.backgroundRemoved && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 normal-case">
                        Fond détouré
                      </span>
                    )}
                    {assetStatus && !assetStatus.hasTransparency && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400 border border-amber-500/25 normal-case">
                        Fond opaque détecté
                      </span>
                    )}
                  </span>
                  <div className="text-xs font-bold text-white">{selectedGarment.name}</div>
                  <div className="text-[11px] text-slate-400">{selectedGarment.price}</div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowAITryOnModal(true)}
                  className="px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 transition shadow-md shadow-indigo-600/25"
                  title="Générer un essayage IA haute précision avec Genlook"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Essai IA</span>
                </button>
                <button
                  onClick={() => setShowCleanupModal(true)}
                  className="p-2 rounded-lg bg-[#181d2c] hover:bg-[#20273a] text-slate-300 hover:text-white border border-[#2d354b] transition"
                  title="Nettoyer le cintre / Calibrer les points d'ancrage"
                >
                  <Eraser className="w-4 h-4" />
                </button>
                <button
                  onClick={handleResetAdjustments}
                  className="p-2 rounded-lg bg-[#181d2c] hover:bg-[#20273a] text-slate-300 border border-[#2d354b] transition"
                  title="Réinitialiser la position du vêtement"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setShowSettingsModal((prev) => !prev)}
                  className={`p-2 rounded-lg transition border ${
                    showSettingsModal
                      ? 'bg-indigo-600 text-white border-indigo-500'
                      : 'bg-[#181d2c] hover:bg-[#20273a] text-slate-300 border-[#2d354b]'
                  }`}
                  title="Paramètres Try-On & Caméra"
                >
                  <SlidersHorizontal className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Modal / Popover Paramètres Try-On & Caméra */}
          {showSettingsModal && (
            <div className="absolute bottom-20 right-4 w-80 max-h-[75%] overflow-y-auto bg-[#121622] border border-[#273044] rounded-2xl p-4 shadow-2xl z-20 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-[#1e2637]">
                <span className="text-xs font-bold text-white">Réglages Try-On & Caméra</span>
                <button
                  onClick={() => setShowSettingsModal(false)}
                  className="text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Section Ajustements Vêtement (Phase 06) */}
              <div className="space-y-3 pb-3 border-b border-[#1e2637]">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-indigo-400 uppercase tracking-wider">
                    Ajustement Vêtement
                  </span>
                  <button
                    onClick={handleResetAdjustments}
                    className="text-[10px] text-slate-400 hover:text-white flex items-center gap-1"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Réinitialiser</span>
                  </button>
                </div>

                {/* Échelle globale */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-300">Échelle globale</span>
                    <span className="font-mono text-indigo-400">
                      {Math.round(adjustments.scale * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0.5}
                    max={1.5}
                    step={0.02}
                    value={adjustments.scale}
                    onChange={(e) =>
                      setAdjustments((prev) => ({ ...prev, scale: parseFloat(e.target.value) }))
                    }
                    className="w-full h-1.5 bg-[#1e2637] rounded-lg appearance-none cursor-pointer accent-indigo-500"
                  />
                </div>

                {/* Largeur des épaules */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-300">Largeur épaules</span>
                    <span className="font-mono text-indigo-400">
                      {Math.round(adjustments.shoulderWidthScale * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0.7}
                    max={1.4}
                    step={0.02}
                    value={adjustments.shoulderWidthScale}
                    onChange={(e) =>
                      setAdjustments((prev) => ({
                        ...prev,
                        shoulderWidthScale: parseFloat(e.target.value),
                      }))
                    }
                    className="w-full h-1.5 bg-[#1e2637] rounded-lg appearance-none cursor-pointer accent-indigo-500"
                  />
                </div>

                {/* Largeur du vêtement */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-300">Largeur vêtement</span>
                    <span className="font-mono text-indigo-400">
                      {Math.round((adjustments.garmentWidthScale ?? 1.0) * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0.7}
                    max={1.4}
                    step={0.02}
                    value={adjustments.garmentWidthScale ?? 1.0}
                    onChange={(e) =>
                      setAdjustments((prev) => ({
                        ...prev,
                        garmentWidthScale: parseFloat(e.target.value),
                      }))
                    }
                    className="w-full h-1.5 bg-[#1e2637] rounded-lg appearance-none cursor-pointer accent-indigo-500"
                  />
                </div>

                {/* Hauteur du vêtement */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-300">Longueur vêtement</span>
                    <span className="font-mono text-indigo-400">
                      {Math.round((adjustments.garmentHeightScale ?? 1.0) * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0.7}
                    max={1.4}
                    step={0.02}
                    value={adjustments.garmentHeightScale ?? 1.0}
                    onChange={(e) =>
                      setAdjustments((prev) => ({
                        ...prev,
                        garmentHeightScale: parseFloat(e.target.value),
                      }))
                    }
                    className="w-full h-1.5 bg-[#1e2637] rounded-lg appearance-none cursor-pointer accent-indigo-500"
                  />
                </div>

                {/* Position de l'encolure (Col) */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-300">Position encolure (Col)</span>
                    <span className="font-mono text-indigo-400">{adjustments.necklineOffsetY} px</span>
                  </div>
                  <input
                    type="range"
                    min={-80}
                    max={80}
                    step={2}
                    value={adjustments.necklineOffsetY}
                    onChange={(e) =>
                      setAdjustments((prev) => ({
                        ...prev,
                        necklineOffsetY: parseInt(e.target.value, 10),
                      }))
                    }
                    className="w-full h-1.5 bg-[#1e2637] rounded-lg appearance-none cursor-pointer accent-indigo-500"
                  />
                </div>

                {/* Rotation fine (°deg) */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-300">Rotation manuelle</span>
                    <span className="font-mono text-indigo-400">{adjustments.rotationOffsetDeg ?? 0}°</span>
                  </div>
                  <input
                    type="range"
                    min={-30}
                    max={30}
                    step={1}
                    value={adjustments.rotationOffsetDeg ?? 0}
                    onChange={(e) =>
                      setAdjustments((prev) => ({
                        ...prev,
                        rotationOffsetDeg: parseInt(e.target.value, 10),
                      }))
                    }
                    className="w-full h-1.5 bg-[#1e2637] rounded-lg appearance-none cursor-pointer accent-indigo-500"
                  />
                </div>

                {/* Décalage Vertical (Y) */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-300">Position Verticale (Y)</span>
                    <span className="font-mono text-indigo-400">{adjustments.offsetY} px</span>
                  </div>
                  <input
                    type="range"
                    min={-120}
                    max={120}
                    step={2}
                    value={adjustments.offsetY}
                    onChange={(e) =>
                      setAdjustments((prev) => ({ ...prev, offsetY: parseInt(e.target.value, 10) }))
                    }
                    className="w-full h-1.5 bg-[#1e2637] rounded-lg appearance-none cursor-pointer accent-indigo-500"
                  />
                </div>

                {/* Décalage Horizontal (X) */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-300">Position Horizontale (X)</span>
                    <span className="font-mono text-indigo-400">{adjustments.offsetX} px</span>
                  </div>
                  <input
                    type="range"
                    min={-120}
                    max={120}
                    step={2}
                    value={adjustments.offsetX}
                    onChange={(e) =>
                      setAdjustments((prev) => ({ ...prev, offsetX: parseInt(e.target.value, 10) }))
                    }
                    className="w-full h-1.5 bg-[#1e2637] rounded-lg appearance-none cursor-pointer accent-indigo-500"
                  />
                </div>

                {/* Force de déformation du maillage (Mesh Warp Strength) */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-300">Force de déformation maillage</span>
                    <span className="font-mono text-indigo-400">
                      {Math.round((adjustments.meshWarpStrength ?? 0.8) * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0.0}
                    max={1.0}
                    step={0.05}
                    value={adjustments.meshWarpStrength ?? 0.8}
                    onChange={(e) =>
                      setAdjustments((prev) => ({
                        ...prev,
                        meshWarpStrength: parseFloat(e.target.value),
                      }))
                    }
                    className="w-full h-1.5 bg-[#1e2637] rounded-lg appearance-none cursor-pointer accent-indigo-500"
                  />
                </div>

                {/* Toggle Occlusion avant-plan des bras */}
                <div className="flex items-center justify-between pt-1">
                  <span className="text-xs text-slate-300">Occlusion des bras (premier plan)</span>
                  <button
                    onClick={() =>
                      setAdjustments((prev) => ({
                        ...prev,
                        enableArmOcclusion: !prev.enableArmOcclusion,
                      }))
                    }
                    className={`w-9 h-5 rounded-full relative transition ${
                      adjustments.enableArmOcclusion ? 'bg-indigo-600' : 'bg-[#273044]'
                    }`}
                  >
                    <span
                      className={`w-3.5 h-3.5 bg-white rounded-full absolute top-0.5 transition-all ${
                        adjustments.enableArmOcclusion ? 'right-1' : 'left-1'
                      }`}
                    />
                  </button>
                </div>

                {/* Toggle Déformation 2D (Warping) */}
                <div className="flex items-center justify-between pt-1">
                  <span className="text-xs text-slate-300">Déformation 2D (Mesh Warp)</span>
                  <button
                    onClick={() =>
                      setAdjustments((prev) => ({ ...prev, enableWarping: !prev.enableWarping }))
                    }
                    className={`w-9 h-5 rounded-full relative transition ${
                      adjustments.enableWarping ? 'bg-indigo-600' : 'bg-[#273044]'
                    }`}
                  >
                    <span
                      className={`w-3.5 h-3.5 bg-white rounded-full absolute top-0.5 transition-all ${
                        adjustments.enableWarping ? 'right-1' : 'left-1'
                      }`}
                    />
                  </button>
                </div>

                {/* Toggle Afficher le vêtement */}
                <div className="flex items-center justify-between pt-1">
                  <span className="text-xs text-slate-300">Afficher le Vêtement</span>
                  <button
                    onClick={() => setShowGarment((prev) => !prev)}
                    className={`w-9 h-5 rounded-full relative transition ${
                      showGarment ? 'bg-indigo-600' : 'bg-[#273044]'
                    }`}
                  >
                    <span
                      className={`w-3.5 h-3.5 bg-white rounded-full absolute top-0.5 transition-all ${
                        showGarment ? 'right-1' : 'left-1'
                      }`}
                    />
                  </button>
                </div>

                {/* Bouton Sauvegarder pour ce vêtement */}
                <div className="pt-2">
                  <button
                    onClick={handleSaveCalibration}
                    className="w-full py-2 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition shadow-md shadow-indigo-600/20"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>Sauvegarder pour ce vêtement</span>
                  </button>
                  {saveSuccessMessage && (
                    <div className="mt-2 text-[11px] text-emerald-400 font-medium flex items-center justify-center gap-1">
                      <Check className="w-3.5 h-3.5" />
                      <span>{saveSuccessMessage}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Sélection Caméra */}
              <div>
                <label className="text-[11px] text-slate-400 block mb-1.5 font-medium">
                  Source vidéo
                </label>
                <select
                  value={activeDeviceId || ''}
                  onChange={(e) => switchDevice(e.target.value)}
                  className="w-full bg-[#181d2c] border border-[#273044] rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                >
                  {devices.length === 0 && (
                    <option value="">Caméra par défaut</option>
                  )}
                  {devices.map((dev, idx) => (
                    <option key={dev.deviceId} value={dev.deviceId}>
                      {dev.label || `Caméra ${idx + 1}`}
                    </option>
                  ))}
                </select>
              </div>

              {/* Résolution */}
              <div>
                <label className="text-[11px] text-slate-400 block mb-1.5 font-medium">
                  Résolution vidéo
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {(['640x480', '1280x720', '1920x1080'] as VideoResolution[]).map((res) => (
                    <button
                      key={res}
                      onClick={() => changeResolution(res)}
                      className={`py-1 rounded-md text-[10px] font-mono transition border ${
                        resolution === res
                          ? 'bg-indigo-600 text-white border-indigo-500 font-bold'
                          : 'bg-[#181d2c] text-slate-300 hover:text-white border-[#273044]'
                      }`}
                    >
                      {res.split('x')[1]}p
                    </button>
                  ))}
                </div>
              </div>

              {/* Option Mode Miroir */}
              <div className="flex items-center justify-between pt-1">
                <span className="text-xs text-slate-300">Mode Miroir (Selfie)</span>
                <button
                  onClick={toggleMirror}
                  className={`w-9 h-5 rounded-full relative transition ${
                    isMirrored ? 'bg-indigo-600' : 'bg-[#273044]'
                  }`}
                >
                  <span
                    className={`w-3.5 h-3.5 bg-white rounded-full absolute top-0.5 transition-all ${
                      isMirrored ? 'right-1' : 'left-1'
                    }`}
                  />
                </button>
              </div>

              {/* Option Affichage Squelette */}
              <div className="flex items-center justify-between pt-1">
                <span className="text-xs text-slate-300">Afficher le Squelette</span>
                <button
                  onClick={() => setShowSkeleton((prev) => !prev)}
                  className={`w-9 h-5 rounded-full relative transition ${
                    showSkeleton ? 'bg-indigo-600' : 'bg-[#273044]'
                  }`}
                >
                  <span
                    className={`w-3.5 h-3.5 bg-white rounded-full absolute top-0.5 transition-all ${
                      showSkeleton ? 'right-1' : 'left-1'
                    }`}
                  />
                </button>
              </div>

              {/* Informations biométriques normalisées */}
              {measurements && (
                <div className="pt-2 border-t border-[#1e2637] text-[10px] font-mono text-slate-400 space-y-1">
                  <div className="flex justify-between">
                    <span>Largeur épaules :</span>
                    <span className="text-indigo-400 font-bold">
                      {(measurements.shoulderWidth * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Hauteur torse :</span>
                    <span className="text-indigo-400 font-bold">
                      {(measurements.torsoHeight * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Inclinaison torse :</span>
                    <span className="text-indigo-400 font-bold">
                      {measurements.bodyOrientationAngle.toFixed(1)}°
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Latence rendu AR :</span>
                    <span className="text-emerald-400 font-bold">{renderLatencyMs} ms</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 2. Panneau Latéral : Sélection des Vêtements (Droite) */}
      <div className="w-96 flex flex-col p-6 bg-[#0f121a]">
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#1e2330]">
          <div className="flex items-center gap-2">
            <Shirt className="w-4 h-4 text-indigo-400" />
            <h2 className="text-sm font-bold text-white">Catalogue Vêtements</h2>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-mono">{filteredClothes.length} articles</span>
            {/* Bouton Importer un vêtement */}
            <button
              onClick={() => setShowImportModal(true)}
              className="p-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition flex items-center gap-1 text-xs font-semibold shadow-sm"
              title="Importer un vêtement"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Importer</span>
            </button>
          </div>
        </div>

        {/* Filtres de catégories */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-3 mb-3 no-scrollbar">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition shrink-0 ${
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
            const isSelected = selectedGarment?.id === garment.id;
            return (
              <div
                key={garment.id}
                onClick={() => setSelectedGarment(garment)}
                className={`flex items-center gap-3 p-2.5 rounded-xl border cursor-pointer transition group ${
                  isSelected
                    ? 'bg-indigo-600/10 border-indigo-500 shadow-sm'
                    : 'bg-[#141824] border-[#1e2330] hover:border-[#2d354b]'
                }`}
              >
                <img
                  src={garment.imagePath}
                  alt={garment.name}
                  className="w-14 h-14 rounded-lg object-contain bg-[#1c2233] border border-[#252c3f] shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold text-white truncate">{garment.name}</div>
                  <div className="text-[11px] text-slate-400">{garment.category}</div>
                  <div className="text-xs font-bold text-indigo-400 mt-0.5">{garment.price}</div>
                </div>

                <div className="flex items-center gap-1">
                  {/* Bouton supprimer pour les vêtements personnalisés */}
                  {garment.isCustom && (
                    <button
                      onClick={(e) => handleDeleteClothing(e, garment.id)}
                      className="p-1.5 text-slate-500 hover:text-rose-400 rounded-lg transition opacity-0 group-hover:opacity-100"
                      title="Supprimer ce vêtement"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {isSelected && (
                    <span className="text-[10px] font-bold text-indigo-400 bg-indigo-500/10 px-2 py-1 rounded-md border border-indigo-500/20">
                      Actif
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal d'importation de vêtement */}
      <ClothingImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImportSuccess={refreshClothes}
      />

      {/* Modal de nettoyage cintre / édition manuelle du masque et des points d'ancrage */}
      <GarmentCleanupModal
        isOpen={showCleanupModal}
        garment={selectedGarment}
        onClose={() => setShowCleanupModal(false)}
        onSaveSuccess={(updatedItem) => {
          refreshClothes();
          setSelectedGarment(updatedItem);
          void virtualTryOnEngine.setActiveGarment(updatedItem, true);
        }}
      />

      {/* Modal Essayage IA Cloud (Genlook API) */}
      <AITryOnModal
        isOpen={showAITryOnModal}
        onClose={() => setShowAITryOnModal(false)}
        garment={selectedGarment}
        videoRef={videoRef}
        isCameraActive={cameraStatus === 'active'}
        isMirrored={isMirrored}
      />
    </div>
  );
};

export default App;
