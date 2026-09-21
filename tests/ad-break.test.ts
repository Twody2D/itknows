import { beforeEach, describe, expect, it } from 'vitest';
import { YandexGamesService } from '@/services/YandexGamesService';

/**
 * Yandex Games requirement 4.7: «При показе полноэкранной рекламы звук в игре
 * и игровой процесс должны ставиться на паузу.»
 *
 * Nothing did. `showRewarded`/`showInterstitial` registered `onRewarded`,
 * `onClose` and `onError` but never `onOpen`, so the synth kept playing under
 * the ad and `GameplayAPI` still reported the player as playing. The
 * `visibilitychange` handler in `main.ts` — which is what suspends audio for
 * a backgrounded tab — cannot help here: the ad is drawn over the same
 * document, so the page never goes hidden.
 *
 * The facade owns the SDK half (it is the only thing that knows whether an
 * attempt was running); `main.ts` subscribes for the audio and the Phaser
 * pause. This holds the facade half, which is where the ordering lives.
 */
describe('the ad break pauses and restores', () => {
  beforeEach(() => {
    YandexGamesService.resetForTests();
  });

  it('tells its listeners when an ad opens and when it goes away', () => {
    const seen: boolean[] = [];
    YandexGamesService.onAdBreak((open) => seen.push(open));
    YandexGamesService.simulateAdBreakForTests(true);
    YandexGamesService.simulateAdBreakForTests(false);
    expect(seen).toEqual([true, false]);
  });

  it('keeps the attempt alive across the break so there is something to restore', () => {
    // The attempt is not over, it is covered. `gameplayActive` has to survive
    // the ad — otherwise the facade would have nothing to hand back to
    // `GameplayAPI.start()` when the ad closes, and the rest of the level
    // would be played with the platform believing the player had stopped.
    YandexGamesService.notifyGameplayStart();
    YandexGamesService.simulateAdBreakForTests(true);
    expect(YandexGamesService.isGameplayActive()).toBe(true);
    YandexGamesService.simulateAdBreakForTests(false);
    expect(YandexGamesService.isGameplayActive()).toBe(true);
  });

  it('does not open a second break, or close one twice', () => {
    // The SDK is documented as calling `onClose` or `onError`, but one that
    // called both would otherwise resume the game once for each — and a
    // duplicated `onOpen` would pause it twice against a single resume,
    // which is a game left paused behind an ad that is already gone.
    const seen: boolean[] = [];
    YandexGamesService.onAdBreak((open) => seen.push(open));
    YandexGamesService.simulateAdBreakForTests(true);
    YandexGamesService.simulateAdBreakForTests(true);
    YandexGamesService.simulateAdBreakForTests(false);
    YandexGamesService.simulateAdBreakForTests(false);
    expect(seen).toEqual([true, false]);
  });

  it('a listener that throws still lets the others hear the break', () => {
    // A half-applied break is the worst outcome available here: audio
    // suspended and never resumed, or a paused game nothing un-pauses.
    const seen: boolean[] = [];
    YandexGamesService.onAdBreak(() => {
      throw new Error('subscriber blew up');
    });
    YandexGamesService.onAdBreak((open) => seen.push(open));
    YandexGamesService.simulateAdBreakForTests(true);
    YandexGamesService.simulateAdBreakForTests(false);
    expect(seen).toEqual([true, false]);
  });

  it('restores nothing when the ad opened from the menu', () => {
    // Same definition of "gameplay" CLAUDE.md #8 already uses: the shop's
    // rewarded ad and the sector-complete interstitial do not open over an
    // attempt, so nothing is owed to `GameplayAPI` afterwards.
    expect(YandexGamesService.isGameplayActive()).toBe(false);
    YandexGamesService.simulateAdBreakForTests(true);
    YandexGamesService.simulateAdBreakForTests(false);
    expect(YandexGamesService.isGameplayActive()).toBe(false);
  });

  it('grants nothing and hangs nothing when there is no SDK to show an ad', () => {
    // The degrade contract the whole facade keeps (CLAUDE.md #8): no SDK
    // means the callback still arrives, declined, and no break is ever
    // opened — so no listener is left holding a pause.
    const seen: boolean[] = [];
    YandexGamesService.onAdBreak((open) => seen.push(open));
    let granted: boolean | null = null;
    YandexGamesService.showRewarded((g) => (granted = g));
    expect(granted).toBe(false);
    expect(seen).toEqual([]);
  });
});
