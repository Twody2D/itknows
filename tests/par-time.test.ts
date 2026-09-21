import { describe, expect, it } from 'vitest';
import { getAllLevels } from '@/gameplay/LevelFactory';
import { parBreakdown, parFloorMs, parTimeMs, thirdStarTimeMs } from '@/gameplay/parTime';
import { trapsTheRouteNeverMeets } from '@/gameplay/routeTrace';
import { validateLevel } from '@/gameplay/LevelValidator';

/**
 * The third star is measured against a target time, and the target is derived
 * from the level's own geometry rather than typed in by hand for each level
 * (`gameplay/parTime.ts` explains why). What has to hold is narrow but
 * absolute: the target must be something a player can physically reach. A
 * target below the floor would make a star unobtainable on a level that is
 * otherwise perfectly fine, and nothing on screen would say so.
 */
const levels = getAllLevels();

describe('derived target times', () => {
  it.each(levels.map((def) => [def.id, def] as const))('%s has a target above its physical floor', (_id, def) => {
    const target = parTimeMs(def);
    const floor = parFloorMs(def);
    expect(target).not.toBeNull();
    expect(floor).not.toBeNull();
    expect(target as number).toBeGreaterThan(floor as number);
  });

  it('derives a target for every level the solver can complete', () => {
    for (const def of levels) {
      if (!validateLevel(def).valid) continue;
      expect(parTimeMs(def), def.id).not.toBeNull();
    }
  });

  /**
   * A level whose target sits barely above the floor is a level where three
   * stars demand frame-accurate input. The slack in `parTime.ts` is there to
   * prevent that, so it is worth asserting it actually arrives.
   */
  it('leaves real room above the floor, not a rounding margin', () => {
    for (const def of levels) {
      const breakdown = parBreakdown(def);
      expect(breakdown, def.id).not.toBeNull();
      const { floorMs, parMs } = breakdown as NonNullable<typeof breakdown>;
      expect(parMs / floorMs, `${def.id} is too tight`).toBeGreaterThanOrEqual(1.5);
    }
  });

  /**
   * THE TOP RUNG HAS TO BE REACHABLE TOO (CLAUDE.md #4.8). The third star
   * became a pure time target on 2026-09-21, and a time target is only a
   * difficulty while it is above what the level physically costs. That cost
   * is not the floor alone: `hazardMs` is time the level MAKES the player
   * stand still, because a piston's cycle does not run faster for a good
   * player, so floor-plus-hazard is the real bottom.
   *
   * This is also why `THIRD_STAR_SLACK_FRACTION` takes its 30% off the slack
   * rather than off the whole target. On MACHINE `parMs × 0.7` is 8726 ms
   * against a floor-plus-hazard of 8373 ms — 353 ms in hand, which is not a
   * hard target but an impossible one. This test fails on that arithmetic
   * and passes on the one the game uses.
   */
  it('keeps the third star above what the level physically costs', () => {
    for (const def of levels) {
      const breakdown = parBreakdown(def);
      expect(breakdown, def.id).not.toBeNull();
      const { floorMs, hazardMs, thirdStarMs } = breakdown as NonNullable<typeof breakdown>;
      const unavoidableMs = floorMs + hazardMs;
      expect(thirdStarMs / unavoidableMs, `${def.id}: third star is not reachable`).toBeGreaterThanOrEqual(1.25);
    }
  });

  it('puts the two rungs in order, on every level', () => {
    for (const def of levels) {
      const { parMs, thirdStarMs } = parBreakdown(def) as NonNullable<ReturnType<typeof parBreakdown>>;
      expect(thirdStarMs, `${def.id}`).toBeLessThan(parMs);
      expect(thirdStarTimeMs(def), `${def.id}`).toBe(thirdStarMs);
    }
  });

  /**
   * The hazard allowance pays for waiting the level imposes — so it must not
   * pay for a trap the player can never be held up by. It used to: the
   * filter compared the trap's columns against the route's column span,
   * which is the whole board on 44 of the 60 levels, so nothing was ever
   * excluded. On PISTON ROW that was 1.7 s of a 14.2 s target bought by two
   * pistons the proved route passes 8 px underneath — deleting them would
   * have made the level harder to three-star.
   */
  it('never pays waiting time for a trap the route cannot reach', () => {
    for (const def of levels) {
      const unreachable = new Set(trapsTheRouteNeverMeets(def));
      if (unreachable.size === 0) continue;
      const withoutThem = { ...def, traps: (def.traps ?? []).filter((t) => !unreachable.has(t.id)) };
      expect(parBreakdown(def)?.hazardMs, `${def.id}`).toBe(parBreakdown(withoutThem)?.hazardMs);
    }
  });

  /** A hand-set `starTimeMs` bypasses the derivation entirely, so it gets checked the same way. */
  it('honours a hand-set target, and only above the floor', () => {
    const def = levels[0] as (typeof levels)[number];
    const floor = parFloorMs(def) as number;
    expect(parTimeMs({ ...def, starTimeMs: floor + 1234 })).toBe(floor + 1234);
    for (const level of levels) {
      if (level.starTimeMs === undefined) continue;
      expect(level.starTimeMs, `${level.id}: hand-set target below the floor`).toBeGreaterThan(
        parFloorMs(level) as number,
      );
    }
  });

  /** The floor is a claim about physics; a level that is one screen wide cannot honestly take a minute of it. */
  it('keeps every floor inside the range a one-screen level can occupy', () => {
    for (const def of levels) {
      const floor = parFloorMs(def) as number;
      expect(floor, `${def.id} floor`).toBeGreaterThan(1000);
      expect(floor, `${def.id} floor`).toBeLessThan(20_000);
    }
  });
});
