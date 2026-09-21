import { beforeEach, describe, expect, it } from 'vitest';
import { LocaleState } from '@/i18n/Locale';
import { t } from '@/i18n/ui';

/**
 * Yandex Games requirement 2.14: «В игру встроено автоопределение языка через
 * SDK Яндекс Игр.» Nothing read `ysdk.environment.i18n.lang` at all — the game
 * opened in Russian for everyone, including a player arriving from the
 * `yandex.com` portal, and the language picker in settings was the only way
 * to change it. (It was also not persisted, so that choice lasted until the
 * page reloaded; both halves are fixed in `i18n/Locale.ts`.)
 *
 * The rule this holds: detection fills a gap, it never overrules a person.
 */
describe('language detection through the SDK', () => {
  beforeEach(() => {
    LocaleState.resetForTests();
  });

  it('defaults to ru when the platform says nothing', () => {
    // Outside a real Yandex iframe `getDetectedLanguage()` is `null`, which
    // is every local run, every test, and the whole game if the SDK fails.
    expect(LocaleState.applyDetected(null)).toBe(false);
    expect(LocaleState.applyDetected(undefined)).toBe(false);
    expect(LocaleState.current).toBe('ru');
  });

  it('takes a language the game actually has', () => {
    expect(LocaleState.applyDetected('en')).toBe(true);
    expect(LocaleState.current).toBe('en');
  });

  it('accepts a regional tag rather than falling through on it', () => {
    LocaleState.resetForTests();
    expect(LocaleState.applyDetected('en-US')).toBe(true);
    expect(LocaleState.current).toBe('en');
  });

  it('leaves the default alone for a language the game does not have', () => {
    // The portal serves Turkish and Kazakh among others. Coercing those to
    // English would be a guess; Russian is the declared default (CLAUDE.md
    // #7) and staying there is the honest answer.
    for (const lang of ['tr', 'kk', 'de', '', 'ru-RU-x-nonsense-but-still-ru']) {
      LocaleState.resetForTests();
      const taken = LocaleState.applyDetected(lang);
      expect(taken, lang).toBe(lang.startsWith('ru'));
      if (!taken) expect(LocaleState.current).toBe('ru');
    }
  });

  it('never overrules a language the player chose by hand', () => {
    // THE RULE THAT MATTERS. Detection lands late — the SDK is a network
    // fetch — so it can and does arrive after the player has already been in
    // settings. Their choice wins, whatever the portal says.
    LocaleState.set('en');
    expect(LocaleState.applyDetected('ru')).toBe(false);
    expect(LocaleState.current).toBe('en');
  });

  it('actually changes what the player reads', () => {
    // Guards against a detection that sets a field nothing consults.
    expect(t('play')).toBe('Играть');
    LocaleState.applyDetected('en');
    expect(t('play')).toBe('Play');
  });
});
