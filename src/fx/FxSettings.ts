import type { QualityTier } from './PerformanceGuard';

/**
 * Session-only FX toggles. Mutable module state on purpose — `FxManager`
 * reads these live on every call, and the Settings screen only has to flip
 * these fields, not reach into every scene.
 *
 * These are the PLAYER's choices. What the game itself decides under load
 * lives in `FxQuality` below, and the two are kept apart deliberately:
 * auto-degradation must never rewrite a setting the player made, or turning
 * particles back on after a slow patch would silently fail.
 */
export const FxSettings = {
  particlesEnabled: true,
  shakeEnabled: true,
};

/**
 * The current auto-degradation tier and the questions every effect asks it.
 *
 * Set by `PerformanceGuard` from measured FPS; read live, the same way
 * `FxSettings` is. The order of what goes is CLAUDE.md #9's: particles,
 * then background layers, then screen effects — and nothing a player needs
 * to see is on this list at all (see `PerformanceGuard`'s doc comment).
 */
export const FxQuality = {
  tier: 0 as QualityTier,

  /** Dust, bursts, trails — the first thing to go. */
  particlesAllowed(): boolean {
    return FxSettings.particlesEnabled && this.tier < 1;
  },

  /** The parallax skyline behind the level. The floor, the traps and the player are not part of this. */
  backdropAllowed(): boolean {
    return this.tier < 2;
  },

  /** Screen shake, and any other whole-frame effect. */
  screenEffectsAllowed(): boolean {
    return FxSettings.shakeEnabled && this.tier < 3;
  },
};
