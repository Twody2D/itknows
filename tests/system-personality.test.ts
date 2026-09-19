import { describe, expect, it } from 'vitest';
import { FINAL_PERSONALITY_TAG, personalityTag } from '@/ai/SystemPersonality';
import { LEVELS_PER_SECTOR, SECTOR_COUNT, levelIdFor } from '@/gameplay/sectors';

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

  /**
   * The ladder has to reach the end of the campaign, and it has to change
   * only at sector boundaries. Before the campaign doubled it stopped at
   * v2.0 from sector 5 on — six of the ten sectors would have shared one
   * version, which is a reveal that quietly stops revealing.
   */
  it('keeps climbing to the last sector instead of flattening halfway', () => {
    const tags = Array.from({ length: SECTOR_COUNT }, (_, i) => personalityTag(levelIdFor(i + 1, 1)));
    expect(new Set(tags).size).toBeGreaterThanOrEqual(5);
    expect(personalityTag(levelIdFor(SECTOR_COUNT, 1))).toBe(FINAL_PERSONALITY_TAG);
    expect(FINAL_PERSONALITY_TAG).not.toBe(personalityTag(levelIdFor(5, 1)));
  });

  it('never changes inside a sector, in any sector', () => {
    for (let sector = 1; sector <= SECTOR_COUNT; sector++) {
      const first = personalityTag(levelIdFor(sector, 1));
      for (let level = 2; level <= LEVELS_PER_SECTOR; level++) {
        expect(personalityTag(levelIdFor(sector, level)), `sector ${sector}`).toBe(first);
      }
    }
  });
});
