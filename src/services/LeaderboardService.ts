import { YandexGamesService, type YsdkLeaderboardEntry } from './YandexGamesService';

/**
 * The one variant id every level's own leaderboard is comparable against
 * (`DifficultyDirector.selectVariant`'s fallback string). An adaptive
 * variant (`gentle`/`bold`/`troll`) is picked from the player's own recent
 * behavior, so its time is never a fair comparison across players —
 * decided in `TODO.md`, "Решённые вопросы" #4, and re-affirmed in
 * `docs/yandex-games.md`. `submitLevelScore` enforces this at the one place
 * a score ever leaves the game, not by trusting every caller to check first.
 */
const CANONICAL_VARIANT_ID = 'standard';

/**
 * Per-level leaderboard technical names. Yandex Games leaderboards are
 * configured server-side, by name, in the developer console — this game can
 * never create one from client code. Real submissions/reads only work once
 * every id below exists there with ascending sort (lower `timeMs` wins);
 * until then every call from this service degrades the same way the rest of
 * `YandexGamesService` does outside a real SDK (empty/`null`/no-op),
 * documented as a real gap in `docs/yandex-games.md`, not hidden.
 */
function leaderboardNameFor(levelId: string): string {
  return `level-${levelId}`;
}

class LeaderboardServiceController {
  /** Wired onto `level:completed` (see `LeaderboardSubmission.ts`) — silently skipped for anything but the canonical variant, and for a guest (submitting requires auth), same best-effort contract as the SDK facade underneath. */
  async submitLevelScore(levelId: string, timeMs: number, variantId: string): Promise<void> {
    if (variantId !== CANONICAL_VARIANT_ID) return;
    await YandexGamesService.submitScore(leaderboardNameFor(levelId), Math.round(timeMs));
  }

  /** Read-only, works for a guest too (no auth required to view a board). */
  getLevelEntries(levelId: string, quantityTop = 10): Promise<YsdkLeaderboardEntry[]> {
    return YandexGamesService.getLeaderboardEntries(leaderboardNameFor(levelId), quantityTop);
  }

  /** `null` for a guest or if this player has never submitted a canonical-variant time yet. */
  getPlayerLevelEntry(levelId: string): Promise<YsdkLeaderboardEntry | null> {
    return YandexGamesService.getPlayerLeaderboardEntry(leaderboardNameFor(levelId));
  }
}

export const LeaderboardService = new LeaderboardServiceController();
