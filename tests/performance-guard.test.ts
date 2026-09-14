import { describe, expect, it } from 'vitest';
import {
  DEGRADE_AFTER_MS,
  DEGRADE_BELOW_FPS,
  FpsMeter,
  RESTORE_AFTER_MS,
  RESTORE_ABOVE_FPS,
  initialGuardState,
  stepGuard,
  type GuardState,
} from '@/fx/PerformanceGuard';
import { FxQuality, FxSettings } from '@/fx/FxSettings';

/** Runs the guard for `ms` at a steady frame rate, 16ms at a time. */
function hold(state: GuardState, fps: number, ms: number): GuardState {
  let current = state;
  for (let elapsed = 0; elapsed < ms; elapsed += 16) current = stepGuard(current, 16, fps);
  return current;
}

describe('PerformanceGuard decisions', () => {
  it('leaves quality alone while the frame rate is healthy', () => {
    const after = hold(initialGuardState(), 60, 20_000);
    expect(after.tier).toBe(0);
  });

  it('does not degrade on a short dip', () => {
    // One bad second is a texture upload or a GC pause, not a slow device.
    const after = hold(initialGuardState(), 30, DEGRADE_AFTER_MS - 200);
    expect(after.tier).toBe(0);
  });

  it('drops one tier once the average stays bad', () => {
    const after = hold(initialGuardState(), 30, DEGRADE_AFTER_MS + 64);
    expect(after.tier).toBe(1);
  });

  it('sheds in the order CLAUDE.md #9 names, and stops at the last tier', () => {
    let state = initialGuardState();
    const seen: number[] = [];
    for (let i = 0; i < 5; i++) {
      state = hold(state, 20, DEGRADE_AFTER_MS + 64);
      seen.push(state.tier);
    }
    // particles -> backdrop -> screen effects, then nothing left to give.
    expect(seen).toEqual([1, 2, 3, 3, 3]);
  });

  it('gives a tier back only after a much longer good spell', () => {
    const degraded = hold(initialGuardState(), 30, DEGRADE_AFTER_MS + 64);
    expect(degraded.tier).toBe(1);

    const brieflyFine = hold(degraded, 60, DEGRADE_AFTER_MS + 64);
    expect(brieflyFine.tier).toBe(1);

    const properlyFine = hold(brieflyFine, 60, RESTORE_AFTER_MS + 64);
    expect(properlyFine.tier).toBe(0);
  });

  it('never flips tiers while sitting between the thresholds', () => {
    // The hysteresis band exists so a device parked on the line does not
    // toggle layers every second, which reads as a flickering bug.
    const between = (DEGRADE_BELOW_FPS + RESTORE_ABOVE_FPS) / 2;
    const after = hold(initialGuardState(), between, 60_000);
    expect(after.tier).toBe(0);
    expect(after.pressureMs).toBe(0);
  });

  it('does not carry pressure across a change of direction', () => {
    const nearlyDegraded = hold(initialGuardState(), 30, DEGRADE_AFTER_MS - 100);
    const recovered = hold(nearlyDegraded, 60, 400);
    // Pressure toward degrading must not survive as credit toward restoring.
    expect(recovered.tier).toBe(0);
    expect(recovered.pressureMs).toBeLessThanOrEqual(0);
  });
});

describe('FpsMeter', () => {
  it('reports nothing until its window has filled', () => {
    const meter = new FpsMeter(10);
    for (let i = 0; i < 9; i++) meter.push(16);
    expect(meter.average()).toBeNull();
    meter.push(16);
    expect(meter.average()).toBeCloseTo(62.5, 1);
  });

  it('ignores a stalled frame instead of averaging it in', () => {
    const meter = new FpsMeter(4);
    meter.push(16);
    meter.push(16);
    // A backgrounded tab, or the frame a level was built on.
    meter.push(5000);
    expect(meter.average()).toBeNull();
    meter.push(16);
    meter.push(16);
    expect(meter.average()).toBeCloseTo(62.5, 1);
  });

  it('forgets the old window on reset', () => {
    const meter = new FpsMeter(4);
    for (let i = 0; i < 4; i++) meter.push(50);
    expect(meter.average()).toBeCloseTo(20, 1);
    meter.reset();
    expect(meter.average()).toBeNull();
  });
});

describe('what each tier actually turns off', () => {
  const restore = (): void => {
    FxQuality.tier = 0;
    FxSettings.particlesEnabled = true;
    FxSettings.shakeEnabled = true;
  };

  it('sheds particles, then the backdrop, then screen effects — in that order', () => {
    restore();
    expect([FxQuality.particlesAllowed(), FxQuality.backdropAllowed(), FxQuality.screenEffectsAllowed()]).toEqual([true, true, true]);

    FxQuality.tier = 1;
    expect([FxQuality.particlesAllowed(), FxQuality.backdropAllowed(), FxQuality.screenEffectsAllowed()]).toEqual([false, true, true]);

    FxQuality.tier = 2;
    expect([FxQuality.particlesAllowed(), FxQuality.backdropAllowed(), FxQuality.screenEffectsAllowed()]).toEqual([false, false, true]);

    FxQuality.tier = 3;
    expect([FxQuality.particlesAllowed(), FxQuality.backdropAllowed(), FxQuality.screenEffectsAllowed()]).toEqual([false, false, false]);
    restore();
  });

  it("never rewrites the player's own settings", () => {
    // Degrading is not a settings change: a player who turned particles off
    // and back on must get them back once the device recovers.
    restore();
    FxSettings.particlesEnabled = false;
    FxQuality.tier = 3;
    expect(FxSettings.particlesEnabled).toBe(false);
    FxQuality.tier = 0;
    expect(FxSettings.particlesEnabled).toBe(false);
    FxSettings.particlesEnabled = true;
    expect(FxQuality.particlesAllowed()).toBe(true);
    restore();
  });

  it('keeps an effect off when the player turned it off, whatever the tier', () => {
    restore();
    FxSettings.shakeEnabled = false;
    FxQuality.tier = 0;
    expect(FxQuality.screenEffectsAllowed()).toBe(false);
    restore();
  });
});
