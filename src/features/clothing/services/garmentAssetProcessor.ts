export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface DetectedGarmentGeometry {
  /** Normalized [0..1] X of left & right garment shoulder silhouette edges inside the cropped image */
  shoulderLeftX: number;
  shoulderRightX: number;
  /** Normalized [0..1] Y of the shoulder slope line inside the cropped image */
  shoulderLineY: number;
  /** Normalized [0..1] Y of the center neckline (lowest point of collar opening or top of collar) */
  neckCenterY: number;
  /** Normalized [0..1] X of torso left & right edges at chest/mid-torso height (excludes sleeves!) */
  torsoLeftX: number;
  torsoRightX: number;
  /** Normalized [0..1] Y of bottom hem */
  bottomY: number;
  /** True if automatic hanger removal cleared pixels above the collar */
  hangerRemoved: boolean;
}

export interface GarmentAssetProcessResult {
  canvas: HTMLCanvasElement;
  width: number;
  height: number;
  originalWidth: number;
  originalHeight: number;
  cropBox: BoundingBox;
  hadOpaqueBackground: boolean;
  backgroundRemoved: boolean;
  hangerRemoved: boolean;
  hasTransparency: boolean;
  geometry: DetectedGarmentGeometry;
}

/**
 * Dedicated client-side preprocessing for garment images:
 * 1. Inspects alpha channel to verify real transparency.
 * 2. Removes uniform studio/gray/white background via edge-seeded flood-fill.
 * 3. Detects and removes thin clothing hangers (hooks & angled hanger bars protruding above the collar)
 *    without slicing off collar tips or shoulders.
 * 4. Computes tight non-transparent bounding box and crops empty margins.
 * 5. Analyzes the silhouette of the cropped garment to detect true neckline, shoulder width,
 *    and torso width (preventing sleeves from inflating shoulder width calculations).
 */
export class GarmentAssetProcessor {
  private static colorDist(
    r1: number,
    g1: number,
    b1: number,
    r2: number,
    g2: number,
    b2: number
  ): number {
    const dr = r1 - r2;
    const dg = g1 - g2;
    const db = b1 - b2;
    return Math.sqrt(dr * dr + dg * dg + db * db);
  }

  private static checkBorderTransparency(data: Uint8ClampedArray, w: number, h: number): boolean {
    let transparentBorderPixels = 0;
    let totalSampled = 0;

    for (let x = 0; x < w; x += Math.max(1, Math.floor(w / 64))) {
      totalSampled += 2;
      if (data[x * 4 + 3] < 200) transparentBorderPixels++;
      if (data[((h - 1) * w + x) * 4 + 3] < 200) transparentBorderPixels++;
    }
    for (let y = 0; y < h; y += Math.max(1, Math.floor(h / 64))) {
      totalSampled += 2;
      if (data[y * w * 4 + 3] < 200) transparentBorderPixels++;
      if (data[(y * w + (w - 1)) * 4 + 3] < 200) transparentBorderPixels++;
    }

    return totalSampled > 0 && transparentBorderPixels / totalSampled > 0.25;
  }

  private static sampleBorderBackground(
    data: Uint8ClampedArray,
    w: number,
    h: number
  ): { r: number; g: number; b: number; uniformity: number } {
    const samples: [number, number, number][] = [];
    const stepX = Math.max(1, Math.floor(w / 24));
    const stepY = Math.max(1, Math.floor(h / 24));

    for (let x = 0; x < w; x += stepX) {
      const topIdx = x * 4;
      const botIdx = ((h - 1) * w + x) * 4;
      if (data[topIdx + 3] > 200) samples.push([data[topIdx], data[topIdx + 1], data[topIdx + 2]]);
      if (data[botIdx + 3] > 200) samples.push([data[botIdx], data[botIdx + 1], data[botIdx + 2]]);
    }
    for (let y = 0; y < h; y += stepY) {
      const leftIdx = y * w * 4;
      const rightIdx = (y * w + (w - 1)) * 4;
      if (data[leftIdx + 3] > 200) samples.push([data[leftIdx], data[leftIdx + 1], data[leftIdx + 2]]);
      if (data[rightIdx + 3] > 200) samples.push([data[rightIdx], data[rightIdx + 1], data[rightIdx + 2]]);
    }

    if (samples.length === 0) {
      return { r: 255, g: 255, b: 255, uniformity: 0 };
    }

    const cTL = [data[0], data[1], data[2]];
    const cTR = [data[(w - 1) * 4], data[(w - 1) * 4 + 1], data[(w - 1) * 4 + 2]];
    const cBL = [data[(h - 1) * w * 4], data[(h - 1) * w * 4 + 1], data[(h - 1) * w * 4 + 2]];
    const cBR = [
      data[((h - 1) * w + (w - 1)) * 4],
      data[((h - 1) * w + (w - 1)) * 4 + 1],
      data[((h - 1) * w + (w - 1)) * 4 + 2],
    ];

    const candidates = [cTL, cTR, cBL, cBR];
    let bestRef = cTL;
    let bestScore = -1;

    for (const ref of candidates) {
      let closeCount = 0;
      for (const s of samples) {
        if (this.colorDist(s[0], s[1], s[2], ref[0], ref[1], ref[2]) < 42) {
          closeCount++;
        }
      }
      if (closeCount > bestScore) {
        bestScore = closeCount;
        bestRef = ref;
      }
    }

    let sumR = 0;
    let sumG = 0;
    let sumB = 0;
    let count = 0;
    for (const s of samples) {
      if (this.colorDist(s[0], s[1], s[2], bestRef[0], bestRef[1], bestRef[2]) < 45) {
        sumR += s[0];
        sumG += s[1];
        sumB += s[2];
        count++;
      }
    }

    if (count === 0) {
      return { r: bestRef[0], g: bestRef[1], b: bestRef[2], uniformity: 0 };
    }

    return {
      r: Math.round(sumR / count),
      g: Math.round(sumG / count),
      b: Math.round(sumB / count),
      uniformity: count / samples.length,
    };
  }

  private static removeConnectedBackground(
    imageData: ImageData,
    bgR: number,
    bgG: number,
    bgB: number,
    tolerance: number = 48,
    featherRange: number = 22
  ): boolean {
    const { data, width: w, height: h } = imageData;
    const totalPixels = w * h;
    const visited = new Uint8Array(totalPixels);
    const removed = new Uint8Array(totalPixels);
    const queue = new Int32Array(totalPixels);
    let qHead = 0;
    let qTail = 0;

    const maxTol = tolerance + featherRange;

    const tryEnqueue = (px: number, py: number) => {
      const idx = py * w + px;
      if (visited[idx]) return;
      visited[idx] = 1;

      const off = idx * 4;
      const a = data[off + 3];
      if (a < 15) {
        removed[idx] = 1;
        queue[qTail++] = idx;
        return;
      }

      const dist = this.colorDist(data[off], data[off + 1], data[off + 2], bgR, bgG, bgB);
      if (dist <= tolerance) {
        removed[idx] = 1;
        data[off + 3] = 0;
        queue[qTail++] = idx;
      } else if (dist <= maxTol) {
        const alphaScale = (dist - tolerance) / featherRange;
        data[off + 3] = Math.round(data[off + 3] * alphaScale);
      }
    };

    for (let x = 0; x < w; x++) {
      tryEnqueue(x, 0);
      tryEnqueue(x, h - 1);
    }
    for (let y = 0; y < h; y++) {
      tryEnqueue(0, y);
      tryEnqueue(w - 1, y);
    }

    while (qHead < qTail) {
      const cur = queue[qHead++];
      const cx = cur % w;
      const cy = (cur - cx) / w;

      if (cx > 0) tryEnqueue(cx - 1, cy);
      if (cx < w - 1) tryEnqueue(cx + 1, cy);
      if (cy > 0) tryEnqueue(cx, cy - 1);
      if (cy < h - 1) tryEnqueue(cx, cy + 1);
    }

    let removedCount = 0;
    for (let i = 0; i < totalPixels; i++) {
      if (removed[i]) removedCount++;
    }
    const removedRatio = removedCount / totalPixels;

    return removedRatio > 0.02 && removedRatio < 0.96;
  }

  /**
   * Detects and removes clothing hangers protruding above the shirt/jacket collar.
   * Strategy:
   * 1. Compute opaque horizontal width per scanline inside the current bounding box.
   * 2. Measure the body width in the mid-chest region (y in 40%..65% of bbox).
   * 3. Scan downward from the top of the bbox:
   *    - A hanger hook/neck is narrow (< 18% of garment body width) AND has low vertical/horizontal fill.
   *    - Once row width expands solidly into the collar/shoulders (> 22% of body width and dense),
   *      mark that Y as the collar top.
   * 4. Erase narrow hook pixels above the collar AND any non-fabric hanger bar pixels (distinct color
   *    from garment fabric, e.g. wood/metal/black/white hanger visible inside the open neck triangle)
   *    located above the collar baseline.
   */
  private static removeHanger(imageData: ImageData, bbox: BoundingBox): boolean {
    const { data, width: w } = imageData;
    const bh = bbox.height;
    const bw = bbox.width;
    if (bh < 40 || bw < 40) return false;

    const alphaThresh = 30;
    const rowOpaqueCount = new Int32Array(bh);
    const rowMinX = new Int32Array(bh).fill(w);
    const rowMaxX = new Int32Array(bh).fill(0);

    for (let ry = 0; ry < bh; ry++) {
      const y = bbox.y + ry;
      const rowOff = y * w * 4;
      let count = 0;
      for (let rx = 0; rx < bw; rx++) {
        const x = bbox.x + rx;
        if (data[rowOff + x * 4 + 3] > alphaThresh) {
          count++;
          if (x < rowMinX[ry]) rowMinX[ry] = x;
          if (x > rowMaxX[ry]) rowMaxX[ry] = x;
        }
      }
      rowOpaqueCount[ry] = count;
    }

    // Estimate core garment width around chest (40%..65% down)
    let chestSpanSum = 0;
    let chestRows = 0;
    const chestStart = Math.floor(bh * 0.4);
    const chestEnd = Math.floor(bh * 0.65);
    for (let ry = chestStart; ry <= chestEnd; ry++) {
      if (rowOpaqueCount[ry] > 0) {
        chestSpanSum += rowMaxX[ry] - rowMinX[ry] + 1;
        chestRows++;
      }
    }
    const avgBodyWidth = chestRows > 0 ? chestSpanSum / chestRows : bw;

    // Sample dominant fabric color from chest interior (central 40% horizontally, 45%..65% vertically)
    let fabR = 0;
    let fabG = 0;
    let fabB = 0;
    let fabCount = 0;
    const cxStart = bbox.x + Math.floor(bw * 0.32);
    const cxEnd = bbox.x + Math.floor(bw * 0.68);
    for (let ry = Math.floor(bh * 0.45); ry < Math.floor(bh * 0.65); ry += 2) {
      const y = bbox.y + ry;
      for (let x = cxStart; x < cxEnd; x += 2) {
        const off = (y * w + x) * 4;
        if (data[off + 3] > 200) {
          fabR += data[off];
          fabG += data[off + 1];
          fabB += data[off + 2];
          fabCount++;
        }
      }
    }
    if (fabCount > 0) {
      fabR = Math.round(fabR / fabCount);
      fabG = Math.round(fabG / fabCount);
      fabB = Math.round(fabB / fabCount);
    }

    // Detect top hanger hook: rows from top down to 28% height where opaque pixel count is thin (< 16% of body width)
    const maxHookScan = Math.floor(bh * 0.28);
    const hookWidthThreshold = Math.max(8, avgBodyWidth * 0.16);
    let hookEndRow = -1;

    for (let ry = 0; ry < maxHookScan; ry++) {
      const span = rowOpaqueCount[ry] > 0 ? rowMaxX[ry] - rowMinX[ry] + 1 : 0;
      const isThinHook = rowOpaqueCount[ry] <= hookWidthThreshold && span <= avgBodyWidth * 0.24;
      if (isThinHook) {
        hookEndRow = ry;
      } else {
        // Check if next 3 consecutive rows are solidly wide (actual garment collar reached)
        let wideStreak = 0;
        for (let k = 0; k < 4 && ry + k < maxHookScan; k++) {
          if (rowOpaqueCount[ry + k] > hookWidthThreshold) wideStreak++;
        }
        if (wideStreak >= 3) {
          break;
        }
        hookEndRow = ry;
      }
    }

    // Only clear top hook stalk if the thin top stalk spans at least 3% of garment height
    const minHookRows = Math.max(6, Math.floor(bh * 0.03));
    let pixelsCleared = 0;

    if (hookEndRow >= minHookRows) {
      // Step 1: Clear the thin hanger hook stalk cleanly above the collar
      for (let ry = 0; ry <= hookEndRow; ry++) {
        const y = bbox.y + ry;
        const rowOff = y * w * 4;
        for (let rx = 0; rx < bw; rx++) {
          const x = bbox.x + rx;
          const off = rowOff + x * 4;
          if (data[off + 3] > 0) {
            data[off + 3] = 0;
            pixelsCleared++;
          }
        }
      }
    } else {
      hookEndRow = -1;
    }

    // Step 2: Clean visible wooden/metal/plastic hanger bar AND enclosed background pixels
    // sitting inside the open collar notch right below hookEndRow (runs even when no top hook exists).
    if (fabCount > 20) {
      const barScanStart = Math.max(0, hookEndRow + 1);
      const barScanEnd = Math.min(bh - 1, barScanStart + Math.floor(bh * 0.14));
      const notchLeft = bbox.x + Math.floor(bw * 0.30);
      const notchRight = bbox.x + Math.floor(bw * 0.70);

      for (let ry = barScanStart; ry <= barScanEnd; ry++) {
        const y = bbox.y + ry;
        const rowOff = y * w * 4;
        for (let x = notchLeft; x <= notchRight; x++) {
          const off = rowOff + x * 4;
          if (data[off + 3] <= alphaThresh) continue;

          const r = data[off];
          const g = data[off + 1];
          const b = data[off + 2];

          const distFromFabric = this.colorDist(r, g, b, fabR, fabG, fabB);
          // Warm wood / tan / brown / metallic gray / dark plastic hanger signature far from fabric color
          const isWoodLike = r > g && g >= b && r - b > 18 && r > 80;
          const isDarkMetalOrPlastic = Math.max(r, g, b) < 82 && distFromFabric > 55;
          const isMetallicOrStudioBg =
            Math.abs(r - g) < 18 && Math.abs(g - b) < 18 && distFromFabric > 52;

          if (distFromFabric > 52 && (isWoodLike || isDarkMetalOrPlastic || isMetallicOrStudioBg)) {
            let exposedNearTop = false;
            for (let dy = 1; dy <= 14; dy++) {
              const py = y - dy;
              if (py < 0 || data[(py * w + x) * 4 + 3] <= alphaThresh) {
                exposedNearTop = true;
                break;
              }
            }
            if (exposedNearTop) {
              data[off + 3] = 0;
              pixelsCleared++;
            }
          }
        }
      }
    }

    // Step 3: Remove any thin stray vertical wire / fringe specs (<= 5 opaque pixels per row)
    // in the upper 35% of the bounding box so no line artifact floats above the collar.
    const strayScanEnd = Math.floor(bh * 0.35);
    for (let ry = 0; ry < strayScanEnd; ry++) {
      const y = bbox.y + ry;
      const rowOff = y * w * 4;
      let count = 0;
      for (let rx = 0; rx < bw; rx++) {
        const x = bbox.x + rx;
        if (data[rowOff + x * 4 + 3] > alphaThresh) count++;
      }
      if (count > 0 && count <= 5) {
        for (let rx = 0; rx < bw; rx++) {
          const x = bbox.x + rx;
          if (data[rowOff + x * 4 + 3] > 0) {
            data[rowOff + x * 4 + 3] = 0;
            pixelsCleared++;
          }
        }
      }
    }

    return pixelsCleared > 10;
  }

  /**
   * Computes the tight bounding box around non-transparent garment pixels
   */
  static detectBoundingBox(
    data: Uint8ClampedArray,
    w: number,
    h: number,
    alphaThreshold: number = 28
  ): BoundingBox {
    let minX = w;
    let minY = h;
    let maxX = 0;
    let maxY = 0;
    let found = false;

    for (let y = 0; y < h; y++) {
      const rowOffset = y * w * 4;
      let rowHits = 0;
      let rowFirstX = w;
      let rowLastX = 0;
      for (let x = 0; x < w; x++) {
        const alpha = data[rowOffset + x * 4 + 3];
        if (alpha > alphaThreshold) {
          rowHits++;
          if (x < rowFirstX) rowFirstX = x;
          if (x > rowLastX) rowLastX = x;
        }
      }
      if (rowHits >= 3) {
        if (rowFirstX < minX) minX = rowFirstX;
        if (rowLastX > maxX) maxX = rowLastX;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
        found = true;
      }
    }

    if (!found || maxX <= minX || maxY <= minY) {
      return { x: 0, y: 0, width: w, height: h };
    }

    const pad = 2;
    const x = Math.max(0, minX - pad);
    const y = Math.max(0, minY - pad);
    const right = Math.min(w - 1, maxX + pad);
    const bottom = Math.min(h - 1, maxY + pad);

    return {
      x,
      y,
      width: Math.max(1, right - x + 1),
      height: Math.max(1, bottom - y + 1),
    };
  }

  /**
   * Analyzes the silhouette of the final tightly-cropped garment canvas to measure:
   * - True neckline center Y (handles V-necks, crew necks, collared shirts accurately)
   * - True shoulder line Y and shoulder edges (distinguishing core torso from hanging long sleeves!)
   * - Core torso width at mid-waist (critical for shirts/jackets with wide hanging sleeves)
   */
  static analyzeGarmentGeometry(
    canvas: HTMLCanvasElement,
    hangerRemoved: boolean
  ): DetectedGarmentGeometry {
    const fallback: DetectedGarmentGeometry = {
      shoulderLeftX: 0.22,
      shoulderRightX: 0.78,
      shoulderLineY: 0.12,
      neckCenterY: 0.05,
      torsoLeftX: 0.24,
      torsoRightX: 0.76,
      bottomY: 0.96,
      hangerRemoved,
    };

    const w = canvas.width;
    const h = canvas.height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx || w < 20 || h < 20) return fallback;

    try {
      const { data } = ctx.getImageData(0, 0, w, h);
      const alphaThresh = 35;

      // 1. Find neckline center Y by scanning down the central vertical column (x = 46%..54%)
      let neckY = Math.floor(h * 0.05);
      const centerMinX = Math.floor(w * 0.46);
      const centerMaxX = Math.floor(w * 0.54);
      for (let y = 0; y < Math.floor(h * 0.35); y++) {
        let opaqueInCenter = 0;
        for (let x = centerMinX; x <= centerMaxX; x++) {
          if (data[(y * w + x) * 4 + 3] > alphaThresh) opaqueInCenter++;
        }
        if (opaqueInCenter >= (centerMaxX - centerMinX + 1) * 0.5) {
          neckY = y;
          break;
        }
      }

      // 2. Measure horizontal extents across upper-shoulder zone (y = 10%..18%)
      //    and lower-torso zone (y = 65%..85% where sleeves are usually separated or absent)
      const findRowSpan = (y: number): { left: number; right: number; centerContiguousLeft: number; centerContiguousRight: number } => {
        const rowOff = y * w * 4;
        let left = w;
        let right = 0;
        for (let x = 0; x < w; x++) {
          if (data[rowOff + x * 4 + 3] > alphaThresh) {
            if (x < left) left = x;
            if (x > right) right = x;
          }
        }
        // Also find contiguous core torso span expanding left/right from image center x = w/2
        const mid = Math.floor(w / 2);
        let cLeft = mid;
        let cRight = mid;
        // Scan left from center until hitting a transparent gap (>= 4 transparent pixels = armhole separation)
        let gap = 0;
        for (let x = mid; x >= 0; x--) {
          if (data[rowOff + x * 4 + 3] > alphaThresh) {
            cLeft = x;
            gap = 0;
          } else {
            gap++;
            if (gap >= 4) break;
          }
        }
        gap = 0;
        for (let x = mid; x < w; x++) {
          if (data[rowOff + x * 4 + 3] > alphaThresh) {
            cRight = x;
            gap = 0;
          } else {
            gap++;
            if (gap >= 4) break;
          }
        }

        return { left, right, centerContiguousLeft: cLeft, centerContiguousRight: cRight };
      };

      // Measure contiguous core torso width in lower chest/abdomen (y = 55%..78%)
      let torsoLeftSum = 0;
      let torsoRightSum = 0;
      let torsoSamples = 0;
      for (let y = Math.floor(h * 0.55); y <= Math.floor(h * 0.78); y += 2) {
        const span = findRowSpan(y);
        if (span.centerContiguousRight > span.centerContiguousLeft + w * 0.2) {
          torsoLeftSum += span.centerContiguousLeft / w;
          torsoRightSum += span.centerContiguousRight / w;
          torsoSamples++;
        }
      }

      const torsoLeftX = torsoSamples > 0 ? torsoLeftSum / torsoSamples : 0.24;
      const torsoRightX = torsoSamples > 0 ? torsoRightSum / torsoSamples : 0.76;

      // Shoulder width is slightly wider than core lower torso (typically +8%..12% on each side for shirt shoulders)
      const upperSpan = findRowSpan(Math.floor(h * 0.14));
      const rawUpperLeft = upperSpan.left < w ? upperSpan.left / w : torsoLeftX;
      const rawUpperRight = upperSpan.right > 0 ? upperSpan.right / w : torsoRightX;

      // Clamp shoulder anchors so hanging sleeves on the sides don't push shoulder anchors to 0.0 / 1.0
      const torsoSpan = Math.max(0.3, torsoRightX - torsoLeftX);
      const maxShoulderHalf = Math.min(0.45, torsoSpan * 0.62);
      const centerX = (torsoLeftX + torsoRightX) / 2;

      const shoulderLeftX = Math.max(centerX - maxShoulderHalf, Math.min(torsoLeftX, rawUpperLeft));
      const shoulderRightX = Math.min(centerX + maxShoulderHalf, Math.max(torsoRightX, rawUpperRight));

      // Shoulder slope line sits slightly below neckline top
      const neckNormY = Math.max(0.01, Math.min(0.22, neckY / h));
      const shoulderLineY = Math.max(neckNormY + 0.04, Math.min(0.26, neckNormY + 0.09));

      return {
        shoulderLeftX: Math.max(0.08, Math.min(0.4, shoulderLeftX)),
        shoulderRightX: Math.max(0.6, Math.min(0.92, shoulderRightX)),
        shoulderLineY,
        neckCenterY: neckNormY,
        torsoLeftX: Math.max(0.1, Math.min(0.42, torsoLeftX)),
        torsoRightX: Math.max(0.58, Math.min(0.9, torsoRightX)),
        bottomY: 0.96,
        hangerRemoved,
      };
    } catch {
      return fallback;
    }
  }

  /**
   * Full preprocessing pipeline for any HTMLImageElement
   */
  static processGarmentImage(
    img: HTMLImageElement,
    maxDimension: number = 768
  ): GarmentAssetProcessResult {
    const origW = img.naturalWidth || img.width;
    const origH = img.naturalHeight || img.height;

    let workW = origW;
    let workH = origH;

    if (workW > maxDimension || workH > maxDimension) {
      if (workW > workH) {
        workH = Math.round((workH * maxDimension) / workW);
        workW = maxDimension;
      } else {
        workW = Math.round((workW * maxDimension) / workH);
        workH = maxDimension;
      }
    }

    const workCanvas = document.createElement('canvas');
    workCanvas.width = workW;
    workCanvas.height = workH;
    const workCtx = workCanvas.getContext('2d', { willReadFrequently: true });

    const defaultGeometry: DetectedGarmentGeometry = {
      shoulderLeftX: 0.22,
      shoulderRightX: 0.78,
      shoulderLineY: 0.13,
      neckCenterY: 0.05,
      torsoLeftX: 0.24,
      torsoRightX: 0.76,
      bottomY: 0.96,
      hangerRemoved: false,
    };

    if (!workCtx) {
      return {
        canvas: workCanvas,
        width: workW,
        height: workH,
        originalWidth: origW,
        originalHeight: origH,
        cropBox: { x: 0, y: 0, width: workW, height: workH },
        hadOpaqueBackground: false,
        backgroundRemoved: false,
        hangerRemoved: false,
        hasTransparency: false,
        geometry: defaultGeometry,
      };
    }

    workCtx.clearRect(0, 0, workW, workH);
    workCtx.drawImage(img, 0, 0, workW, workH);

    let hadOpaqueBackground = false;
    let backgroundRemoved = false;
    let hangerRemoved = false;
    let hasTransparency = false;
    let cropBox: BoundingBox = { x: 0, y: 0, width: workW, height: workH };

    try {
      const imageData = workCtx.getImageData(0, 0, workW, workH);
      const alreadyTransparent = this.checkBorderTransparency(imageData.data, workW, workH);

      if (alreadyTransparent) {
        hasTransparency = true;
      } else {
        hadOpaqueBackground = true;
        const borderBg = this.sampleBorderBackground(imageData.data, workW, workH);

        if (borderBg.uniformity >= 0.45) {
          const snapshot = new Uint8ClampedArray(imageData.data);
          const success = this.removeConnectedBackground(
            imageData,
            borderBg.r,
            borderBg.g,
            borderBg.b,
            48,
            22
          );

          if (success) {
            // Clear enclosed studio-background pockets trapped inside hanger/collar loops
            const loopYEnd = Math.floor(workH * 0.34);
            const loopXStart = Math.floor(workW * 0.32);
            const loopXEnd = Math.floor(workW * 0.68);
            for (let y = 0; y < loopYEnd; y++) {
              const rowOff = y * workW * 4;
              for (let x = loopXStart; x < loopXEnd; x++) {
                const off = rowOff + x * 4;
                if (imageData.data[off + 3] > 20) {
                  const d = this.colorDist(
                    imageData.data[off],
                    imageData.data[off + 1],
                    imageData.data[off + 2],
                    borderBg.r,
                    borderBg.g,
                    borderBg.b
                  );
                  if (d <= 44) {
                    imageData.data[off + 3] = 0;
                  }
                }
              }
            }
            workCtx.putImageData(imageData, 0, 0);
            backgroundRemoved = true;
            hasTransparency = true;
          } else {
            imageData.data.set(snapshot);
            workCtx.putImageData(imageData, 0, 0);
          }
        }
      }

      // 1st Bounding box pass (before hanger removal)
      let currentData = workCtx.getImageData(0, 0, workW, workH);
      const initialBox = this.detectBoundingBox(currentData.data, workW, workH);

      // Automatic hanger cleanup (only if transparent background exists so silhouette is clean)
      if (hasTransparency) {
        hangerRemoved = this.removeHanger(currentData, initialBox);
        if (hangerRemoved) {
          workCtx.putImageData(currentData, 0, 0);
        }
      }

      // 2nd Bounding box pass (after hanger removal, excludes hanger pixels from crop & anchors!)
      currentData = workCtx.getImageData(0, 0, workW, workH);
      cropBox = this.detectBoundingBox(currentData.data, workW, workH);
    } catch {
      return {
        canvas: workCanvas,
        width: workW,
        height: workH,
        originalWidth: origW,
        originalHeight: origH,
        cropBox,
        hadOpaqueBackground: false,
        backgroundRemoved: false,
        hangerRemoved: false,
        hasTransparency: false,
        geometry: defaultGeometry,
      };
    }

    // Crop empty margins into tight output canvas preserving alpha transparency
    const outCanvas = document.createElement('canvas');
    outCanvas.width = cropBox.width;
    outCanvas.height = cropBox.height;
    const outCtx = outCanvas.getContext('2d');

    if (outCtx) {
      outCtx.clearRect(0, 0, cropBox.width, cropBox.height);
      outCtx.drawImage(
        workCanvas,
        cropBox.x,
        cropBox.y,
        cropBox.width,
        cropBox.height,
        0,
        0,
        cropBox.width,
        cropBox.height
      );
    }

    // Analyze final cropped garment silhouette (neck, shoulders, core torso)
    const geometry = this.analyzeGarmentGeometry(outCanvas, hangerRemoved);

    return {
      canvas: outCanvas,
      width: cropBox.width,
      height: cropBox.height,
      originalWidth: workW,
      originalHeight: workH,
      cropBox,
      hadOpaqueBackground,
      backgroundRemoved,
      hangerRemoved,
      hasTransparency,
      geometry,
    };
  }
}
