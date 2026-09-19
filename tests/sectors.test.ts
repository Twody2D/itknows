import { describe, expect, it } from 'vitest';
import { LEVELS_PER_SECTOR, SECTOR_COUNT, levelIdFor, sectorIdOf, sectorName } from '@/gameplay/sectors';
import { getAllLevels } from '@/gameplay/LevelFactory';

describe('sectorIdOf', () => {
  it('derives a zero-padded sector-XX id from a level id', () => {
    expect(sectorIdOf('sector-01-level-01')).toBe('sector-01');
    expect(sectorIdOf('sector-01-level-06')).toBe('sector-01');
    expect(sectorIdOf('sector-05-level-03')).toBe('sector-05');
  });
});

/**
 * `SECTOR_COUNT` is not a description of the campaign, it is a number several
 * screens compute from: the level map's paging, the shop's
 * `campaign_complete` condition, the `reference` skin's star price. Adding a
 * sector's levels without bumping it leaves the sector unreachable from the
 * map while everything else quietly keeps counting the old campaign.
 */
describe('the campaign and the constants that describe it', () => {
  it('has exactly SECTOR_COUNT sectors of LEVELS_PER_SECTOR levels each, all registered', () => {
    expect(getAllLevels().length).toBe(SECTOR_COUNT * LEVELS_PER_SECTOR);
    for (let sector = 1; sector <= SECTOR_COUNT; sector++) {
      for (let level = 1; level <= LEVELS_PER_SECTOR; level++) {
        const id = levelIdFor(sector, level);
        expect(getAllLevels().some((lvl) => lvl.id === id), `missing level ${id}`).toBe(true);
      }
    }
  });

  it('gives every sector a name of its own rather than the numeric fallback', () => {
    for (let sector = 1; sector <= SECTOR_COUNT; sector++) {
      expect(sectorName(sector), `sector ${sector} has no callsign`).not.toBe(`SECTOR ${sector}`);
    }
  });
});
