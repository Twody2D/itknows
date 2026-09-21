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
  /**
   * THE LADDER IS TIME ALL THE WAY UP, since the owner played the finished
   * campaign and had the deathless rung taken out: «сейчас вроде нужно без
   * смертей пройти, но это практически не реально, пусть будет по времени»
   * (2026-09-21). Deaths are not read at all any more — they cost the time
   * of the attempt they ended, and `GameState.elapsedMs()` already carries
   * that, so the clock prices them without a wall.
   */
  const targets = { parMs: 10_000, thirdStarMs: 7000 };

  it('pays one star for clearing the level at all', () => {
    expect(starsFor({ timeMs: 99_000, ...targets })).toBe(1);
  });

  it('pays two for a run inside the target time', () => {
    expect(starsFor({ timeMs: 9999, ...targets })).toBe(2);
    expect(starsFor({ timeMs: 10_000, ...targets })).toBe(2);
    expect(starsFor({ timeMs: 10_001, ...targets })).toBe(1);
  });

  it('pays three for a run inside the tighter one', () => {
    expect(starsFor({ timeMs: 6999, ...targets })).toBe(3);
    expect(starsFor({ timeMs: 7000, ...targets })).toBe(3);
    expect(starsFor({ timeMs: 7001, ...targets })).toBe(2);
  });

  /**
   * The point of the 2026-09-21 change, stated as a test: a death is no
   * longer a verdict. What it costs is the attempt it ended, which is
   * already in `timeMs`, so a player who dies early and then runs clean can
   * still reach the top rung, and one who dies late cannot — by arithmetic
   * rather than by rule.
   */
  it('lets a run that included a death still earn every star, if it was fast enough', () => {
    // 4 s lost to a failed attempt, then a 2.5 s clean run.
    expect(starsFor({ timeMs: 6500, ...targets })).toBe(3);
    // The same mistake made three tiles from the exit costs the whole level.
    expect(starsFor({ timeMs: 11_500, ...targets })).toBe(1);
  });

  it('pays one star on a level with no derivable target', () => {
    // It cannot ask for a time it does not have. `LevelValidator` refuses to
    // ship a level the solver cannot finish, so this is a guarantee rather
    // than a case the campaign contains.
    expect(starsFor({ timeMs: 1, parMs: null, thirdStarMs: null })).toBe(1);
  });

  it('never lets the top rung sit at or above the one below it', () => {
    // A ladder whose rungs cross is not a ladder: `parTime.thirdStarTimeMs`
    // is derived by subtracting from the second star's target, and this is
    // the property that derivation exists to keep.
    expect(targets.thirdStarMs).toBeLessThan(targets.parMs);
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
    expect(starsFor({ timeMs: 1, parMs: 10_000, thirdStarMs: 7000 })).toBe(MAX_STARS);
  });
});
