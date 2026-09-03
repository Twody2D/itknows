import { YandexGamesService } from './YandexGamesService';

/**
 * Every point in the game allowed to *ask* for a fullscreen ad — never a
 * reason to show one unconditionally. `AdsService` alone decides whether an
 * ask actually results in an ad (master-prompt "fair ad system" §13:
 * eligibility lives centrally, never scattered across scenes).
 */
export type AdBreakpoint = 'LEVEL_COMPLETE' | 'SECTOR_COMPLETE' | 'CAMPAIGN_MILESTONE' | 'RETURN_TO_MENU';

const MIN_INTERSTITIAL_INTERVAL_MS = 150_000;
const MAX_INTERSTITIALS_PER_SESSION = 3;

/**
 * Centralized ad policy (master-prompt "fair ad system"): fullscreen ads
 * only fire from an explicit natural-breakpoint request, never from
 * gameplay/death/retry, and only if a cooldown and a session cap both allow
 * it. `adsDisabled` has no persistence yet — there is no purchase to back it
 * with until Phase 6's Yandex integration exists — but every other system
 * already only ever asks through here, so wiring up the real entitlement
 * later is a one-line change in this file, not a hunt through the codebase.
 */
class AdsServiceController {
  private adsDisabled = false;
  private lastInterstitialAtMs = -Infinity;
  private interstitialsShownThisSession = 0;

  isAdsDisabled(): boolean {
    return this.adsDisabled;
  }

  /** Dev/Phase-6 hook — the eventual `remove_ads`/`system_access` purchase flow sets this, nothing else should. */
  setAdsDisabled(disabled: boolean): void {
    this.adsDisabled = disabled;
  }

  canShowInterstitial(nowMs: number = performance.now()): boolean {
    if (this.adsDisabled) return false;
    if (this.interstitialsShownThisSession >= MAX_INTERSTITIALS_PER_SESSION) return false;
    if (nowMs - this.lastInterstitialAtMs < MIN_INTERSTITIAL_INTERVAL_MS) return false;
    return true;
  }

  /**
   * The only entry point gameplay/UI code should call. Silently does
   * nothing if the policy says no or the SDK isn't available — a skipped ad
   * is never an error (CLAUDE.md #8, master-prompt §33 "ad failure never
   * breaks the game").
   */
  requestInterstitial(_reason: AdBreakpoint, nowMs: number = performance.now()): void {
    if (!this.canShowInterstitial(nowMs)) return;
    if (!YandexGamesService.isAvailable()) return;

    this.recordInterstitialShown(nowMs);
    void YandexGamesService.showInterstitial();
  }

  /** Only the actually-shown path (above) and tests should call this — it's what the cooldown/cap are measured from. */
  private recordInterstitialShown(nowMs: number): void {
    this.lastInterstitialAtMs = nowMs;
    this.interstitialsShownThisSession += 1;
  }

  /** Test-only: simulates a real ad having been shown, since the dev/test environment has no live SDK to actually trigger one. */
  simulateInterstitialShownForTests(nowMs: number): void {
    this.recordInterstitialShown(nowMs);
  }

  /**
   * Voluntary only — always give the caller a granted/declined result, never
   * throw, never grant anything before the SDK actually confirms completion
   * (master-prompt §23 — no forced rewarded ads, no reward without a real
   * completed view).
   */
  requestRewarded(onComplete: (granted: boolean) => void): void {
    if (this.adsDisabled || !YandexGamesService.isAvailable()) {
      onComplete(false);
      return;
    }
    YandexGamesService.showRewarded(onComplete);
  }

  /** Test/dev-only reset — never called from gameplay code. */
  resetSessionForTests(): void {
    this.lastInterstitialAtMs = -Infinity;
    this.interstitialsShownThisSession = 0;
    this.adsDisabled = false;
  }
}

export const AdsService = new AdsServiceController();
