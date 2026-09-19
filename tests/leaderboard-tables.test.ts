import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { leaderboardNameFor, sectorLeaderboardNameFor } from '@/services/LeaderboardService';
import { getAllLevels } from '@/gameplay/LevelFactory';
import { SECTOR_COUNT, levelIdFor, sectorIdOf } from '@/gameplay/sectors';

/**
 * `docs/leaderboards.md` is the sheet the seventy Yandex tables are actually
 * created from, by hand, in the developer console — the one release task no
 * code can do, because the SDK only writes into a table that already exists.
 *
 * WHY IT IS TESTED RATHER THAN TRUSTED. A missing or misspelled table is not
 * a visible failure: `YandexGamesService` degrades to "leaderboard
 * unavailable", which is the same thing the game shows when the SDK is
 * absent. So a list that has drifted from the code produces a release where
 * some levels quietly have no leaderboard and nothing anywhere says so. Sixty
 * of these names contain a level id; renaming or reordering one level is all
 * it takes.
 */
const DOC = readFileSync(new URL('../docs/leaderboards.md', import.meta.url), 'utf8');

/** Every table name the doc's copy-paste block lists, in order. */
function documentedNames(): string[] {
  const block = DOC.split('```')[1];
  expect(block, 'docs/leaderboards.md has no copy-paste block').toBeTruthy();
  return (block ?? '')
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
}

/** Every table name the game will ever ask the SDK for. */
function requiredNames(): string[] {
  const levels = getAllLevels().map((l) => leaderboardNameFor(l.id));
  const sectors: string[] = [];
  for (let n = 1; n <= SECTOR_COUNT; n++) sectors.push(sectorLeaderboardNameFor(sectorIdOf(levelIdFor(n, 1))));
  return [...levels, ...sectors];
}

describe('the leaderboard sheet matches what the game will ask for', () => {
  it('lists exactly the tables the game uses, and no others', () => {
    const doc = documentedNames();
    const need = requiredNames();
    const missing = need.filter((n) => !doc.includes(n));
    const extra = doc.filter((n) => !need.includes(n));
    expect(missing, `not in docs/leaderboards.md: ${missing.join(', ')}`).toEqual([]);
    expect(extra, `listed but never used: ${extra.join(', ')}`).toEqual([]);
  });

  it('is one table per level plus one per sector', () => {
    const doc = documentedNames();
    expect(doc.length).toBe(getAllLevels().length + SECTOR_COUNT);
    expect(new Set(doc).size).toBe(doc.length);
  });

  it('states the sort order, because ascending is the whole point', () => {
    // These are times. A table created descending silently ranks the worst
    // run first, and nothing in the client can detect that — the score goes
    // in, a number comes back, and the order is simply wrong.
    expect(DOC).toMatch(/возрастан/i);
  });
});
