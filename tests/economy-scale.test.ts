import { describe, expect, it } from 'vitest';
import { SHOP_ITEMS } from '@/data/shop/items';
import { EARN_AMOUNTS } from '@/data/shop/economy';
import { MAX_STARS, STAR_CREDITS } from '@/gameplay/stars';
import { LEVELS_PER_SECTOR, SECTOR_COUNT } from '@/gameplay/sectors';

/**
 * A ratchet, not a judgement. The figures below are the ones written down in
 * `docs/SHOP.md`, recomputed from the code that produces them, so the two
 * cannot drift apart in silence: change a price, a payout or `STAR_CREDITS`
 * and this fails, which is the moment to update the document — and to decide
 * whether the change was the intended one.
 *
 * What the numbers say today is that the shop is over-funded: one pass of
 * the campaign pays for the entire purchasable catalogue even for a player
 * who dies on every level. That is recorded, not endorsed — the fix is the
 * owner's call (see the measurement section of `docs/SHOP.md`), because
 * every option changes the scope lock in `TODO.md`.
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
    expect(catalogueCredits).toBe(1460);
    expect(SHOP_ITEMS.filter((item) => item.priceCredits !== undefined)).toHaveLength(9);
  });

  it('a perfect pass pays what the document says', () => {
    expect(campaignIncome(LEVELS, LEVELS * MAX_STARS)).toBe(4150);
  });

  it('even the worst pass outearns the whole catalogue', () => {
    // Dies on every level, takes the one star that clearing always gives.
    expect(campaignIncome(0, LEVELS)).toBe(1750);
    expect(campaignIncome(0, LEVELS)).toBeGreaterThan(catalogueCredits);
  });

  it('stars alone are worth more than the catalogue, which is where the imbalance lives', () => {
    expect(LEVELS * MAX_STARS * STAR_CREDITS).toBe(2700);
    expect(LEVELS * MAX_STARS * STAR_CREDITS).toBeGreaterThan(catalogueCredits);
  });

  it('every star threshold in the catalogue is reachable', () => {
    const available = LEVELS * MAX_STARS;
    for (const item of SHOP_ITEMS) {
      if (item.unlockCondition?.kind !== 'stars') continue;
      expect(item.unlockCondition.count, `${item.id} asks for more stars than exist`).toBeLessThanOrEqual(available);
    }
  });
});
