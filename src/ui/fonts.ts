/**
 * The two typefaces the Claude Design mockups are actually set in a
 * technical/pixel face for every counter, price, title and SYSTEM line, and
 * a humanist sans (Rubik) for prose and buttons.
 *
 * The mockup's own technical face, Pixelify Sans, was tried first and pulled
 * after a verified, reproducible defect: Fontsource's build of it (every
 * weight) maps Cyrillic "О" and "П" — two of the most common letters in
 * Russian — to glyph 0 (`.notdef`) instead of a real outline. Confirmed by
 * parsing the font binary directly (`opentype.js`, outside the game, no
 * project code involved): `charToGlyphIndex('О')` returns 0 in every weight
 * of both the "cyrillic" and "latin" subset files. That is not a CSS or
 * kerning issue this project can work around — the glyph the browser draws
 * for those two letters is a stand-in shape with the wrong advance width,
 * which is what read as one letter overlapping the next in almost every
 * Russian word (anything with "о" in it — nearly everything). Rubik Mono
 * One is the replacement: a single-weight geometric display face from the
 * same foundry/superfamily as the prose face below, verified with the same
 * method to have full, correct Cyrillic coverage, and visually closer to a
 * bold technical/pixel label than falling back to plain Rubik would be.
 *
 * This is a deliberate, owner-authorised exception to CLAUDE.md #3's "ноль
 * бинарных файлов" and #12's ban on external font assets. Two things keep
 * the exception as small as it can be:
 *
 * - The faces are **self-hosted**, not pulled from Google Fonts at runtime.
 *   `@fontsource` is a dev dependency; Vite inlines these `@font-face` rules
 *   and emits the `woff2` files into `dist/` like any other asset, so the
 *   game still makes no third-party request and still works offline and
 *   inside a Yandex Games iframe (CLAUDE.md #8's "работает при сломанной
 *   сети" is unaffected).
 * - Only the subsets and weights the UI really uses are imported (Cyrillic +
 *   Latin; Rubik Mono One only ships one weight) — well under 100 KB total
 *   against a 3 MB budget, rather than the packages' full set.
 *
 * `font-display: swap` means a failed or slow load falls back to the system
 * stack instead of leaving the UI blank.
 */
import '@fontsource/rubik-mono-one/cyrillic-400.css';
import '@fontsource/rubik-mono-one/latin-400.css';
import '@fontsource/rubik/cyrillic-400.css';
import '@fontsource/rubik/cyrillic-700.css';
import '@fontsource/rubik/cyrillic-800.css';
import '@fontsource/rubik/latin-400.css';
import '@fontsource/rubik/latin-700.css';
import '@fontsource/rubik/latin-800.css';

/** Every counter, price, title and SYSTEM line — see this file's own doc comment for why it isn't Pixelify Sans. Single weight; never request bold on it. */
export const PIXEL_FONT = "'Rubik Mono One', monospace";
/** Mockup: `font-family:Rubik,sans-serif` — prose, item names, button labels. */
export const PROSE_FONT = "Rubik, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif";

/**
 * Resolves once both faces have actually loaded a real weight/style, not
 * just once the `<link>`/`@font-face` rules are registered. `BootScene`
 * awaits this before starting the menu: `DomTextOverlay` labels that measure
 * a sibling's rendered `.width` to position themselves (the shop's topbar
 * subtitle, `ScreenChrome`'s) read that width synchronously right after
 * creation — if the real font hasn't swapped in yet, that read gets the
 * browser's `font-display:swap` fallback-font width instead, and the
 * position it computes goes stale for the rest of that label's life. Boot is
 * the one place already free to spend a few milliseconds before the game
 * becomes interactive (CLAUDE.md #8's "меню реально интерактивно" gate).
 */
export function fontsReady(): Promise<unknown> {
  return Promise.all([
    document.fonts.load(`400 16px ${PIXEL_FONT}`),
    document.fonts.load(`400 16px ${PROSE_FONT}`),
    document.fonts.load(`800 16px ${PROSE_FONT}`),
    document.fonts.ready,
  ]);
}
