# Virtual Try-On Development Guide

## Prerequisites
- Node.js >= 18
- Windows 10/11, macOS 11+, or Linux
- Webcam / video input device

---

## Setup & Running
```bash
# Install dependencies
npm install

# Start Vite + Electron concurrently in development mode
npm run dev

# Compile TypeScript and bundle for production
npm run build

# Start packaged Electron application
npm start
```

---

## Code Quality Standards
- **Strict TypeScript**: No implicit any, clean return types on all services.
- **Single Responsibility Principle**: Keep algorithms (such as warping, landmark filtering, and background removal) in focused processor modules.
- **Local MediaPipe**: Model assets (`pose_landmarker_lite.task`) and WebAssembly modules reside locally in `public/models` and `public/wasm` to ensure offline reliability.
