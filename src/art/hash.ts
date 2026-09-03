/**
 * Deterministic pseudo-random helpers for decorative art placement —
 * building widths, cable sag, panel seams. Same input always produces the
 * same output, so composition is reproducible from position (art-direction
 * reset), the same discipline CLAUDE.md #4.6 requires for gameplay RNG,
 * applied here to visuals instead. Never use `Math.random()` for anything
 * a screenshot could capture.
 */
export function hashInt(seed: number): number {
  let x = seed | 0;
  x = Math.imul(x ^ (x >>> 16), 0x45d9f3b);
  x = Math.imul(x ^ (x >>> 16), 0x45d9f3b);
  x = x ^ (x >>> 16);
  return x >>> 0;
}

/** Deterministic float in [0, 1). */
export function hash01(seed: number): number {
  return (hashInt(seed) % 1000000) / 1000000;
}

/** Deterministic float in [min, max). */
export function hashRange(seed: number, min: number, max: number): number {
  return min + hash01(seed) * (max - min);
}

/** FNV-1a — turns a level id into a numeric seed so different levels don't share one skyline. */
export function stringHash(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}
