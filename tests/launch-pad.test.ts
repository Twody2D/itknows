import { describe, expect, it } from 'vitest';
import { validateLevel } from '@/gameplay/LevelValidator';
import { parBreakdown } from '@/gameplay/parTime';
import { MAX_JUMP_RISE_PX, MAX_LAUNCH_LIFT_PX, launchReach, launchVelocity } from '@/gameplay/jumpPhysics';
import { PHYSICS } from '@/config/physics';
import { LEVEL_WIDTH_TILES, TILE_SIZE } from '@/config/display';
import type { LevelDef } from '@/gameplay/LevelDef';

/**
 * The sector-06 mechanic: a pad that throws the player higher than any jump
 * reaches. What has to hold is that the solver and the physics agree — a
 * level certified passable BECAUSE of a launch must really be passable, and
 * a level that leans on a launch that may never fire must not be certified
 * at all.
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

/**
 * A ledge far out of jump range (3.47 tiles) but inside what a 9-tile pad
 * really delivers — 8.33 after the frame of gravity the discrete physics step
 * charges (`usableLiftPx`). Eight tiles is deliberately just under that
 * ceiling: it is the shape a real sector-06 level has.
 */
const HIGH_ROW = GROUND_ROW - 8;

describe('launch physics', () => {
  it('gives exactly the velocity that reaches the advertised lift', () => {
    for (const tiles of [4, 6, 9]) {
      const liftPx = tiles * TILE_SIZE;
      const v = launchVelocity(liftPx);
      // Height gained from an initial upward velocity under base gravity.
      const reached = (v * v) / (2 * PHYSICS.gravity);
      expect(reached, `${tiles} tiles`).toBeCloseTo(liftPx, 6);
    }
  });

  it('reaches higher than any jump, which is the entire point', () => {
    expect(launchVelocity(9 * TILE_SIZE)).toBeLessThan(PHYSICS.jumpVelocity);
    expect(9 * TILE_SIZE).toBeGreaterThan(MAX_JUMP_RISE_PX);
  });

  /**
   * `Player` clamps its body to `maxFallSpeed` in both vertical directions,
   * so an impulse past that is trimmed by Arcade without saying so. Measured
   * live before this was handled: a pad advertising 12 tiles lifted 10.1.
   * Both the velocity and the reach clamp to what the body can really do, so
   * the solver can never certify a route on a launch the game will not give.
   */
  it('never promises more lift than the body can carry', () => {
    const askedFor = 20 * TILE_SIZE;
    const v = launchVelocity(askedFor);
    expect(Math.abs(v)).toBeLessThanOrEqual(PHYSICS.maxFallSpeed);
    expect((v * v) / (2 * PHYSICS.gravity)).toBeCloseTo(MAX_LAUNCH_LIFT_PX, 6);
    // And the reach agrees with the velocity rather than with the request.
    expect(launchReach(askedFor, 0)).toBe(launchReach(MAX_LAUNCH_LIFT_PX, 0));
    expect(launchReach(askedFor, MAX_LAUNCH_LIFT_PX + TILE_SIZE)).toBe(0);
  });

  it('covers no horizontal ground for a rise it cannot make', () => {
    expect(launchReach(4 * TILE_SIZE, 5 * TILE_SIZE)).toBe(0);
  });

  it('covers less ground the higher it has to land', () => {
    const lift = 9 * TILE_SIZE;
    expect(launchReach(lift, 0)).toBeGreaterThan(launchReach(lift, 5 * TILE_SIZE));
  });
});

describe('the solver and the launch pad', () => {
  const highExit = {
    exitCol: 20,
    exitRow: HIGH_ROW,
    platforms: [{ col: 19, row: HIGH_ROW, width: 5 }],
  };

  it('refuses a ledge that only a launch could reach when there is no pad', () => {
    expect(validateLevel(level(highExit)).valid).toBe(false);
  });

  it('accepts the same ledge once a looping pad stands under it', () => {
    const def = level({
      ...highExit,
      traps: [{ type: 'launch-pad', id: 'pad-01', col: 19, row: GROUND_ROW, width: 3, liftTiles: 9 }],
    });
    expect(validateLevel(def).valid).toBe(true);
  });

  /**
   * A `loop: false` pad fires once, when something triggers it. Counting on
   * a launch that may never come is exactly the dead end CLAUDE.md #4.3/#4.4
   * forbid, so the pad stays real footing but stops being a way up.
   */
  it('refuses to count a pad that only fires when triggered', () => {
    const def = level({
      ...highExit,
      traps: [
        { type: 'launch-pad', id: 'pad-01', col: 19, row: GROUND_ROW, width: 3, liftTiles: 9, loop: false },
      ],
    });
    expect(validateLevel(def).valid).toBe(false);
  });

  it('treats the pad as solid ground even when it grants no lift', () => {
    // A pit the pad bridges: crossing is only possible if the pad is footing.
    const def = level({
      gaps: [[10, 18]],
      exitCol: 40,
      traps: [
        { type: 'launch-pad', id: 'pad-01', col: 12, row: GROUND_ROW, width: 5, liftTiles: 8, loop: false },
      ],
    });
    expect(validateLevel(def).valid).toBe(true);
  });
});

describe('the target time and the launch pad', () => {
  it('times the launch flight instead of scoring it as instantaneous', () => {
    const def = level({
      exitCol: 20,
      exitRow: HIGH_ROW,
      platforms: [{ col: 19, row: HIGH_ROW, width: 5 }],
      traps: [{ type: 'launch-pad', id: 'pad-01', col: 19, row: GROUND_ROW, width: 3, liftTiles: 9 }],
    });
    const breakdown = parBreakdown(def);
    expect(breakdown).not.toBeNull();
    const { floorMs, hazardMs } = breakdown as NonNullable<typeof breakdown>;
    // A floor that scored the launch as instantaneous would be the walk to
    // the pad and nothing else. The flight is timed from the same function
    // the solver reaches the ledge with, so the expected cost is not a
    // number picked to make the test pass.
    const walkOnlyMs = (Math.abs(19 - 2) * TILE_SIZE * 1000) / PHYSICS.moveSpeed;
    // The ascent alone, from the same gravity the launch uses. The flight is
    // at least this long, so the floor has to clear the walk by at least it.
    const ascentMs = Math.sqrt((2 * 8 * TILE_SIZE) / PHYSICS.gravity) * 1000;
    expect(ascentMs).toBeGreaterThan(400);
    expect(floorMs).toBeGreaterThanOrEqual(walkOnlyMs + ascentMs);
    // And the wait for the pad to come round is charged like any other cycle.
    expect(hazardMs).toBeGreaterThan(0);
  });
});
