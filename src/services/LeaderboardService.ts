import { YandexGamesService, type YsdkLeaderboardEntry } from './YandexGamesService';

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

/** A sector's own table — `sectorId` is already the `sector-01`-style id (`sectors.ts`'s `sectorIdOf`), same real-console-setup caveat as `leaderboardNameFor`. */
function sectorLeaderboardNameFor(sectorId: string): string {
  return `sector-${sectorId}`;
}

class LeaderboardServiceController {
  /**
   * Wired onto `level:completed` (see `LeaderboardSubmission.ts`) — silently
   * skipped for a guest (submitting requires auth), same best-effort
   * contract as the SDK facade underneath.
   *
   * There used to be a canonical-variant gate here, because an adaptive cut
   * of a level was picked from the player's own behavior and its time was
   * therefore never comparable across players. The adaptive layer is gone
   * (`LevelFactory`): one shape per level means every time posted is a time
   * on the same level, and there is nothing left to filter.
   */
  async submitLevelScore(levelId: string, timeMs: number): Promise<void> {
    await YandexGamesService.submitScore(leaderboardNameFor(levelId), Math.round(timeMs));
  }

  /** Read-only, works for a guest too (no auth required to view a board). `null` means the board could not be read at all — see the facade's own note on why that is not the same as an empty board. */
  getLevelEntries(levelId: string, quantityTop = 10): Promise<YsdkLeaderboardEntry[] | null> {
    return YandexGamesService.getLeaderboardEntries(leaderboardNameFor(levelId), quantityTop);
  }

  /** `null` for a guest or if this player has never submitted a canonical-variant time yet. */
  getPlayerLevelEntry(levelId: string): Promise<YsdkLeaderboardEntry | null> {
    return YandexGamesService.getPlayerLeaderboardEntry(leaderboardNameFor(levelId));
  }

  /**
   * Wired from `SectorCompleteScene` — unlike `submitLevelScore`, not
   * restricted to the canonical variant: a sector's elapsed time already
   * blends whichever variant `DifficultyDirector` served each of its six
   * levels, so there's no single "was this whole sector canonical" check to
   * gate on. A small, documented fairness trade-off rather than a new
   * per-sector adaptive-history tracker.
   */
  async submitSectorScore(sectorId: string, timeMs: number): Promise<void> {
    await YandexGamesService.submitScore(sectorLeaderboardNameFor(sectorId), Math.round(timeMs));
  }

  getSectorEntries(sectorId: string, quantityTop = 10): Promise<YsdkLeaderboardEntry[] | null> {
    return YandexGamesService.getLeaderboardEntries(sectorLeaderboardNameFor(sectorId), quantityTop);
  }

  /** `null` for a guest or if this player has never cleared this sector while authorized. */
  getPlayerSectorEntry(sectorId: string): Promise<YsdkLeaderboardEntry | null> {
    return YandexGamesService.getPlayerLeaderboardEntry(sectorLeaderboardNameFor(sectorId));
  }
}

export const LeaderboardService = new LeaderboardServiceController();
