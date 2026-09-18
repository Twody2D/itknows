import { EventBus } from '@/core/EventBus';
import { CurrencyService } from '@/services/CurrencyService';
import { SaveService } from '@/services/SaveService';
import { EARN_AMOUNTS } from '@/data/shop/economy';
import { getLevel } from '@/gameplay/LevelFactory';
import { parTimeMs } from '@/gameplay/parTime';
import { STAR_CREDITS, starsFor } from '@/gameplay/stars';

/**
 * Free CREDITS from actually-playing (master-prompt §3), wired onto the
 * existing `level:completed` event rather than a new call site in
 * `GameplayScene` — that event already carries exactly what's needed
 * (`deaths`). Imported once from `main.ts` for its side effect (the
 * `EventBus.on` registration), same pattern as this project's other
 * cross-cutting AI/audio modules.
 */
EventBus.on('level:completed', ({ levelId, timeMs, deaths }) => {
  CurrencyService.earnCredits(EARN_AMOUNTS.levelComplete, 'level_complete');
  if (deaths === 0) CurrencyService.earnCredits(EARN_AMOUNTS.zeroDeaths, 'zero_deaths');

  // Stars are recorded here, beside the payout, because the two share one
  // rule: a level pays for *this* run, and stars are earned by one run too
  // (`gameplay/stars.ts`). Only the stars this run ADDS are paid for —
  // otherwise replaying a three-star level would be a CREDITS faucet, which
  // is the same mistake the daily branch in `GameplayScene` already avoids.
  const earned = starsFor({ timeMs, deaths, parMs: parTimeMs(getLevel(levelId)) });
  const before = SaveService.getLevelStars(levelId);
  if (earned > before) {
    SaveService.saveLevelStarsIfBetter(levelId, earned);
    CurrencyService.earnCredits((earned - before) * STAR_CREDITS, 'star');
  }
});
