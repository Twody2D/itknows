import { beforeEach, describe, expect, it } from 'vitest';
import { AdsService } from '@/services/AdsService';

describe('AdsService', () => {
  beforeEach(() => {
    AdsService.resetSessionForTests();
  });

  it('allows an interstitial with a cold cooldown and no prior shows this session', () => {
    expect(AdsService.canShowInterstitial(0)).toBe(true);
  });

  it('blocks another interstitial before the cooldown elapses', () => {
    AdsService.simulateInterstitialShownForTests(0);
    expect(AdsService.canShowInterstitial(1000)).toBe(false);
    expect(AdsService.canShowInterstitial(200_000)).toBe(true);
  });

  it('enforces a per-session cap even with the cooldown satisfied', () => {
    AdsService.simulateInterstitialShownForTests(0);
    AdsService.simulateInterstitialShownForTests(200_000);
    AdsService.simulateInterstitialShownForTests(400_000);
    expect(AdsService.canShowInterstitial(1_000_000)).toBe(false);
  });

  it('never actually shows an ad when the SDK is unavailable (every dev/CI environment)', () => {
    AdsService.requestInterstitial('SECTOR_COMPLETE', 0);
    // requestInterstitial no-op'd (no SDK) rather than consuming the cooldown/cap.
    expect(AdsService.canShowInterstitial(0)).toBe(true);
  });

  it('blocks everything once adsDisabled is set', () => {
    AdsService.setAdsDisabled(true);
    expect(AdsService.canShowInterstitial(0)).toBe(false);
    expect(AdsService.isAdsDisabled()).toBe(true);

    let granted: boolean | undefined;
    AdsService.requestRewarded((g) => (granted = g));
    expect(granted).toBe(false);
  });

  it('rewarded ads always resolve (never hang) and never grant without a real SDK', () => {
    let granted: boolean | undefined;
    AdsService.requestRewarded((g) => (granted = g));
    expect(granted).toBe(false);
  });
});
