/**
 * Deterministic pseudo-random number generation.
 *
 * Anything rendered on the server AND hydrated on the client must produce
 * identical values on both passes, otherwise React throws a hydration
 * mismatch (error #418). `Math.random()` cannot be used for that.
 *
 * These helpers give us a stable, reproducible stream keyed off a string
 * (site id, router id, …) so the same entity always yields the same numbers.
 */

/** mulberry32 — small, fast, good enough distribution for display data. */
export function seededRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** FNV-1a — stable string → 32-bit seed. */
export function hashSeed(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Seeded generator bound to a string key. */
export function rngFor(key: string): () => number {
  return seededRandom(hashSeed(key));
}

/** Integer in [min, max]. */
export function randInt(rand: () => number, min: number, max: number): number {
  return min + Math.floor(rand() * (max - min + 1));
}

/** Float in [min, max). */
export function randFloat(rand: () => number, min: number, max: number): number {
  return min + rand() * (max - min);
}

/**
 * A smooth-ish series of `n` values around `base`, mirroring the shape used
 * by the existing sparkline charts.
 */
export function series(
  base: number,
  variance: number,
  n: number,
  seed: number,
  frequency = 0.5,
): number[] {
  const rand = seededRandom(seed);
  return Array.from({ length: n }, (_, i) =>
    Math.max(0, base + Math.sin(i * frequency) * variance + (rand() - 0.5) * variance * 0.4),
  );
}
