import { describe, expect, it } from 'vitest';
import { TILE_SIZE } from '@/config/display';
import { getAllLevels } from '@/gameplay/LevelFactory';
import { SPIKE_INK_LEAD, SPIKE_PEEK_PX, spikeBankPeekY } from '@/gameplay/spikeBankPeek';
import type { LevelDef } from '@/gameplay/LevelDef';

/**
 * A TELEGRAPH THE PLAYER CANNOT SEE IS NOT A TELEGRAPH (CLAUDE.md #4.2).
 *
 * The spike bank was repaired on 2026-09-19 so that it holds still while it
 * warns and kills for every millisecond it moves. What that repair did not
 * ask is where "still" is. A floor bank rests at `hiddenRow: groundRow + 1`,
 * so its resting position is a row UNDER the floor the player walks on: the
 * whole 400 ms warning happened twelve pixels below the surface, the surface
 * never changed, and the first thing to cross it was the lethal punch. The
 * class comment claimed "four pixels of tips over the floor line" and the
 * phase test asserted `|y - hidden| <= 5`, which is the same four pixels
 * measured from the wrong place — both agreed with each other and neither
 * agreed with the screen.
 *
 * So this measures against the screen: where the drawn tips end up, against
 * the surface line the player is standing on.
 */

/** Top of the ink a spike tile draws, relative to the sprite's centre — `drawSpikeTile` fills rows 2..10 of the frame. */
function inkLeadingEdge(centreY: number, dir: number): number {
  return centreY + dir * SPIKE_INK_LEAD;
}

function isSolid(def: LevelDef, col: number, row: number): boolean {
  if (row === def.groundRow && !def.gaps.some(([from, to]) => col >= from && col <= to)) return true;
  return def.platforms.some((p) => p.row === row && col >= p.col && col < p.col + p.width);
}

describe('spike bank: the warning happens where it can be seen', () => {
  const levels = getAllLevels();

  it('has banks to check at all', () => {
    const banks = levels.flatMap((l) => (l.traps ?? []).filter((t) => t.type === 'spike-bank'));
    expect(banks.length).toBeGreaterThan(20);
  });

  it('breaks the surface with its tips whenever it rests behind one', () => {
    const buried: string[] = [];
    const offenders: string[] = [];

    for (const def of levels) {
      for (const trap of def.traps ?? []) {
        if (trap.type !== 'spike-bank') continue;
        const dir = Math.sign(trap.lethalRow - trap.hiddenRow);
        const surfaceRow = trap.hiddenRow + dir;
        for (let i = 0; i < trap.width; i++) {
          const col = trap.col + i;
          if (!isSolid(def, col, surfaceRow)) continue;
          buried.push(`${def.id}/${trap.id}@${col}`);
          const peek = spikeBankPeekY(col, trap.hiddenRow, trap.lethalRow, def.groundRow, def.gaps, def.platforms);
          const plane = dir < 0 ? surfaceRow * TILE_SIZE : (surfaceRow + 1) * TILE_SIZE;
          const clearance = dir * (inkLeadingEdge(peek, dir) - plane);
          if (clearance < SPIKE_PEEK_PX) {
            offenders.push(`${def.id}/${trap.id}@${col}: ${clearance}px of tips past the surface at y=${plane}`);
          }
        }
      }
    }

    // The campaign's floor banks are the case this is about — if none were
    // found the test is measuring nothing and would pass on an empty set.
    expect(buried.length).toBeGreaterThan(20);
    expect(offenders, offenders.join('; ')).toEqual([]);
  });

  it('never reaches the striking position while it is still warning', () => {
    const offenders: string[] = [];
    for (const def of levels) {
      for (const trap of def.traps ?? []) {
        if (trap.type !== 'spike-bank') continue;
        const dir = Math.sign(trap.lethalRow - trap.hiddenRow);
        const lethalY = trap.lethalRow * TILE_SIZE + TILE_SIZE / 2;
        for (let i = 0; i < trap.width; i++) {
          const col = trap.col + i;
          const peek = spikeBankPeekY(col, trap.hiddenRow, trap.lethalRow, def.groundRow, def.gaps, def.platforms);
          if (dir * (lethalY - peek) < 0) offenders.push(`${def.id}/${trap.id}@${col}: peek ${peek} is past lethal ${lethalY}`);
        }
      }
    }
    expect(offenders, offenders.join('; ')).toEqual([]);
  });

  it('leaves a bank that rests in open air exactly where it rests', () => {
    // Nothing solid between the two rows, so the sprite appearing IS the
    // signal — the same shape the drop spike was repaired into.
    const peek = spikeBankPeekY(10, 8, 12, 22, [], []);
    expect(peek).toBe(8 * TILE_SIZE + TILE_SIZE / 2);
  });

  it('puts a floor bank four pixels of tips above the floor line', () => {
    // The worked example from the class comment, now actually true:
    // `hiddenRow: 23` / `lethalRow: 21` against a `groundRow` of 22.
    const peek = spikeBankPeekY(10, 23, 21, 22, [], []);
    expect(inkLeadingEdge(peek, -1)).toBe(22 * TILE_SIZE - SPIKE_PEEK_PX);
  });
});
