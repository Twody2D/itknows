import { beforeEach, describe, expect, it } from 'vitest';
import { Commentator, HESITATION_THRESHOLD_MS } from '@/ai/Commentator';
import { DIALOGUE_POOLS } from '@/data/dialogues';

const zeroRng = (): number => 0;

describe('Commentator.resolveDeathCategory', () => {
  it('prioritizes near_exit over everything else', () => {
    const category = Commentator.resolveDeathCategory({
      cause: 'fall',
      attemptElapsedMs: 100,
      totalDeaths: 10,
      repeatDeathCount: 5,
      progressFraction: 0.9,
    });
    expect(category).toBe('near_exit');
  });

  it('falls to fall when not near the exit', () => {
    const category = Commentator.resolveDeathCategory({
      cause: 'fall',
      attemptElapsedMs: 5000,
      totalDeaths: 1,
      repeatDeathCount: 0,
      progressFraction: 0.2,
    });
    expect(category).toBe('fall');
  });

  it('flags a very quick death as early_death', () => {
    const category = Commentator.resolveDeathCategory({
      cause: 'spike',
      attemptElapsedMs: 500,
      totalDeaths: 1,
      repeatDeathCount: 0,
      progressFraction: 0.1,
    });
    expect(category).toBe('early_death');
  });

  it('flags 2+ repeat deaths as repeated_mistake once early/fall/near-exit are ruled out', () => {
    const category = Commentator.resolveDeathCategory({
      cause: 'spike',
      attemptElapsedMs: 5000,
      totalDeaths: 3,
      repeatDeathCount: 2,
      progressFraction: 0.3,
    });
    expect(category).toBe('repeated_mistake');
  });

  it('flags a round-number death count as multiple_deaths', () => {
    const category = Commentator.resolveDeathCategory({
      cause: 'spike',
      attemptElapsedMs: 5000,
      totalDeaths: 10,
      repeatDeathCount: 0,
      progressFraction: 0.3,
    });
    expect(category).toBe('multiple_deaths');
  });

  it('falls back to general when nothing specific matches', () => {
    const category = Commentator.resolveDeathCategory({
      cause: 'spike',
      attemptElapsedMs: 5000,
      totalDeaths: 3,
      repeatDeathCount: 0,
      progressFraction: 0.3,
    });
    expect(category).toBe('general');
  });
});

describe('Commentator line selection', () => {
  beforeEach(() => {
    Commentator.reset();
  });

  it('never repeats a line while another option in the pool is still available', () => {
    const seen = new Set<string>();
    for (let i = 0; i < 20; i += 1) {
      const line = Commentator.commentOnDeath(
        { cause: 'spike', attemptElapsedMs: 5000, totalDeaths: 3, repeatDeathCount: 0, progressFraction: 0.3 },
        zeroRng,
      );
      if (seen.has(line.id) && seen.size < DIALOGUE_POOLS.general.length) {
        throw new Error(`repeated "${line.id}" before exhausting the ${DIALOGUE_POOLS.general.length}-line pool`);
      }
      seen.add(line.id);
    }
    expect(seen.size).toBeGreaterThan(1);
  });

  it('returns null for hesitation below the threshold', () => {
    expect(Commentator.commentOnHesitation(HESITATION_THRESHOLD_MS - 1)).toBeNull();
  });

  it('returns a line at/above the hesitation threshold', () => {
    const line = Commentator.commentOnHesitation(HESITATION_THRESHOLD_MS);
    expect(line).not.toBeNull();
  });

  it('emits a system:comment event with localized text', async () => {
    const { EventBus } = await import('@/core/EventBus');
    const events: { text: string; category: string }[] = [];
    EventBus.on('system:comment', (p) => events.push(p));
    Commentator.commentOnAdaptation();
    expect(events).toHaveLength(1);
    expect(events[0]?.category).toBe('successful_adaptation');
    expect(typeof events[0]?.text).toBe('string');
  });
});
