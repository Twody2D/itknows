export type Locale = 'ru' | 'en';

/**
 * Current display language. Default is `ru` (CLAUDE.md #7). This only
 * covers SYSTEM dialogue for now (Commentator, Phase 3) — the rest of the
 * UI's string dictionaries land in Phase 4 alongside the bitmap font, per
 * CLAUDE.md's own phase plan.
 */
class LocaleStore {
  current: Locale = 'ru';

  set(locale: Locale): void {
    this.current = locale;
  }
}

export const LocaleState = new LocaleStore();
