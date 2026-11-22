declare module 'vitest' {
  export interface Assertion {
    toBe(expected: unknown): void;
    toBeDefined(): void;
    toBeUndefined(): void;
    toHaveLength(expected: number): void;
    toBeCloseTo(expected: number, precision?: number): void;
    toBeGreaterThan(expected: number): void;
    toBeLessThan(expected: number): void;
    toEqual(expected: unknown): void;
  }

  export function describe(name: string, fn: () => void): void;
  export function it(name: string, fn: () => void | Promise<void>): void;
  export function test(name: string, fn: () => void | Promise<void>): void;
  export function expect(actual: unknown): Assertion;
}
