import { describe, expect, it } from 'vitest';
import { SHOP_ITEMS } from '@/data/shop/items';
import { EARN_AMOUNTS } from '@/data/shop/economy';
import { BEEP7_TRAIL_STARS, COLLECTOR_SKIN_STARS, ECHO_SKIN_STARS, MAX_STARS, STAR_CREDITS } from '@/gameplay/stars';
import { LEVELS_PER_SECTOR, SECTOR_COUNT } from '@/gameplay/sectors';

/**
 * A ratchet. The figures below are the ones written down in `docs/SHOP.md`,
 * recomputed from the code that produces them, so the two cannot drift apart
 * in silence: change a price, a payout or `STAR_CREDITS` and this fails,
 * which is the moment to update the document — and to decide whether the
 * change was the intended one.
 *
 * The campaign at ten sectors pays more CREDITS than the shop can absorb,
 * and that is now a deliberate state rather than an oversight: the owner's
 * answer to the measurement (2026-09-19) was to take the two most expensive
 * cosmetics off sale entirely and hang them on stars, so what CREDITS
 * cannot buy is exactly the part worth having. The assertions below hold
 * that shape — the earn-only ladder has to stay spread out and reachable,
 * because a threshold nobody meets is the same mistake as an item everyone
 * can afford.
 */
const LEVELS = SECTOR_COUNT * LEVELS_PER_SECTOR;

const catalogueCredits = SHOP_ITEMS.reduce((sum, item) => sum + (item.priceCredits ?? 0), 0);

/** What one pass pays, given how many levels are cleared without a death and how many stars are taken. */
function campaignIncome(cleanLevels: number, stars: number): number {
  return (
    LEVELS * EARN_AMOUNTS.levelComplete +
    SECTOR_COUNT * EARN_AMOUNTS.sectorComplete +
    cleanLevels * EARN_AMOUNTS.zeroDeaths +
    stars * STAR_CREDITS
  );
}

describe('economy scale at the finished campaign', () => {
  it('the purchasable catalogue costs what the document says', () => {
    expect(catalogueCredits).toBe(980);
    expect(SHOP_ITEMS.filter((item) => item.priceCredits !== undefined)).toHaveLength(7);
  });

  it('nothing of premium rarity is for sale', () => {
    // The point of taking `echo` and `beep7` off sale: rarity has to mean
    // something CREDITS cannot reach, or it is just a colour on a card.
    // Bundle-exclusive items have no price either — they arrive with
    // SYSTEM ACCESS, which is a real product, not a CREDITS purchase.
    for (const item of SHOP_ITEMS) {
      if (item.rarity !== 'premium' || item.category === 'premium') continue;
      expect(item.priceCredits, `${item.id} is premium and still has a price`).toBeUndefined();
    }
  });

  it('a perfect pass pays what the document says', () => {
    expect(campaignIncome(LEVELS, LEVELS * MAX_STARS)).toBe(4150);
  });

  it('even the worst pass outearns the whole catalogue', () => {
    // Dies on every level, takes the one star that clearing always gives.
    expect(campaignIncome(0, LEVELS)).toBe(1750);
    expect(campaignIncome(0, LEVELS)).toBeGreaterThan(catalogueCredits);
  });

  it('the earn-only ladder is spread across the campaign and never asks for more than exists', () => {
    const available = LEVELS * MAX_STARS;
    expect([ECHO_SKIN_STARS, COLLECTOR_SKIN_STARS, BEEP7_TRAIL_STARS]).toEqual([60, 90, 120]);
    // Spread, in order, and clear of the ceiling: the last rung must still
    // leave room to miss stars, or only a perfect run reaches it.
    const ladder = [ECHO_SKIN_STARS, COLLECTOR_SKIN_STARS, BEEP7_TRAIL_STARS];
    for (let i = 1; i < ladder.length; i++) {
      expect(ladder[i]).toBeGreaterThan(ladder[i - 1] as number);
    }
    expect(BEEP7_TRAIL_STARS).toBeLessThan(available);
    expect(ECHO_SKIN_STARS).toBeGreaterThan(0);
  });

  it('every star threshold in the catalogue is reachable', () => {
    const available = LEVELS * MAX_STARS;
    for (const item of SHOP_ITEMS) {
      if (item.unlockCondition?.kind !== 'stars') continue;
      expect(item.unlockCondition.count, `${item.id} asks for more stars than exist`).toBeLessThanOrEqual(available);
    }
  });
});
