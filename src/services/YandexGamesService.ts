/**
 * Facade for the Yandex Games SDK (CLAUDE.md #8 — gameplay/UI code never
 * touches `ysdk` directly). Actual SDK loading, `LoadingAPI.ready`,
 * `GameplayAPI.start/stop`, auth and the real ad calls are Phase 6
 * (`TODO.md`) — until then this always reports itself unavailable, so every
 * caller's "no SDK" fallback path runs for real, not just in theory. Every
 * method is safe to call unconditionally from anywhere in the game.
 */
class YandexGamesServiceController {
  isAvailable(): boolean {
    return false;
  }

  showInterstitial(): Promise<void> {
    return Promise.resolve();
  }

  showRewarded(onComplete: (granted: boolean) => void): void {
    onComplete(false);
  }
}

export const YandexGamesService = new YandexGamesServiceController();
