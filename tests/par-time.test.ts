import { describe, expect, it } from 'vitest';
import { getAllLevels } from '@/gameplay/LevelFactory';
import { parBreakdown, parFloorMs, parTimeMs } from '@/gameplay/parTime';
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
