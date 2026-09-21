import { readJson, writeJson } from '@/utils/safeStorage';

export type Locale = 'ru' | 'en';

const STORAGE_KEY = 'itknows.locale.v1';
const SETTINGS_VERSION = 1;

interface LocaleDataV1 {
  version: 1;
  locale: Locale;
}

function parse(raw: unknown): Locale | null {
  const parsed = raw as Partial<LocaleDataV1> | null;
  if (!parsed || parsed.version !== SETTINGS_VERSION) return null;
  return parsed.locale === 'ru' || parsed.locale === 'en' ? parsed.locale : null;
}

/**
 * Current display language. `ru` is the default (CLAUDE.md #7), but it is
 * only ever the *fallback* now, not the answer: Yandex Games requires the
 * game to detect the player's language through the SDK (requirement 2.14),
 * and a portal visitor on `yandex.com` was being handed Russian regardless.
 *
 * Three sources, in this order of authority:
 *
 *  1. What the player chose themselves in settings. It wins over everything
 *     and it is remembered — before this it was not persisted at all, so
 *     picking English lasted exactly until the page reloaded.
 *  2. `ysdk.environment.i18n.lang`, applied at boot through
 *     `applyDetected()`. Anything outside the two languages we actually have
 *     falls through rather than being coerced.
 *  3. `ru`.
 *
 * Kept in its own storage key rather than in `SaveService`: this is a device
 * preference like `AudioSettings`, not progress, and it must be readable
 * synchronously at module load, long before the save's cloud merge resolves.
 */
class LocaleStore {
  current: Locale = 'ru';
  /** True once the player has chosen a language by hand — detection must not overrule that. */
  private chosenByPlayer = false;

  constructor() {
    const stored = parse(readJson(STORAGE_KEY));
    if (stored) {
      this.current = stored;
      this.chosenByPlayer = true;
    }
  }

  /** The player's own choice, from `SettingsScene`. Persisted, and final. */
  set(locale: Locale): void {
    this.current = locale;
    this.chosenByPlayer = true;
    writeJson(STORAGE_KEY, { version: SETTINGS_VERSION, locale } satisfies LocaleDataV1);
  }

  /**
   * Applies a language reported by the platform. Returns whether it was
   * taken: a player's own choice, an unknown tag (`tr`, `kk`, `null` outside
   * a real SDK) and a language we do not have all leave `current` alone.
   */
  applyDetected(lang: string | null | undefined): boolean {
    if (this.chosenByPlayer) return false;
    // The SDK reports a bare two-letter code, but a `ru-RU`-shaped tag from
    // any other source resolves the same way rather than falling through.
    const code = (lang ?? '').slice(0, 2).toLowerCase();
    if (code !== 'ru' && code !== 'en') return false;
    this.current = code;
    return true;
  }

  /** Test-only reset — never called from game code. */
  resetForTests(): void {
    this.current = 'ru';
    this.chosenByPlayer = false;
  }
}

export const LocaleState = new LocaleStore();
