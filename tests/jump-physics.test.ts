import { describe, expect, it } from 'vitest';
import { MAX_JUMP_RISE_PX, REACH_AT_APEX_PX, REACH_AT_SAME_HEIGHT_PX, maxHorizontalReach } from '@/gameplay/jumpPhysics';

describe('jumpPhysics', () => {
  it('computes a same-height reach in the range every sector-01 gap was hand-tuned against', () => {
    // Sector 01 gaps are 20-30px wide with generous margin against this figure.
    expect(REACH_AT_SAME_HEIGHT_PX).toBeGreaterThan(45);
    expect(REACH_AT_SAME_HEIGHT_PX).toBeLessThan(70);
  });

  it('computes a max rise in the range the sector-01 platform steps were tuned against', () => {
    // Platform steps use a 20px rise with margin under this figure.
    expect(MAX_JUMP_RISE_PX).toBeGreaterThan(25);
    expect(MAX_JUMP_RISE_PX).toBeLessThan(40);
  });

  it('returns the same-height reach for a target at or below the start', () => {
    expect(maxHorizontalReach(0)).toBeCloseTo(REACH_AT_SAME_HEIGHT_PX, 3);
    expect(maxHorizontalReach(-50)).toBeCloseTo(REACH_AT_SAME_HEIGHT_PX, 3);
  });

  it('returns zero reach for a target above the maximum jump rise', () => {
    expect(maxHorizontalReach(MAX_JUMP_RISE_PX + 1)).toBe(0);
  });

  it('decreases monotonically as the target gets higher (less total air time before landing)', () => {
    const low = maxHorizontalReach(5);
    const mid = maxHorizontalReach(15);
    const high = maxHorizontalReach(MAX_JUMP_RISE_PX - 1);
    expect(low).toBeGreaterThan(mid);
    expect(mid).toBeGreaterThan(high);
    expect(high).toBeGreaterThanOrEqual(0);
  });

  it('reaches REACH_AT_APEX_PX — not zero — right at the apex height', () => {
    // Platforms are one-way (landed on while descending, past the apex —
    // see GameplayScene.isLandingOnPlatform), so even a target exactly at
    // the peak height still costs the full ascent's horizontal travel.
    expect(maxHorizontalReach(MAX_JUMP_RISE_PX)).toBeCloseTo(REACH_AT_APEX_PX, 3);
    expect(REACH_AT_APEX_PX).toBeGreaterThan(0);
    expect(REACH_AT_APEX_PX).toBeLessThan(REACH_AT_SAME_HEIGHT_PX);
  });
});
