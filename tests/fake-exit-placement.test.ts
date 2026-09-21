import { describe, expect, it } from 'vitest';
import { TILE_SIZE } from '@/config/display';
import { getAllLevels } from '@/gameplay/LevelFactory';
import { exitRowOf } from '@/gameplay/LevelDef';
import { SECTOR_COUNT, sectorNumberOf } from '@/gameplay/sectors';
import { routeTouches } from '@/gameplay/routeTrace';
import type { LevelDef } from '@/gameplay/LevelDef';

/**
 * CLAUDE.md #4.7, WHICH NOTHING CHECKED.
 *
 * The fake exit carries four rules, all of them arrived at by the owner
 * rejecting something: at most one per sector, never lethal, visually
 * indistinguishable from the real door, and — the one that cost a whole
 * round — off the mandatory route. On MIRROR it stood at column 27, across
 * the only ground corridor, so every path to the real exit went through its
 * catch zone: «портал невозможно обойти». A trap that cannot be declined is
 * not a question, it is a toll booth, and since the door became unreadable
 * by the owner's own decision, an unavoidable one is dishonest outright.
 *
 * That was fixed by hand and then guarded by nothing. The counting rule had
 * no test either. This is that test — the rules restated where a future
 * placement has to pass them.
 */

/** The door's catch area: a 2x3-tile rectangle standing on the surface line, same as the real one. */
function fakeExitZone(trap: { col: number; row: number }): { x: number; y: number; w: number; h: number } {
  const centreX = trap.col * TILE_SIZE + TILE_SIZE;
  const surfaceY = trap.row * TILE_SIZE;
  return { x: centreX - TILE_SIZE, y: surfaceY - TILE_SIZE * 3, w: TILE_SIZE * 2, h: TILE_SIZE * 3 };
}

function fakeExitsOf(def: LevelDef): Array<{ col: number; row: number; id: string }> {
  return (def.traps ?? []).filter((t): t is Extract<typeof t, { type: 'fake-exit' }> => t.type === 'fake-exit');
}

describe('the fake exit stays a question', () => {
  const levels = getAllLevels();

  it('puts at most one in a sector', () => {
    const perSector = new Map<number, string[]>();
    for (const def of levels) {
      for (const trap of fakeExitsOf(def)) {
        const sector = sectorNumberOf(def.id);
        perSector.set(sector, [...(perSector.get(sector) ?? []), `${def.id}/${trap.id}`]);
      }
    }
    const over = [...perSector.entries()].filter(([, ids]) => ids.length > 1);
    expect(over.map(([s, ids]) => `sector ${s}: ${ids.join(', ')}`), 'more than one decoy in a sector').toEqual([]);
    // And it is a thing the campaign actually uses — an empty set would make
    // every assertion here vacuous.
    expect([...perSector.keys()].length).toBeGreaterThan(0);
    expect([...perSector.keys()].every((s) => s >= 1 && s <= SECTOR_COUNT)).toBe(true);
  });

  it('never stands where the proved route has to walk', () => {
    // The route the solver proves is the route the player is FORCED along.
    // If the body ever occupies the decoy's catch zone on it, the decoy
    // cannot be declined — which is the MIRROR defect exactly.
    const forced: string[] = [];
    for (const def of levels) {
      for (const trap of fakeExitsOf(def)) {
        if (routeTouches(def, fakeExitZone(trap))) forced.push(`${def.id}/${trap.id}`);
      }
    }
    expect(forced, forced.join('; ')).toEqual([]);
  });

  it('never shares its ground with the real door', () => {
    // Two doors on the same tiles is not a decoy, it is a coin flip, and the
    // real exit's own catch zone would fire first anyway.
    const clashes: string[] = [];
    for (const def of levels) {
      const realCols = [def.exitCol, def.exitCol + 1];
      for (const trap of fakeExitsOf(def)) {
        const decoyCols = [trap.col, trap.col + 1];
        const sameRow = trap.row === exitRowOf(def);
        if (sameRow && decoyCols.some((c) => realCols.includes(c))) clashes.push(`${def.id}/${trap.id}`);
      }
    }
    expect(clashes, clashes.join('; ')).toEqual([]);
  });

  it('stands on real ground, not over a pit', () => {
    // It returns the player to the spawn rather than killing them
    // (CLAUDE.md #4.7), so it has to be somewhere they can walk up to and
    // decide about — a decoy over a hole is only ever met by falling.
    const floating: string[] = [];
    for (const def of levels) {
      for (const trap of fakeExitsOf(def)) {
        const onGround = trap.row === def.groundRow;
        const inGap = def.gaps.some(([from, to]) => trap.col >= from && trap.col <= to + 1);
        const onPlatform = def.platforms.some(
          (p) => p.row === trap.row && trap.col >= p.col && trap.col + 1 < p.col + p.width,
        );
        if (!((onGround && !inGap) || onPlatform)) floating.push(`${def.id}/${trap.id} at ${trap.col},${trap.row}`);
      }
    }
    expect(floating, floating.join('; ')).toEqual([]);
  });
});
