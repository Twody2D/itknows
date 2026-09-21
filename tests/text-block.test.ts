import { describe, expect, it } from 'vitest';
import { blockHeightPx, linesThatFit } from '@/ui/textBlock';
import { statsStarRowY, statsValueRoomPx, statsValueY, sysCommentRoomPx } from '@/ui/levelMapLayout';

/**
 * The invariant these guard is the one the level map broke: a text block
 * clamped to a hand-picked line count printed through the row pinned below
 * it. The rule is that the clamp is DERIVED from the room, and that what it
 * derives actually fits.
 */
describe('linesThatFit', () => {
  it('never claims more room than there is', () => {
    for (let room = 1; room <= 120; room++) {
      for (const size of [7, 8, 9, 10, 11]) {
        const lines = linesThatFit(room, size);
        // One line is the floor — a box too small for it is a layout bug the
        // caller must see, not a reason to draw nothing.
        if (lines > 1) expect(blockHeightPx(lines, size)).toBeLessThanOrEqual(room);
      }
    }
  });

  it('takes every line the room actually affords', () => {
    for (let room = 1; room <= 120; room++) {
      for (const size of [7, 8, 9, 10, 11]) {
        const lines = linesThatFit(room, size);
        expect(blockHeightPx(lines + 1, size)).toBeGreaterThan(room);
      }
    }
  });

  it('holds for the level map stats box, which is where this broke', () => {
    // FROM THE LAYOUT, NOT FROM LITERALS. This case used to open with
    // `const room = 158 + 96 - 22 - 6 - 196; expect(room).toBe(30)` — five
    // numbers hand-copied out of `LevelSelectScene`, which is arithmetic
    // that cannot fail, and the scene could have been reverted to the
    // shipped bug with the whole suite still green. `ui/levelMapLayout.ts`
    // exists so this reads the same geometry the scene draws from.
    //
    // The case itself: the "best time" caption wrapped to two lines (24 px),
    // and three lines of 9 px type underneath need 35 px of the room that
    // leaves. That is the overlap that shipped — «ЦЕЛИКОМ» printed straight
    // through «ЗВЁЗДЫ СЕКТОРА».
    const room = statsValueRoomPx(24);
    expect(room).toBe(30);
    expect(linesThatFit(room, 9)).toBe(2);
    expect(blockHeightPx(3, 9)).toBeGreaterThan(room);
    // And the same claim for the panel above it, which carries the sector
    // premise and broke the same way one round later.
    expect(linesThatFit(sysCommentRoomPx(), 10)).toBeGreaterThanOrEqual(1);
    expect(blockHeightPx(linesThatFit(sysCommentRoomPx(), 10), 10)).toBeLessThanOrEqual(sysCommentRoomPx());
  });

  it('keeps the stats box honest as its caption grows', () => {
    // The defect was a fixed offset under a caption whose height is not
    // fixed. One line of caption or three, the value still has to end above
    // the star row — and when it cannot, the room has to come out negative
    // rather than quietly overlapping, so `linesThatFit` falls back to one.
    for (const labelHeight of [10, 17, 24, 31, 44]) {
      const room = statsValueRoomPx(labelHeight);
      expect(statsValueY(labelHeight) + Math.max(room, 0)).toBeLessThanOrEqual(statsStarRowY());
      expect(linesThatFit(room, 9)).toBeGreaterThanOrEqual(1);
    }
  });

  it('degrades to one line rather than to none', () => {
    expect(linesThatFit(0, 9)).toBe(1);
    expect(linesThatFit(-40, 9)).toBe(1);
    expect(linesThatFit(30, 0)).toBe(1);
  });
});
