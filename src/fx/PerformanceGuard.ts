/**
 * Automatic quality degradation by measured FPS (CLAUDE.md #9).
 *
 * The order is fixed and it is the order in the rule: particles first, then
 * the background layers, then screen effects. What is NEVER degraded is
 * physics, input, and anything a player has to see to survive — a trap's
 * warning phase sets its own alpha rather than relying on `FxManager`'s
 * pulse (see `AmbushSpikeTrap`), so every tier below still telegraphs
 * exactly as CLAUDE.md #4.2 requires. Dropping to `SCREEN_EFFECTS` makes the
 * game look plainer; it never makes it less fair.
 *
 * The decision half lives here as a pure function over (tier, samples) so it
 * can be tested without a renderer; `FxQuality` holds the current tier and
 * every consumer reads it live.
 */

export const QUALITY_TIERS = ['full', 'no-particles', 'no-backdrop', 'no-screen-fx'] as const;
export type QualityTier = 0 | 1 | 2 | 3;

/**
 * Below this average, the frame budget is already being missed often enough
 * that something has to go. Not 60: a device that holds 55 is fine, and
 * degrading it would cost visible quality to buy nothing.
 */
export const DEGRADE_BELOW_FPS = 50;

/**
 * And above this, there is headroom to put something back. The gap between
 * the two is the hysteresis — without it a device sitting exactly on the
 * threshold would flip layers on and off every second, which reads as a
 * flickering bug rather than as adaptation.
 */
export const RESTORE_ABOVE_FPS = 58;

/** How long a bad average must persist before dropping a tier. Long enough that one stalled frame — a texture upload, a GC pause — never costs quality. */
export const DEGRADE_AFTER_MS = 1500;

/** And how long a good one must persist before giving a tier back. Deliberately far longer: getting worse should be quick, getting better should be sure. */
export const RESTORE_AFTER_MS = 6000;

export interface GuardState {
  tier: QualityTier;
  /** Milliseconds the average has been under `DEGRADE_BELOW_FPS`, or over `RESTORE_ABOVE_FPS` when negative. */
  pressureMs: number;
}

export function initialGuardState(): GuardState {
  return { tier: 0, pressureMs: 0 };
}

/**
 * One step of the decision, given the frame's delta and the average FPS over
 * the recent window. Pure: same inputs, same outputs, no clock of its own.
 *
 * `averageFps` between the two thresholds is the quiet band — the pressure
 * decays toward zero there rather than being reset outright, so a device
 * that dips in and out of trouble still eventually acts on the trend.
 */
export function stepGuard(state: GuardState, deltaMs: number, averageFps: number): GuardState {
  if (averageFps < DEGRADE_BELOW_FPS) {
    const pressureMs = Math.max(state.pressureMs, 0) + deltaMs;
    if (pressureMs >= DEGRADE_AFTER_MS && state.tier < 3) {
      return { tier: (state.tier + 1) as QualityTier, pressureMs: 0 };
    }
    return { tier: state.tier, pressureMs };
  }

  if (averageFps > RESTORE_ABOVE_FPS) {
    const pressureMs = Math.min(state.pressureMs, 0) - deltaMs;
    if (-pressureMs >= RESTORE_AFTER_MS && state.tier > 0) {
      return { tier: (state.tier - 1) as QualityTier, pressureMs: 0 };
    }
    return { tier: state.tier, pressureMs };
  }

  const decayed = state.pressureMs > 0 ? Math.max(state.pressureMs - deltaMs, 0) : Math.min(state.pressureMs + deltaMs, 0);
  return { tier: state.tier, pressureMs: decayed };
}

/**
 * A rolling mean of the last `size` frame rates, as a fixed-size ring — no
 * allocation per frame (CLAUDE.md #9's own rule about `update()`).
 *
 * Frames longer than `MAX_SAMPLE_MS` are thrown away rather than averaged
 * in: a tab that was backgrounded, or a scene that just built a level,
 * produces one enormous delta that has nothing to do with how the game runs.
 */
export class FpsMeter {
  private readonly samples: Float32Array;
  private index = 0;
  private filled = 0;
  private sum = 0;

  /** Anything slower than 5 FPS is a stall, not a frame rate. */
  static readonly MAX_SAMPLE_MS = 200;

  constructor(size = 30) {
    this.samples = new Float32Array(size);
  }

  push(deltaMs: number): void {
    if (deltaMs <= 0 || deltaMs > FpsMeter.MAX_SAMPLE_MS) return;
    const fps = 1000 / deltaMs;
    this.sum -= this.samples[this.index] ?? 0;
    this.samples[this.index] = fps;
    this.sum += fps;
    this.index = (this.index + 1) % this.samples.length;
    if (this.filled < this.samples.length) this.filled += 1;
  }

  /** `null` until the window has filled — acting on two frames' worth of evidence is how a loading hitch gets mistaken for a slow device. */
  average(): number | null {
    if (this.filled < this.samples.length) return null;
    return this.sum / this.filled;
  }

  reset(): void {
    this.samples.fill(0);
    this.index = 0;
    this.filled = 0;
    this.sum = 0;
  }
}
