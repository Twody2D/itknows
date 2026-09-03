import { beforeEach, describe, expect, it } from 'vitest';
import { PlayerProfile } from '@/ai/PlayerProfile';
import type { AttemptSummary } from '@/ai/PlayerProfile';

function summary(overrides: Partial<AttemptSummary> = {}): AttemptSummary {
  return {
    jumps: 4,
    activeMs: 4000,
    leftMs: 1000,
    rightMs: 3000,
    hesitationMs: 200,
    reactionSamplesMs: [400],
    riskEncounters: 1,
    riskSurvived: 1,
    cause: null,
    cleared: true,
    ...overrides,
  };
}

describe('PlayerProfile', () => {
  beforeEach(() => {
    PlayerProfile.reset();
  });

  it('starts with a neutral, fully-numeric profile', () => {
    const p = PlayerProfile.snapshot();
    expect(p.leftPreference).toBeCloseTo(0.5);
    expect(p.rightPreference).toBeCloseTo(0.5);
    expect(p.preferredRoute).toBe(0);
    expect(p.recentFailures).toBe(0);
    expect(p.recentSuccesses).toBe(0);
    expect(p.deathPatterns).toEqual({ spike: 0, trap: 0, fall: 0 });
  });

  it('nudges rightPreference/preferredRoute toward a right-biased attempt', () => {
    PlayerProfile.integrate(summary({ leftMs: 500, rightMs: 3500 }));
    const p = PlayerProfile.snapshot();
    expect(p.rightPreference).toBeGreaterThan(0.5);
    expect(p.preferredRoute).toBeGreaterThan(0);
  });

  it('accumulates lifetime death counts by cause', () => {
    PlayerProfile.integrate(summary({ cause: 'spike', cleared: false }));
    PlayerProfile.integrate(summary({ cause: 'spike', cleared: false }));
    PlayerProfile.integrate(summary({ cause: 'fall', cleared: false }));
    expect(PlayerProfile.snapshot().deathPatterns).toEqual({ spike: 2, trap: 0, fall: 1 });
  });

  it('EMA-blends jumpFrequency toward the sampled rate instead of overwriting it', () => {
    PlayerProfile.integrate(summary({ jumps: 8, activeMs: 4000 })); // 2 jumps/s
    const first = PlayerProfile.snapshot().jumpFrequency;
    expect(first).toBeGreaterThan(0);
    expect(first).toBeLessThan(2); // EMA, not a hard overwrite
  });

  it('keeps recentFailures/recentSuccesses to a bounded rolling window of 5', () => {
    for (let i = 0; i < 5; i += 1) PlayerProfile.integrate(summary({ cleared: true }));
    expect(PlayerProfile.snapshot().recentSuccesses).toBe(5);

    PlayerProfile.integrate(summary({ cleared: false }));
    const p = PlayerProfile.snapshot();
    expect(p.recentSuccesses + p.recentFailures).toBe(5);
    expect(p.recentFailures).toBe(1);
  });

  it('reset() returns to the initial neutral profile', () => {
    PlayerProfile.integrate(summary({ cause: 'trap', cleared: false }));
    PlayerProfile.reset();
    expect(PlayerProfile.snapshot().deathPatterns.trap).toBe(0);
  });
});
