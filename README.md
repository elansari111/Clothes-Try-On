# Virtual Try-On Desktop Application

A real-time Virtual Try-On desktop application engineered with **Electron**, **React**, **TypeScript**, **Vite**, **Tailwind CSS**, and **MediaPipe Tasks Vision**.

---

## Key Features
- **Real-Time Live AR Try-On**: 2D triangle mesh affine deformation with anchor-based alignment, suprasternal notch neck positioning, and torso contour tracking.
- **MediaPipe Pose Tracking**: Real-time 33 body landmark tracking with adaptive 1€ filtering for smooth, jitter-free interaction at 60 FPS.
- **Clothing Engine**: Local asset management, BFS automatic background removal, hanger cleanup tool, and 7-point anchor calibration.
- **Arm & Foreground Occlusion**: Automatic detection of arms crossing in front of the torso with live video feed compositing.
- **Per-Garment Calibration**: Individual fit calibration (scale, shoulder width, garment width, length, neckline, rotation) saved locally per garment.
- **Developer Diagnostics Overlay**: Real-time HUD displaying numbered landmarks, skeleton, reference lines, garment bounds, wireframe mesh, and telemetry.
- **Cloud AI Try-On Architecture**: Modular provider architecture prepared for external Virtual Try-On APIs with Genlook as the initial provider.

---

## Architecture Overview
```text
virtual-try-on/
├── electron/           # Main process, preload bridge, security & IPC
├── src/
│   ├── app/            # App entry, layout, providers, routes
│   ├── components/     # Reusable UI & layout elements
│   ├── features/
│   │   ├── camera/         # Camera service, stream management & hooks
│   │   ├── body-tracking/  # MediaPipe integration, 1€ filter & pose metrics
│   │   ├── clothing/       # Catalog, storage, image preprocessing & anchors
│   │   ├── live-ar/        # Warping engine, occlusion, rendering & debug
│   │   ├── virtual-try-on/ # Coordinator managing try-on modes & state
│   │   ├── ai-try-on/      # Cloud AI provider layer (Genlook provider)
│   │   └── settings/       # User & calibration preferences
│   ├── services/       # Generic storage & IPC client
│   ├── shared/         # Shared types, constants, hooks, utils
│   ├── styles/         # Global styles
│   └── main.tsx        # React root entry
├── assets/             # Clothing images & icons
├── docs/               # Architecture & API documentation
└── tests/              # Unit & integration tests
```

---

## Getting Started

### Installation
```bash
npm install
```

### Development
```bash
npm run dev
```

### Production Build
```bash
npm run build
npm start
```
