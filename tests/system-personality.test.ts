import { describe, expect, it } from 'vitest';
import { personalityTag } from '@/ai/SystemPersonality';

describe('personalityTag', () => {
  it('is v1.0 for sector 1', () => {
    expect(personalityTag('sector-01-level-01')).toBe('v1.0');
    expect(personalityTag('sector-01-level-06')).toBe('v1.0');
  });

  it('is v1.0 for sector 2', () => {
    expect(personalityTag('sector-02-level-04')).toBe('v1.0');
  });

  it('is v1.4 for sector 3', () => {
    expect(personalityTag('sector-03-level-01')).toBe('v1.4');
  });

  it('is v1.4 for sector 4', () => {
    expect(personalityTag('sector-04-level-06')).toBe('v1.4');
  });

  it('is v2.0 for sector 5', () => {
    expect(personalityTag('sector-05-level-01')).toBe('v2.0');
    expect(personalityTag('sector-05-level-06')).toBe('v2.0');
  });

  it('never regresses within a sector — every level in it maps to the same tag', () => {
    for (let i = 1; i <= 6; i += 1) {
      expect(personalityTag(`sector-03-level-0${i}`)).toBe('v1.4');
    }
  });

  it('falls back to v1.0 for an unrecognized level id shape', () => {
    expect(personalityTag('not-a-level-id')).toBe('v1.0');
  });
});
