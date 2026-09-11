/**
 * The two typefaces the UI is set in: a pixel face for every counter, price,
 * title and SYSTEM line, and Rubik for prose, item names and button labels.
 *
 * This is a deliberate, owner-authorised exception to CLAUDE.md #3's "ноль
 * бинарных файлов" and #12's ban on external font assets. Two things keep
 * the exception as small as it can be:
 *
 * - The faces are **self-hosted**, not pulled from Google Fonts at runtime.
 *   `@fontsource` is a dev dependency; Vite inlines these `@font-face` rules
 *   and emits the font files into `dist/` like any other asset, so the game
 *   still makes no third-party request and still works offline and inside a
 *   Yandex Games iframe (CLAUDE.md #8's "работает при сломанной сети").
 * - Only the subsets and weights the UI really uses are imported.
 *
 * The technical face is **JetBrains Mono**, which is what the mockups are
 * now set in. It replaced Pixelify Sans there after that font turned out to
 * be unable to set Russian at all: its Cyrillic block is missing uppercase
 * "О" (U+041E) and "П" (U+041F) — those two out of all 33 — so the browser
 * substitutes them from a system font and two hollow, thin-stroked letters
 * land in the middle of otherwise solid words. That was verified against
 * Google's own served copy, so the defect was in the mockups too.
 *
 * JetBrains Mono's Cyrillic is complete in every weight (verified the same
 * way, by parsing the binaries), and at 0.600em per glyph it is fractionally
 * narrower than Pixelify Sans' 0.632em average — so the mockups' own
 * measurements carry over without refitting.
 *
 * **Every weight the UI asks for must be imported here.** Fontsource's
 * subset files carry no `unicode-range` and no weight beyond the one they
 * ship, so a weight that isn't loaded doesn't fall back — the browser
 * *synthesises* it by smearing each glyph horizontally **without widening
 * its advance**, which makes neighbouring letters overlap.
 *
 * `font-display: swap` means a failed or slow load falls back to the system
 * stack instead of leaving the UI blank.
 */
import '@fontsource/jetbrains-mono/cyrillic-500.css';
import '@fontsource/jetbrains-mono/cyrillic-700.css';
import '@fontsource/jetbrains-mono/latin-500.css';
import '@fontsource/jetbrains-mono/latin-700.css';
import '@fontsource/rubik/cyrillic-400.css';
import '@fontsource/rubik/cyrillic-700.css';
import '@fontsource/rubik/cyrillic-800.css';
import '@fontsource/rubik/latin-400.css';
import '@fontsource/rubik/latin-700.css';
import '@fontsource/rubik/latin-800.css';

/** Mockup: `font-family:'JetBrains Mono',monospace` — titles, counters, prices, statuses, SYSTEM's voice. */
export const PIXEL_FONT = "'JetBrains Mono', monospace";
/** Mockup: `font-family:Rubik,sans-serif` — prose, item names, button labels. */
export const PROSE_FONT = "Rubik, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif";

/**
 * The only weights of each face that exist in the bundle. Naming any other
 * weight in CSS gets a synthesised one — the glyph smeared horizontally
 * without widening its advance, so neighbouring letters overlap — which is
 * why styling code reads its weight from here rather than writing a number
 * inline. The pairs below are the mockups' own: JetBrains Mono at 500 and
 * 700, Rubik at 800 over a 400 body.
 */
export const PIXEL_WEIGHT = { regular: '500', bold: '700' } as const;
export const PROSE_WEIGHT = { regular: '400', bold: '800' } as const;

/**
 * Resolves once both faces have actually loaded every weight the UI uses,
 * not just once the `@font-face` rules are registered. `BootScene` awaits
 * this before starting the menu: labels that measure a sibling's rendered
 * `.width` to position themselves (the shop's topbar subtitle,
 * `ScreenChrome`'s) read that width synchronously right after creation — if
 * the real font hasn't swapped in yet, that read gets the browser's
 * `font-display:swap` fallback-font width instead, and the position it
 * computes goes stale for the rest of that label's life.
 */
export function fontsReady(): Promise<unknown> {
  return Promise.all([
    document.fonts.load(`${PIXEL_WEIGHT.regular} 16px ${PIXEL_FONT}`),
    document.fonts.load(`${PIXEL_WEIGHT.bold} 16px ${PIXEL_FONT}`),
    document.fonts.load(`${PROSE_WEIGHT.regular} 16px ${PROSE_FONT}`),
    document.fonts.load(`${PROSE_WEIGHT.bold} 16px ${PROSE_FONT}`),
    document.fonts.ready,
  ]);
}
