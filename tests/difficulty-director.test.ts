import { describe, expect, it } from 'vitest';
import { selectVariant } from '@/ai/DifficultyDirector';
import type { PlayerProfileData } from '@/ai/PlayerProfile';
import type { SystemMemoryData } from '@/ai/SystemMemory';

function profile(overrides: Partial<PlayerProfileData> = {}): PlayerProfileData {
  return {
    jumpFrequency: 0,
    leftPreference: 0.5,
    rightPreference: 0.5,
    averageReaction: 600,
    riskLevel: 0,
    deathPatterns: { spike: 0, trap: 0, fall: 0 },
    hesitationTime: 0,
    preferredRoute: 0,
    recentFailures: 0,
    recentSuccesses: 0,
    ...overrides,
  };
}

function memory(overrides: Partial<SystemMemoryData> = {}): SystemMemoryData {
  return {
    lastDeathType: null,
    repeatDeathCount: 0,
    recentTrap: null,
    recentSuccessfulAdaptation: false,
    currentStreak: 0,
    ...overrides,
  };
}

const LEVEL_WITH_VARIANTS = 'sector-02-level-01';
const LEVEL_WITHOUT_VARIANTS = 'sector-01-level-01';

describe('DifficultyDirector.selectVariant', () => {
  it('always returns "standard" for a level with no authored variants', () => {
    const id = selectVariant(LEVEL_WITHOUT_VARIANTS, profile(), memory({ repeatDeathCount: 5 }));
    expect(id).toBe('standard');
  });

  it('returns "standard" by default when neither struggling nor thriving', () => {
    expect(selectVariant(LEVEL_WITH_VARIANTS, profile(), memory())).toBe('standard');
  });

  it('picks "gentle" after 2+ repeat deaths on the same level/cause', () => {
    const id = selectVariant(LEVEL_WITH_VARIANTS, profile(), memory({ repeatDeathCount: 2 }));
    expect(id).toBe('gentle');
  });

  it('picks "bold" for a streak with zero recent failures', () => {
    const id = selectVariant(LEVEL_WITH_VARIANTS, profile({ recentFailures: 0 }), memory({ currentStreak: 3 }));
    expect(id).toBe('bold');
  });

  it('does not pick "bold" if there were recent failures, even mid-streak', () => {
    const id = selectVariant(LEVEL_WITH_VARIANTS, profile({ recentFailures: 1 }), memory({ currentStreak: 5 }));
    expect(id).toBe('standard');
  });

  it('struggling takes priority over thriving if both signals somehow line up', () => {
    const id = selectVariant(
      LEVEL_WITH_VARIANTS,
      profile({ recentFailures: 0 }),
      memory({ repeatDeathCount: 2, currentStreak: 3 }),
    );
    expect(id).toBe('gentle');
  });
});
