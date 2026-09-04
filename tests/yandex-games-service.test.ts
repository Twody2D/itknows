import { beforeEach, describe, expect, it } from 'vitest';
import { YandexGamesService } from '@/services/YandexGamesService';

describe('YandexGamesService', () => {
  beforeEach(() => {
    YandexGamesService.resetForTests();
  });

  it('reports unavailable before init() ever runs', () => {
    expect(YandexGamesService.isAvailable()).toBe(false);
  });

  it('init() never throws even with no `window`/`document` (unit-test/CI environment)', async () => {
    await expect(YandexGamesService.init()).resolves.toBeUndefined();
    expect(YandexGamesService.isAvailable()).toBe(false);
  });

  it('notifyLoadingReady()/notifyGameplayStart()/notifyGameplayStop() are all safe no-ops without a real SDK', () => {
    expect(() => {
      YandexGamesService.notifyLoadingReady();
      YandexGamesService.notifyGameplayStart();
      YandexGamesService.notifyGameplayStop();
    }).not.toThrow();
  });

  it('showInterstitial() resolves instead of hanging when the SDK is unavailable', async () => {
    await expect(YandexGamesService.showInterstitial()).resolves.toBeUndefined();
  });

  it('showRewarded() always reports declined (never grants) without a real SDK', () => {
    let granted: boolean | undefined;
    YandexGamesService.showRewarded((g) => (granted = g));
    expect(granted).toBe(false);
  });
});
