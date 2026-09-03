import { MIN_WARNING_MS } from '@/config/physics';

/**
 * Shared phase-cycle timing for traps that telegraph before becoming
 * lethal: idle (safe, dim) → warning (visible tell, not yet lethal) →
 * active (lethal) → cooldown (fading back to idle) → idle, looping.
 *
 * `warningMs` must never be shortened below MIN_WARNING_MS — that number is
 * the honesty invariant (CLAUDE.md #4.2), not a tuning knob.
 */
export interface TrapTiming {
  idleMs: number;
  warningMs: number;
  activeMs: number;
  cooldownMs: number;
}

export const DEFAULT_TRAP_TIMING: TrapTiming = {
  idleMs: 900,
  warningMs: 400,
  activeMs: 700,
  cooldownMs: 300,
};

export function assertHonestTiming(timing: TrapTiming, trapLabel: string): void {
  if (timing.warningMs < MIN_WARNING_MS) {
    throw new Error(
      `${trapLabel}: warningMs (${timing.warningMs}) is below MIN_WARNING_MS (${MIN_WARNING_MS}) — CLAUDE.md #4.2`,
    );
  }
}
