import { describe, expect, it } from 'vitest';
import { dailyChallengeDateKey, getDailyChallenge } from '@/gameplay/DailyChallenge';
import { getAllLevels } from '@/gameplay/LevelFactory';

const DAY_MS = 24 * 60 * 60 * 1000;

describe('DailyChallenge', () => {
  it('resolves the UTC calendar date, not the local one', () => {
    // 2026-03-01T23:30:00Z stays 2026-03-01 in UTC regardless of the host's
    // own timezone — this is exactly the guarantee the date key exists for.
    expect(dailyChallengeDateKey(Date.UTC(2026, 2, 1, 23, 30))).toBe('2026-03-01');
    expect(dailyChallengeDateKey(Date.UTC(2026, 2, 2, 0, 0))).toBe('2026-03-02');
  });

  it('is deterministic: any two timestamps on the same UTC day resolve to the same level', () => {
    const morning = getDailyChallenge(Date.UTC(2026, 5, 10, 1, 0));
    const evening = getDailyChallenge(Date.UTC(2026, 5, 10, 23, 59));
    expect(evening).toEqual(morning);
  });

  it('crossing midnight UTC changes the date key', () => {
    const day1 = getDailyChallenge(Date.UTC(2026, 5, 10, 23, 59));
    const day2 = getDailyChallenge(Date.UTC(2026, 5, 11, 0, 0));
    expect(day2.date).not.toBe(day1.date);
  });

  it('always resolves to a real campaign level id', () => {
    const ids = new Set(getAllLevels().map((l) => l.id));
    const { levelId } = getDailyChallenge(Date.now());
    expect(ids.has(levelId)).toBe(true);
  });

  it('spreads across more than one level over a stretch of days (not always the same one)', () => {
    const seen = new Set<string>();
    for (let i = 0; i < 30; i++) {
      seen.add(getDailyChallenge(Date.UTC(2026, 0, 1) + i * DAY_MS).levelId);
    }
    expect(seen.size).toBeGreaterThan(1);
  });
});
