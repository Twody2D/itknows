import { describe, expect, it } from 'vitest';
import { getAllLevels } from '@/gameplay/LevelFactory';
import { validateLevel } from '@/gameplay/LevelValidator';
import { parBreakdown } from '@/gameplay/parTime';
import { MAX_CONVEYOR_SPEED, isHonestConveyorSpeed } from '@/gameplay/conveyor';
import { PHYSICS } from '@/config/physics';
import { LEVEL_WIDTH_TILES, TILE_SIZE } from '@/config/display';
import type { LevelDef } from '@/gameplay/LevelDef';

/**
 * The sector-08 mechanic: a floor that moves.
 *
 * Two things have to hold, and they pull in opposite directions. The belt has
 * to matter — a floor that pulls slower than the player notices is just a
 * texture — and it must never be able to win, because `LevelValidator` counts
 * a conveyor as ordinary footing and a strip nobody can walk against is a
 * wall the solver cannot see.
 */

const GROUND_ROW = 22;

function level(overrides: Partial<LevelDef>): LevelDef {
  return {
    id: 'test-level',
    name: 'TEST',
    width: LEVEL_WIDTH_TILES,
    groundRow: GROUND_ROW,
    gaps: [],
    spikeColumns: [],
    platforms: [],
    playerStartCol: 2,
    exitCol: 40,
    ...overrides,
  };
}

describe('conveyor speed is capped below the player', () => {
  it('caps below the player’s own walking speed', () => {
    expect(MAX_CONVEYOR_SPEED).toBeLessThan(PHYSICS.moveSpeed);
    // Upstream progress must be worth making, not merely non-zero: at the
    // cap the player still covers better than a third of their normal pace.
    expect(PHYSICS.moveSpeed - MAX_CONVEYOR_SPEED).toBeGreaterThan(PHYSICS.moveSpeed / 3);
  });

  it('rejects a belt that is too fast, too slow, or standing still', () => {
    expect(isHonestConveyorSpeed(0)).toBe(false);
    expect(isHonestConveyorSpeed(MAX_CONVEYOR_SPEED + 1)).toBe(false);
    expect(isHonestConveyorSpeed(-(MAX_CONVEYOR_SPEED + 1))).toBe(false);
    expect(isHonestConveyorSpeed(MAX_CONVEYOR_SPEED)).toBe(true);
    expect(isHonestConveyorSpeed(-45)).toBe(true);
  });

  it('holds every belt in the campaign to that cap', () => {
    const offenders: string[] = [];
    for (const def of getAllLevels()) {
      for (const trap of def.traps ?? []) {
        if (trap.type !== 'conveyor') continue;
        if (!isHonestConveyorSpeed(trap.speed)) offenders.push(`${def.id}/${trap.id}: ${trap.speed}`);
      }
    }
    expect(offenders, offenders.join('; ')).toEqual([]);
  });
});

describe('a conveyor is footing, and the solver treats it as such', () => {
  it('lets a belt carry the only surface on its tier', () => {
    // No platform at row 19 at all — the belt IS the tier, the way SORTED
    // builds it.
    const def = level({
      exitCol: 20,
      exitRow: 19,
      traps: [{ type: 'conveyor', id: 'belt', col: 18, row: 19, width: 6, speed: 40 }],
    });
    expect(validateLevel(def).valid).toBe(true);
  });

  it('does not let the pull stand in for reach', () => {
    // Four tiles up is past a jump (3.47) whichever way the floor is moving:
    // the belt only ever moves a player who is on the ground, so take-off
    // speed is the player's own and nothing about the arc changes.
    const def = level({
      exitCol: 20,
      exitRow: 18,
      traps: [{ type: 'conveyor', id: 'belt', col: 18, row: 18, width: 6, speed: MAX_CONVEYOR_SPEED }],
    });
    expect(validateLevel(def).valid).toBe(false);
  });
});

describe('the target time knows which way the floor is running', () => {
  const beltAt = (speed: number): LevelDef =>
    level({
      playerStartCol: 2,
      exitCol: 40,
      traps: [{ type: 'conveyor', id: 'belt', col: 10, row: GROUND_ROW, width: 20, speed }],
    });

  it('charges more for walking upstream than downstream', () => {
    const upstream = parBreakdown(beltAt(-MAX_CONVEYOR_SPEED));
    const downstream = parBreakdown(beltAt(MAX_CONVEYOR_SPEED));
    expect(upstream).not.toBeNull();
    expect(downstream).not.toBeNull();
    expect((upstream as { floorMs: number }).floorMs).toBeGreaterThan((downstream as { floorMs: number }).floorMs);
  });

  it('puts the upstream floor where the physics puts it', () => {
    // Twenty tiles against the cap, at 110 - 60 = 50 px/s, is 4.0s for that
    // stretch alone — against 1.8s on flat ground. A target derived from the
    // flat number would be a third star nobody could earn (CLAUDE.md #4.8).
    const flat = parBreakdown(level({ playerStartCol: 2, exitCol: 40 })) as { floorMs: number };
    const upstream = parBreakdown(beltAt(-MAX_CONVEYOR_SPEED)) as { floorMs: number };
    const expectedExtraMs = (20 * TILE_SIZE) / (PHYSICS.moveSpeed - MAX_CONVEYOR_SPEED) * 1000 - (20 * TILE_SIZE) / PHYSICS.moveSpeed * 1000;
    expect(upstream.floorMs - flat.floorMs).toBeGreaterThan(expectedExtraMs * 0.9);
  });
});
