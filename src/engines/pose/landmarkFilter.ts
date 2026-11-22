import { NormalizedLandmark } from '../../types/pose';

/**
 * Low-pass filter with exponential smoothing: y = alpha * x + (1 - alpha) * y_prev
 */
class LowPassFilter {
  private y: number | null = null;
  private s: number | null = null;

  reset(): void {
    this.y = null;
    this.s = null;
  }

  filter(value: number, alpha: number): number {
    if (this.y === null) {
      this.s = value;
      this.y = value;
      return value;
    }
    this.y = alpha * value + (1 - alpha) * (this.s ?? value);
    this.s = this.y;
    return this.y;
  }

  hasLast(): boolean {
    return this.y !== null;
  }

  last(): number {
    return this.y ?? 0;
  }
}

/**
 * 1€ Filter (One Euro Filter) implementation for real-time human pose jitter reduction.
 * Casiez, G., Roussel, N. and Vogel, F. (2012)
 *
 * It uses a low-pass filter on the raw values whose cutoff frequency adapts dynamically
 * based on the rate of change (velocity).
 * - Low speed = low cutoff frequency = removes stationary jitter.
 * - High speed = high cutoff frequency = zero lag / sluggishness.
 */
export class OneEuroFilter1D {
  private minCutoff: number;
  private beta: number;
  private dCutoff: number;
  private xFilt = new LowPassFilter();
  private dxFilt = new LowPassFilter();
  private lastTime: number | null = null;

  constructor(minCutoff: number = 1.0, beta: number = 0.007, dCutoff: number = 1.0) {
    this.minCutoff = minCutoff;
    this.beta = beta;
    this.dCutoff = dCutoff;
  }

  private alpha(cutoff: number, dt: number): number {
    const tau = 1.0 / (2 * Math.PI * cutoff);
    return 1.0 / (1.0 + tau / dt);
  }

  filter(x: number, timestampMs: number): number {
    if (this.lastTime === null) {
      this.lastTime = timestampMs;
      return this.xFilt.filter(x, 1.0);
    }

    const dt = Math.max(1e-3, (timestampMs - this.lastTime) / 1000.0);
    this.lastTime = timestampMs;

    // Estimate derivative (velocity)
    const prevX = this.xFilt.hasLast() ? this.xFilt.last() : x;
    const dx = (x - prevX) / dt;
    const edx = this.dxFilt.filter(dx, this.alpha(this.dCutoff, dt));

    // Dynamic cutoff frequency
    const cutoff = this.minCutoff + this.beta * Math.abs(edx);
    return this.xFilt.filter(x, this.alpha(cutoff, dt));
  }

  reset(): void {
    this.xFilt.reset();
    this.dxFilt.reset();
    this.lastTime = null;
  }
}

export interface LandmarkFilterOptions {
  minCutoff?: number; // Minimum cutoff frequency (Hz) - lower means smoother when stationary
  beta?: number;      // Speed coefficient - higher means faster reaction when moving
  dCutoff?: number;   // Cutoff for derivative
}

/**
 * Multi-landmark filter that applies One Euro filtering independently to
 * each coordinate (x, y, z) of all 33 MediaPipe pose landmarks.
 */
export class PoseLandmarksFilter {
  private filtersX: OneEuroFilter1D[] = [];
  private filtersY: OneEuroFilter1D[] = [];
  private filtersZ: OneEuroFilter1D[] = [];
  private options: Required<LandmarkFilterOptions>;

  constructor(options?: LandmarkFilterOptions) {
    this.options = {
      minCutoff: options?.minCutoff ?? 1.2,
      beta: options?.beta ?? 0.05,
      dCutoff: options?.dCutoff ?? 1.0,
    };
  }

  private ensureFilters(count: number): void {
    while (this.filtersX.length < count) {
      this.filtersX.push(new OneEuroFilter1D(this.options.minCutoff, this.options.beta, this.options.dCutoff));
      this.filtersY.push(new OneEuroFilter1D(this.options.minCutoff, this.options.beta, this.options.dCutoff));
      this.filtersZ.push(new OneEuroFilter1D(this.options.minCutoff, this.options.beta, this.options.dCutoff));
    }
  }

  /**
   * Smooths an array of normalized landmarks.
   */
  filterLandmarks(landmarks: NormalizedLandmark[], timestampMs: number): NormalizedLandmark[] {
    if (!landmarks || landmarks.length === 0) return [];
    this.ensureFilters(landmarks.length);

    return landmarks.map((lm, i) => {
      const fx = this.filtersX[i].filter(lm.x, timestampMs);
      const fy = this.filtersY[i].filter(lm.y, timestampMs);
      const fz = this.filtersZ[i].filter(lm.z ?? 0, timestampMs);

      return {
        x: fx,
        y: fy,
        z: fz,
        visibility: lm.visibility,
      };
    });
  }

  /**
   * Resets all filters (call when person leaves frame or tracking is lost)
   */
  reset(): void {
    this.filtersX.forEach((f) => f.reset());
    this.filtersY.forEach((f) => f.reset());
    this.filtersZ.forEach((f) => f.reset());
  }
}

export const poseLandmarksFilter = new PoseLandmarksFilter();
