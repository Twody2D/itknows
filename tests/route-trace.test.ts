import { describe, expect, it } from 'vitest';
import type { LevelDef } from '@/gameplay/LevelDef';
import { routeBodyBoxes, trapLethalBox, trapsTheRouteNeverMeets } from '@/gameplay/routeTrace';
import { getAllLevels } from '@/gameplay/LevelFactory';

/**
 * THE QUESTION NOTHING IN THIS PROJECT USED TO ASK: can the player ever be
 * where this trap is.
 *
 * `LevelValidator` proves a route EXISTS and says nothing about what the
 * route passes through. `parTime` walks the same route only to add up how
 * long it takes. Every trap test is about placement rules — telegraphed, not
 * over a pit, not on the exit column — and a trap in empty air breaks none of
 * them. So a patrolling spike three tiles from the exit of `TERMINAL` passed
 * 1699 tests and could not touch anybody, and the owner found it by looking
 * at the screen.
 *
 * The case below is that spike, reconstructed exactly.
 */
function terminalLike(spikeRows: [number, number]): LevelDef {
  // The real level, with the spike put back exactly where it was. Building a
  // synthetic stand-in was the first attempt and it was the wrong instinct:
  // the thing under test is whether a trap meets the route of a level that
  // actually ships, so the level under test should be one.
  const real = getAllLevels().find((l) => l.id === 'sector-10-level-06');
  expect(real, 'sector-10-level-06 is gone').toBeTruthy();
  return {
    ...(real as LevelDef),
    id: 'probe',
    traps: [
      ...((real as LevelDef).traps ?? []),
      {
        type: 'moving-spike',
        id: 'mspike-probe',
        fromCol: 34,
        fromRow: spikeRows[0],
        toCol: 34,
        toRow: spikeRows[1],
        travelMs: 1500,
      },
    ],
  };
}

describe('a trap the player can never reach', () => {
  it('catches the spike that shipped, at the rows it shipped with', () => {
    // Rows 11-15 is y=110 upward; the hop off the row-13 step reaches its
    // apex over column 34 with the hurt box ending at y=95. Fifteen pixels.
    expect(trapsTheRouteNeverMeets(terminalLike([11, 15]))).toContain('mspike-probe');
  });

  it('does not cry wolf about the same spike lowered into the arc', () => {
    // Rows 8-12 puts it where the body actually is. This half of the test is
    // the one that matters: a detector that flags everything is a detector
    // nobody reads.
    expect(trapsTheRouteNeverMeets(terminalLike([8, 12]))).not.toContain('mspike-probe');
  });

  it('traces a body that starts and finishes where the level says', () => {
    const boxes = routeBodyBoxes(terminalLike([8, 12]));
    expect(boxes).not.toBeNull();
    const at = (col: number) => (boxes ?? []).filter((b) => b.x < col * 10 + 10 && col * 10 < b.x + b.w);
    expect(at(2).length, 'never stood on the spawn tile').toBeGreaterThan(0);
    expect(at(29).length, 'never reached the exit column').toBeGreaterThan(0);
    // And never below the floor or above the ceiling of the screen.
    for (const b of boxes ?? []) {
      expect(b.y).toBeGreaterThan(-64);
      expect(b.y + b.h).toBeLessThanOrEqual(23 * 10);
    }
  });

  it('says nothing about things that cannot kill', () => {
    // Pads, belts, platforms and decoys are not hazards, and the pursuer goes
    // wherever the player does, so "can it reach them" has one answer.
    expect(trapLethalBox({ type: 'launch-pad', id: 'p', col: 1, row: 22, width: 3, liftTiles: 6 })).toBeNull();
    expect(trapLethalBox({ type: 'conveyor', id: 'c', col: 1, row: 22, width: 3, speed: 60 })).toBeNull();
    expect(trapLethalBox({ type: 'pursuer', id: 'd', col: 1, row: 21, speedFactor: 0.65 })).toBeNull();
    expect(trapLethalBox({ type: 'fake-platform', id: 'f', col: 1, row: 19, width: 3 })).toBeNull();
  });

  it('holds the campaign to a known, shrinking list of unmet traps', () => {
    // Not zero, and that is honest rather than lax: this traces ONE route,
    // and `sector-07-level-02` is deliberately built with two — a fast way
    // under the ceiling spikes and a slow way around them — so the bank on
    // the walk to the slow pad guards a route the solver did not take.
    //
    // The other four predate the detector and are listed rather than fixed,
    // because silently reworking levels the owner has played and approved is
    // not a decision a test should make for him. The list may shrink; it must
    // never grow without somebody saying why.
    const known = new Set([
      'sector-02-level-05',
      'sector-03-level-02',
      'sector-03-level-04',
      'sector-04-level-06',
      'sector-07-level-02',
    ]);
    const surprises: string[] = [];
    for (const level of getAllLevels()) {
      const unmet = trapsTheRouteNeverMeets(level);
      if (unmet.length > 0 && !known.has(level.id)) surprises.push(`${level.id}: ${unmet.join(', ')}`);
    }
    expect(surprises, surprises.join('; ')).toEqual([]);
  });
});
