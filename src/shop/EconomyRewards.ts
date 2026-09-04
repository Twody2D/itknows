import { EventBus } from '@/core/EventBus';
import { CurrencyService } from '@/services/CurrencyService';
import { EARN_AMOUNTS } from '@/data/shop/economy';

/**
 * Free CREDITS from actually-playing (master-prompt §3), wired onto the
 * existing `level:completed` event rather than a new call site in
 * `GameplayScene` — that event already carries exactly what's needed
 * (`deaths`). Imported once from `main.ts` for its side effect (the
 * `EventBus.on` registration), same pattern as this project's other
 * cross-cutting AI/audio modules.
 */
EventBus.on('level:completed', ({ deaths }) => {
  CurrencyService.earnCredits(EARN_AMOUNTS.levelComplete, 'level_complete');
  if (deaths === 0) CurrencyService.earnCredits(EARN_AMOUNTS.zeroDeaths, 'zero_deaths');
});
