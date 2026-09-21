import { beforeEach, describe, expect, it } from 'vitest';
import { EventBus } from '@/core/EventBus';
import { SaveService } from '@/services/SaveService';
import { CurrencyService } from '@/services/CurrencyService';
import { STAR_CREDITS } from '@/gameplay/stars';
import { EARN_AMOUNTS } from '@/data/shop/economy';
import { getLevel } from '@/gameplay/LevelFactory';
import { parTimeMs, thirdStarTimeMs } from '@/gameplay/parTime';
import '@/shop/EconomyRewards';

/**
 * THE ONE PLACE THE STAR RULE IS ACTUALLY APPLIED.
 *
 * `starsFor` is a pure function with its own tests, and `parTime` derives the
 * two targets with its own — but nothing joined them to a finished run. The
 * join is one line in `shop/EconomyRewards.ts`, riding the `level:completed`
 * event, and when the ladder stopped reading `deaths` on 2026-09-21 that line
 * was the only thing that had to change for the rule to reach the player.
 *
 * So this fires the real event at the real handler and reads the real save.
 */
const LEVEL_ID = 'sector-01-level-02';

function completeRun(timeMs: number, deaths: number): void {
  EventBus.emit('level:completed', { levelId: LEVEL_ID, timeMs, deaths });
}

describe('stars reach the save by the rule the campaign uses', () => {
  const def = getLevel(LEVEL_ID);
  const par = parTimeMs(def) as number;
  const third = thirdStarTimeMs(def) as number;

  beforeEach(() => {
    SaveService.resetForTests();
  });

  it('has two real targets to aim at, in order', () => {
    expect(par).toBeGreaterThan(0);
    expect(third).toBeLessThan(par);
  });

  it('pays one star for a slow clear', () => {
    completeRun(par + 1, 0);
    expect(SaveService.getLevelStars(LEVEL_ID)).toBe(1);
  });

  it('pays two for a run inside the target', () => {
    completeRun(par, 0);
    expect(SaveService.getLevelStars(LEVEL_ID)).toBe(2);
  });

  it('pays three for a run inside the tighter one', () => {
    completeRun(third, 0);
    expect(SaveService.getLevelStars(LEVEL_ID)).toBe(3);
  });

  it('pays the same three to a run that included deaths, if it was that fast', () => {
    // The whole point of the 2026-09-21 change. The clock already carries
    // the cost of the failed attempts, so the rule does not have to.
    completeRun(third, 4);
    expect(SaveService.getLevelStars(LEVEL_ID)).toBe(3);
  });

  it('keeps the best a single visit ever scored, and never pays for it twice', () => {
    completeRun(third, 0);
    const afterBest = CurrencyService.getBalance();
    expect(SaveService.getLevelStars(LEVEL_ID)).toBe(3);

    // A slower replay must not take stars away...
    completeRun(par + 5000, 0);
    expect(SaveService.getLevelStars(LEVEL_ID)).toBe(3);

    // ...and a repeat of the same three-star run must not pay for them
    // again. The flat rewards for finishing and for finishing clean still
    // arrive every time, by design — what must not arrive is another
    // `STAR_CREDITS`, which would make a three-star level a faucet.
    const beforeReplay = CurrencyService.getBalance();
    completeRun(third, 0);
    const paid = CurrencyService.getBalance() - beforeReplay;
    expect(paid).toBe(EARN_AMOUNTS.levelComplete + EARN_AMOUNTS.zeroDeaths);
    expect(CurrencyService.getBalance()).toBeGreaterThan(afterBest);
  });

  it('climbs one rung at a time, paying only for what is new', () => {
    completeRun(par, 0);
    expect(SaveService.getLevelStars(LEVEL_ID)).toBe(2);
    const before = CurrencyService.getBalance();
    completeRun(third, 0);
    expect(SaveService.getLevelStars(LEVEL_ID)).toBe(3);
    // Exactly one new star, whatever else the run paid for.
    expect(CurrencyService.getBalance() - before).toBeGreaterThanOrEqual(STAR_CREDITS);
  });
});
