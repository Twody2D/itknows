import { describe, expect, it } from 'vitest';
import { isLevelUnlocked, levelIdFor, previousLevelId, LEVELS_PER_SECTOR } from '@/gameplay/sectors';

const cleared = (...ids: string[]): ((id: string) => boolean) => {
  const set = new Set(ids);
  return (id: string) => set.has(id);
};

describe('previousLevelId', () => {
  it('steps back within a sector', () => {
    expect(previousLevelId(levelIdFor(1, 4))).toBe(levelIdFor(1, 3));
  });

  it('crosses into the last level of the sector before', () => {
    expect(previousLevelId(levelIdFor(2, 1))).toBe(levelIdFor(1, LEVELS_PER_SECTOR));
  });

  it('has nothing before the first level of the campaign', () => {
    expect(previousLevelId(levelIdFor(1, 1))).toBeNull();
  });
});

describe('isLevelUnlocked', () => {
  it('opens the first level of the campaign on a clean save', () => {
    expect(isLevelUnlocked(levelIdFor(1, 1), cleared())).toBe(true);
  });

  it('keeps a level shut until the one before it is cleared', () => {
    expect(isLevelUnlocked(levelIdFor(1, 2), cleared())).toBe(false);
    expect(isLevelUnlocked(levelIdFor(1, 2), cleared(levelIdFor(1, 1)))).toBe(true);
  });

  it('does not open a level two steps ahead', () => {
    expect(isLevelUnlocked(levelIdFor(1, 3), cleared(levelIdFor(1, 1)))).toBe(false);
  });

  it('opens the next sector only once the previous one is finished', () => {
    const upToFifth = cleared(...Array.from({ length: 5 }, (_, i) => levelIdFor(1, i + 1)));
    expect(isLevelUnlocked(levelIdFor(2, 1), upToFifth)).toBe(false);

    const wholeSector = cleared(...Array.from({ length: LEVELS_PER_SECTOR }, (_, i) => levelIdFor(1, i + 1)));
    expect(isLevelUnlocked(levelIdFor(2, 1), wholeSector)).toBe(true);
  });

  it('leaves a cleared level open for a replay', () => {
    expect(isLevelUnlocked(levelIdFor(1, 2), cleared(levelIdFor(1, 1), levelIdFor(1, 2)))).toBe(true);
  });
});
