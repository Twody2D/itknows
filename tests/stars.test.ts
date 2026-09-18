import { describe, expect, it } from 'vitest';
import {
  FIRST_GATED_SECTOR,
  MAX_STARS,
  canPlayLevel,
  isSectorUnlocked,
  starGateFor,
  starsAvailableThrough,
  starsFor,
} from '@/gameplay/stars';
import { LEVELS_PER_SECTOR, levelIdFor } from '@/gameplay/sectors';

const cleared = (...ids: string[]) => (id: string) => ids.includes(id);

describe('stars for a run', () => {
  it('pays one star for clearing the level at all', () => {
    expect(starsFor({ timeMs: 99_000, deaths: 7, parMs: 8000 })).toBe(1);
  });

  it('pays two for a deathless run that missed the target time', () => {
    expect(starsFor({ timeMs: 12_000, deaths: 0, parMs: 8000 })).toBe(2);
  });

  it('pays three for a deathless run inside the target time', () => {
    expect(starsFor({ timeMs: 7999, deaths: 0, parMs: 8000 })).toBe(3);
    expect(starsFor({ timeMs: 8000, deaths: 0, parMs: 8000 })).toBe(3);
  });

  /**
   * The whole reason time is only read for a deathless run: after a death
   * `GameState.elapsedMs()` covers the failed attempts too, on purpose. A fast
   * number there describes a different thing than the same number on a clean
   * run, and must never buy the same star.
   */
  it('never pays for speed once the player has died, however fast the clock reads', () => {
    expect(starsFor({ timeMs: 1, deaths: 1, parMs: 8000 })).toBe(1);
  });

  it('stops at two stars on a level with no derivable target', () => {
    expect(starsFor({ timeMs: 1, deaths: 0, parMs: null })).toBe(2);
  });
});

describe('star gate on the later sectors', () => {
  it('leaves the original campaign ungated', () => {
    for (let sector = 1; sector < FIRST_GATED_SECTOR; sector++) {
      expect(starGateFor(sector), `sector ${sector}`).toBe(0);
      expect(isSectorUnlocked(sector, 0)).toBe(true);
    }
  });

  it('asks the first gated sector for half of what came before', () => {
    // Five sectors of six levels at three stars each.
    expect(starsAvailableThrough(FIRST_GATED_SECTOR - 1)).toBe(90);
    expect(starGateFor(FIRST_GATED_SECTOR)).toBe(45);
  });

  /**
   * The gate has to be reachable by playing the sectors before it, with room
   * to spare — a threshold a player cannot meet is not difficulty, it is a
   * wall, and the campaign is required to stay completable (CLAUDE.md #4.4).
   */
  it('never asks for more than 60% of the stars actually obtainable by then', () => {
    for (let sector = FIRST_GATED_SECTOR; sector <= 20; sector++) {
      const obtainable = starsAvailableThrough(sector - 1);
      expect(starGateFor(sector), `sector ${sector}`).toBeLessThanOrEqual(obtainable * 0.6);
    }
  });

  it('is met by two-starring the way there, without three-starring anything', () => {
    for (let sector = FIRST_GATED_SECTOR; sector <= 20; sector++) {
      const twoStarringEverything = (sector - 1) * LEVELS_PER_SECTOR * 2;
      expect(isSectorUnlocked(sector, twoStarringEverything), `sector ${sector}`).toBe(true);
    }
  });
});

describe('canPlayLevel', () => {
  const firstOfGated = levelIdFor(FIRST_GATED_SECTOR, 1);
  const lastOfPrevious = levelIdFor(FIRST_GATED_SECTOR - 1, LEVELS_PER_SECTOR);

  it('needs the previous level cleared even with every star in the game', () => {
    expect(canPlayLevel(firstOfGated, cleared(), starsAvailableThrough(20))).toBe(false);
  });

  it('needs the stars even with the previous level cleared', () => {
    expect(canPlayLevel(firstOfGated, cleared(lastOfPrevious), 0)).toBe(false);
  });

  it('opens once both are true', () => {
    expect(canPlayLevel(firstOfGated, cleared(lastOfPrevious), starGateFor(FIRST_GATED_SECTOR))).toBe(true);
  });

  it('never gates a level inside the original campaign on stars', () => {
    const second = levelIdFor(1, 2);
    expect(canPlayLevel(second, cleared(levelIdFor(1, 1)), 0)).toBe(true);
  });
});

describe('the star scale itself', () => {
  it('counts three per level', () => {
    expect(MAX_STARS).toBe(3);
    expect(starsAvailableThrough(1)).toBe(LEVELS_PER_SECTOR * MAX_STARS);
  });

  it('is what `starsFor` can actually award', () => {
    expect(starsFor({ timeMs: 1, deaths: 0, parMs: 10_000 })).toBe(MAX_STARS);
  });
});
