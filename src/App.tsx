import React, { useState, useRef, useEffect } from 'react';
import { ClothingItem } from './types/clothing';
import { ClothingService } from './services/product-importer/clothingService';
import { ClothingImportModal } from './components/Clothing/ClothingImportModal';
import { useCamera } from './hooks/useCamera';
import { usePoseTracking } from './hooks/usePoseTracking';
import { VideoResolution } from './types/camera';
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
} from 'lucide-react';

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
  const [showSkeleton, setShowSkeleton] = useState<boolean>(true);

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

  // MediaPipe Pose tracking hook
  const {
    status: poseStatus,
    delegate,
    fps,
    confidence,
    measurements,
  } = usePoseTracking({
    videoRef,
    canvasRef,
    isCameraActive: cameraStatus === 'active',
    isMirrored,
    showSkeleton,
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

            {/* Badge Tracking Body Status & FPS lorsque la caméra est active */}
            {cameraStatus === 'active' && (
              <div className="flex items-center gap-2 text-xs px-2.5 py-1 rounded-xl bg-[#141824] border border-[#222838]">
                <Activity className="w-3.5 h-3.5 text-indigo-400" />
                <span className="text-[11px] font-mono text-slate-300">
                  {fps} FPS • {delegate}
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

          {/* Canvas 2D pour le rendu du squelette MediaPipe */}
          <canvas
            ref={canvasRef}
            className={`absolute inset-0 w-full h-full object-cover pointer-events-none transition-opacity duration-200 ${
              cameraStatus === 'active' && showSkeleton ? 'opacity-100' : 'opacity-0'
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
                  <span className="text-[10px] uppercase tracking-wider text-indigo-400 font-semibold">
                    Vêtement actif {selectedGarment.isCustom && '• Importé'}
                  </span>
                  <div className="text-xs font-bold text-white">{selectedGarment.name}</div>
                  <div className="text-[11px] text-slate-400">{selectedGarment.price}</div>
                </div>
              </div>

              <button
                onClick={() => setShowSettingsModal((prev) => !prev)}
                className={`p-2 rounded-lg transition border ${
                  showSettingsModal
                    ? 'bg-indigo-600 text-white border-indigo-500'
                    : 'bg-[#181d2c] hover:bg-[#20273a] text-slate-300 border-[#2d354b]'
                }`}
                title="Paramètres de la caméra"
              >
                <SlidersHorizontal className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Modal / Popover Paramètres Caméra */}
          {showSettingsModal && (
            <div className="absolute bottom-20 right-4 w-72 bg-[#121622] border border-[#273044] rounded-2xl p-4 shadow-2xl z-20 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-[#1e2637]">
                <span className="text-xs font-bold text-white">Réglages Caméra & IA</span>
                <button
                  onClick={() => setShowSettingsModal(false)}
                  className="text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
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
    </div>
  );
};

export default App;
