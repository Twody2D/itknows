import { describe, expect, it } from 'vitest';
import { APPROACH_BAND_TILES, dropSpike, widenForPlatforms } from '@/data/levels/ambush';
import type { LevelDef } from '@/gameplay/LevelDef';

type Trigger = Extract<NonNullable<LevelDef['traps']>[number], { type: 'trigger' }>;

/**
 * `widenForPlatforms` exists because `approach()` cannot know, at the point
 * it builds one trigger, whether some OTHER part of the level places a
 * platform close enough to let a jump launched from it pass over that
 * trigger above its band. That was a real bug on PATROL — see the function's
 * own doc comment in `ambush.ts` for the full story — and this is the
 * regression test for the exact numbers involved, not a re-derivation of
 * the geometry by eye.
 */
describe('widenForPlatforms', () => {
  it('leaves a trigger alone when no platform reaches over its columns', () => {
    const [, trigger] = dropSpike('d', 20, 21, 22) as [unknown, Trigger];
    const widened = widenForPlatforms(trigger, [{ col: 0, row: 19, width: 3 }]);
    expect(widened).toBe(trigger);
  });

  it('reproduces PATROL: a ledge at row 19 raises dspike-01-trigger to row 14', () => {
    // The exact call site from sector-01-level-03 ('PATROL'): the ledge is
    // `{ col: 26, row: 19, width: 5 }`, and dspike-01's hazard is at column
    // 34, giving a trigger at columns 31-33 with an un-widened band starting
    // at row 22 - APPROACH_BAND_TILES.
    const [, trigger] = dropSpike('dspike-01', 34, 21, 22) as [unknown, Trigger];
    expect(trigger.row).toBe(22 - APPROACH_BAND_TILES);

    const widened = widenForPlatforms(trigger, [{ col: 26, row: 19, width: 5 }]);

    // A jump off the ledge (row 19) peaks at row 19 - APPROACH_BAND_TILES —
    // three rows higher than a jump off the ground this trigger was
    // originally sized for.
    expect(widened.row).toBe(19 - APPROACH_BAND_TILES);
    // The bottom edge (row + height) never moves — only the ceiling rises.
    expect(widened.row + widened.height).toBe(trigger.row + trigger.height);
  });

  it('never shrinks a band that is already tall enough', () => {
    const [, trigger] = dropSpike('d', 20, 21, 22) as [unknown, Trigger];
    // A platform far below the trigger's own band cannot raise it further.
    const widened = widenForPlatforms(trigger, [{ col: 15, row: 22, width: 2 }]);
    expect(widened.row).toBe(trigger.row);
  });

  it('only widens for a platform whose jump reach actually overlaps the trigger columns', () => {
    const [, trigger] = dropSpike('d', 20, 21, 22) as [unknown, Trigger];
    // A platform far enough away that no full-held jump off it could reach
    // this trigger's columns at all.
    const widened = widenForPlatforms(trigger, [{ col: 0, row: 5, width: 2 }]);
    expect(widened.row).toBe(trigger.row);
  });
});
