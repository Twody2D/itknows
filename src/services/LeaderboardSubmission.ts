import { EventBus } from '@/core/EventBus';
import { GameState } from '@/core/GameState';
import { LeaderboardService } from './LeaderboardService';

/**
 * Submits a level's finish time to its leaderboard on every real completion,
 * the same "wire onto the existing event, no new call site" pattern as
 * `shop/EconomyRewards.ts`. `LeaderboardService.submitLevelScore` itself
 * throws away anything but the canonical variant, so this listener doesn't
 * need to duplicate that check — it just supplies what the event already
 * carries. Imported once from `main.ts` for its side effect.
 */
EventBus.on('level:completed', ({ levelId, timeMs }) => {
  void LeaderboardService.submitLevelScore(levelId, timeMs, GameState.currentVariantId);
});
