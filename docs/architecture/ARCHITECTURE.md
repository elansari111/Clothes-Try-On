# Virtual Try-On Desktop Architecture

## Overview
Virtual Try-On is a high-performance desktop application built on **Electron**, **React**, **TypeScript**, and **Vite**. It unifies real-time local Computer Vision (via **MediaPipe Pose**) and Augmented Reality 2D canvas warping with an extensible cloud AI virtual try-on provider layer.

---

## Architectural Principles
1. **Local Real-Time Tracking**: MediaPipe Pose runs locally on-device via WebAssembly and WebGL/GPU delegates. Zero cloud dependencies for real-time tracking.
2. **Strict Module Decoupling**: Each core capability is partitioned into independent features under `src/features/` with clear public interfaces (`index.ts`).
3. **No Local Heavy AI Models**: Heavy generative AI try-on is handled by external Cloud AI APIs (Genlook provider interface), keeping the desktop client lightweight and responsive.
4. **Electron Security Best Practices**:
   - `contextIsolation: true`
   - `nodeIntegration: false`
   - Strict media-device permission handler
   - Sanitized IPC messaging bridge through preload.

---

## Directory Organization
```text
virtual-try-on/
├── electron/
│   ├── main/
│   │   ├── index.ts              # Electron lifecycle coordinator
│   │   ├── windows/mainWindow.ts # Window creation & geometry
│   │   ├── ipc/index.ts          # IPC handler registry
│   │   └── security/permissions.ts # Media permissions & CSP
│   ├── preload/index.ts          # contextBridge safe API exposure
│   └── config/index.ts           # App & permission configuration
├── src/
│   ├── app/                      # Root application UI, routes & providers
│   ├── components/               # Shared presentational components (common, layout, ui)
│   ├── features/
│   │   ├── camera/               # Webcam stream, resolution, device switcher
│   │   ├── body-tracking/        # MediaPipe Pose, 33 landmarks, 1€ filter
│   │   ├── clothing/             # Clothing catalog, imports, 7 anchors, background removal
│   │   ├── live-ar/              # 2D AR warping, neckline positioning, occlusion, debug
│   │   ├── virtual-try-on/       # High-level coordinator (Live AR vs Cloud AI)
│   │   ├── ai-try-on/            # Cloud AI provider layer (Genlook provider interface)
│   │   └── settings/             # App settings & calibration persistence
│   ├── services/                 # Generic storage & IPC communication
│   ├── shared/                   # Shared types, constants, utilities, hooks
│   ├── styles/                   # Global Tailwind styling
│   └── main.tsx                  # Vite React entry point
```
