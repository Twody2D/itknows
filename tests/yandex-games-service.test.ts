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

  it('isPlayerAuthorized() is false without a real SDK', async () => {
    await expect(YandexGamesService.isPlayerAuthorized()).resolves.toBe(false);
  });

  it('requestAuthorization() reports failure instead of hanging without a real SDK', async () => {
    await expect(YandexGamesService.requestAuthorization()).resolves.toBe(false);
  });

  it('submitScore() resolves instead of hanging without a real SDK', async () => {
    await expect(YandexGamesService.submitScore('level-sector-01-level-01', 1000)).resolves.toBeUndefined();
  });

  it('getLeaderboardEntries() degrades to an empty list without a real SDK', async () => {
    await expect(YandexGamesService.getLeaderboardEntries('level-sector-01-level-01')).resolves.toEqual([]);
  });

  it('getPlayerLeaderboardEntry() degrades to null without a real SDK', async () => {
    await expect(YandexGamesService.getPlayerLeaderboardEntry('level-sector-01-level-01')).resolves.toBeNull();
  });
});
