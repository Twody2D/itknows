import { describe, expect, it } from 'vitest';
import { blockHeightPx, linesThatFit } from '@/ui/textBlock';

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
    // Box top 158, height 96, star row pinned 22 from the bottom, the label
    // above wrapped to two lines: 30 px of room for the "not cleared yet"
    // text. Three lines at 9px need 35 — that is the overlap that shipped.
    const room = 158 + 96 - 22 - 6 - 196;
    expect(room).toBe(30);
    expect(linesThatFit(room, 9)).toBe(2);
    expect(blockHeightPx(3, 9)).toBeGreaterThan(room);
  });

  it('degrades to one line rather than to none', () => {
    expect(linesThatFit(0, 9)).toBe(1);
    expect(linesThatFit(-40, 9)).toBe(1);
    expect(linesThatFit(30, 0)).toBe(1);
  });
});
