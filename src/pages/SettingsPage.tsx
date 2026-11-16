import React from 'react';
import { PageContainer } from '../components/UI/PageContainer';
import {
  Camera,
  Cpu,
  Info,
} from 'lucide-react';

export const SettingsPage: React.FC = () => {
  return (
    <PageContainer className="max-w-4xl">
      <div className="space-y-6">
        {/* Section 1: Camera & Video Hardware */}
        <div className="bg-surface border border-surface-border rounded-2xl p-6">
          <div className="flex items-center gap-3 pb-4 mb-4 border-b border-surface-border">
            <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary-light flex items-center justify-center">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Camera & Video Input</h3>
              <p className="text-xs text-muted">
                Configure preferred video capture device and resolution for try-on tracking
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Default Camera Source
              </label>
              <select
                disabled
                className="w-full px-3.5 py-2.5 bg-background border border-surface-border rounded-xl text-xs text-slate-300 cursor-not-allowed opacity-80"
              >
                <option>Integrated Webcam (1080p Full HD)</option>
                <option>External USB Camera (4K UHD)</option>
                <option>Virtual Video Loopback</option>
              </select>
              <span className="text-[10px] text-muted-dark mt-1 block">
                * Camera selection will be populated automatically upon device grant.
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Resolution Preset
                </label>
                <select
                  disabled
                  className="w-full px-3.5 py-2.5 bg-background border border-surface-border rounded-xl text-xs text-slate-300 cursor-not-allowed opacity-80"
                >
                  <option>1280 x 720 (Balanced - 60 FPS)</option>
                  <option>1920 x 1080 (Sharp - 30 FPS)</option>
                  <option>640 x 480 (Low Latency)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Video Mirroring
                </label>
                <select
                  disabled
                  className="w-full px-3.5 py-2.5 bg-background border border-surface-border rounded-xl text-xs text-slate-300 cursor-not-allowed opacity-80"
                >
                  <option>Horizontal Flip (True Mirror View)</option>
                  <option>No Flip (Original Web Feed)</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: AI & Vision Engine Parameters */}
        <div className="bg-surface border border-surface-border rounded-2xl p-6">
          <div className="flex items-center gap-3 pb-4 mb-4 border-b border-surface-border">
            <div className="w-8 h-8 rounded-lg bg-accent-cyan/10 text-accent-cyan flex items-center justify-center">
              <Cpu className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Vision & Pose Detection Engine</h3>
              <p className="text-xs text-muted">
                MediaPipe Tasks Vision model parameters and acceleration delegate
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-xl bg-background border border-surface-border">
              <div>
                <div className="text-xs font-semibold text-white">Hardware GPU Acceleration</div>
                <div className="text-[11px] text-muted">
                  Use WebGL / WebGPU acceleration for real-time skeletal inference
                </div>
              </div>
              <div className="w-9 h-5 bg-primary rounded-full relative cursor-pointer">
                <div className="w-3.5 h-3.5 bg-white rounded-full absolute right-1 top-0.5" />
              </div>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-background border border-surface-border">
              <div>
                <div className="text-xs font-semibold text-white">Landmark Smoothing Filter</div>
                <div className="text-[11px] text-muted">
                  Filter out micro-jitter using exponential moving average
                </div>
              </div>
              <div className="w-9 h-5 bg-primary rounded-full relative cursor-pointer">
                <div className="w-3.5 h-3.5 bg-white rounded-full absolute right-1 top-0.5" />
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: About Application */}
        <div className="bg-surface border border-surface-border rounded-2xl p-6">
          <div className="flex items-center gap-3 pb-4 mb-4 border-b border-surface-border">
            <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary-light flex items-center justify-center">
              <Info className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">About Virtual Try-On</h3>
              <p className="text-xs text-muted">Desktop Architecture & Runtime specifications</p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs mb-4">
            <div className="p-3 rounded-xl bg-background border border-surface-border">
              <span className="text-[10px] text-muted block">App Version</span>
              <span className="font-mono font-bold text-white">v0.1.0 (Phase 02)</span>
            </div>
            <div className="p-3 rounded-xl bg-background border border-surface-border">
              <span className="text-[10px] text-muted block">Framework</span>
              <span className="font-mono font-bold text-white">React 18 + Vite</span>
            </div>
            <div className="p-3 rounded-xl bg-background border border-surface-border">
              <span className="text-[10px] text-muted block">Desktop Host</span>
              <span className="font-mono font-bold text-white">Electron.js</span>
            </div>
            <div className="p-3 rounded-xl bg-background border border-surface-border">
              <span className="text-[10px] text-muted block">Vision Stack</span>
              <span className="font-mono font-bold text-white">MediaPipe Vision</span>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-surface-hover/70 border border-surface-border text-xs text-muted leading-relaxed">
            This desktop client delivers a frictionless virtual garment fitting experience directly
            within your local PC runtime. Future releases will integrate MediaPipe 33-point body
            pose mesh and Canvas 2D/Three.js warp shaders.
          </div>
        </div>
      </div>
    </PageContainer>
  );
};
