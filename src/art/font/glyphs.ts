/**
 * Custom pixel display font, restyled to read like the clean, thin,
 * variable-width bitmap font Minecraft uses in its own menus (reference:
 * settings screens like "Настройки графики") — not the blockier, forced-
 * monospace Monocraft-style redraw this file used to hold. The literal
 * Minecraft font file can't ship either way (CLAUDE.md #3 — zero binary
 * assets, no web/external fonts, own bitmap font only), so this is our own
 * glyph set drawn in that font's spirit: plain geometric strokes, no
 * serifs (`I` is a bare vertical line, not a bar-stem-bar), and — the part
 * that actually changed from the previous pass — every glyph is only as
 * wide as it needs to be again. `BitmapFont.glyphWidth()` reads a glyph's
 * own last row's length, so a narrow `I` and a wide `M`/`Ж`/`Ш`/`Щ`/`Ю` each
 * carry their own advance width instead of all being padded to one shared
 * column count.
 *
 * The game still renders everything upper-case (`BitmapFont.drawLines`
 * upper-cases before lookup) — that stays a deliberate SYSTEM/terminal
 * styling choice (CLAUDE.md #7), separate from the letterforms themselves,
 * so only the shapes changed here, not the casing behavior. Every row
 * within one glyph's array must be the same string length as every other
 * row in that glyph (that shared length is what `glyphWidth()` reports) —
 * different glyphs are free to differ from each other.
 */
export const GLYPH_HEIGHT = 8;

export const GLYPHS: Record<string, string[]> = {
  A: ['00000', '01110', '10001', '10001', '11111', '10001', '10001', '10001'],
  B: ['00000', '11110', '10001', '10001', '11110', '10001', '10001', '11110'],
  C: ['00000', '01111', '10000', '10000', '10000', '10000', '10000', '01111'],
  D: ['00000', '11110', '10001', '10001', '10001', '10001', '10001', '11110'],
  E: ['00000', '11111', '10000', '10000', '11110', '10000', '10000', '11111'],
  F: ['00000', '11111', '10000', '10000', '11110', '10000', '10000', '10000'],
  G: ['00000', '01111', '10000', '10000', '10011', '10001', '10001', '01111'],
  H: ['00000', '10001', '10001', '10001', '11111', '10001', '10001', '10001'],
  // Minecraft's own font draws `I` as a bare vertical stroke, no serifs — the
  // single clearest example of "this font is thinner", so it's kept literal.
  I: ['000', '010', '010', '010', '010', '010', '010', '010'],
  J: ['00000', '00001', '00001', '00001', '00001', '10001', '10001', '01110'],
  K: ['00000', '10001', '10010', '10100', '11000', '10100', '10010', '10001'],
  L: ['00000', '10000', '10000', '10000', '10000', '10000', '10000', '11111'],
  // Wider than most letters on purpose (matches how noticeably wide M/W read
  // in Minecraft's own font) — a shallow notch instead of full diagonals.
  M: ['000000', '100001', '110011', '101101', '100001', '100001', '100001', '100001'],
  N: ['00000', '10001', '11001', '10101', '10011', '10001', '10001', '10001'],
  O: ['00000', '01110', '10001', '10001', '10001', '10001', '10001', '01110'],
  P: ['00000', '11110', '10001', '10001', '11110', '10000', '10000', '10000'],
  Q: ['00000', '01110', '10001', '10001', '10001', '10101', '10011', '01111'],
  R: ['00000', '11110', '10001', '10001', '11110', '10100', '10010', '10001'],
  S: ['00000', '01111', '10000', '10000', '01110', '00001', '00001', '11110'],
  T: ['00000', '11111', '00100', '00100', '00100', '00100', '00100', '00100'],
  U: ['00000', '10001', '10001', '10001', '10001', '10001', '10001', '01110'],
  V: ['00000', '10001', '10001', '10001', '10001', '10001', '01010', '00100'],
  W: ['000000', '100001', '100001', '100001', '100001', '101101', '110011', '100001'],
  X: ['00000', '10001', '10001', '01010', '00100', '01010', '10001', '10001'],
  Y: ['00000', '10001', '10001', '01010', '00100', '00100', '00100', '00100'],
  Z: ['00000', '11111', '00001', '00010', '00100', '01000', '10000', '11111'],

  '0': ['00000', '01110', '10001', '10011', '10101', '11001', '10001', '01110'],
  '1': ['00000', '00100', '01100', '00100', '00100', '00100', '00100', '01110'],
  '2': ['00000', '01110', '10001', '00001', '00010', '00100', '01000', '11111'],
  '3': ['00000', '11111', '00010', '00100', '00010', '00001', '10001', '01110'],
  '4': ['00000', '00010', '00110', '01010', '10010', '11111', '00010', '00010'],
  '5': ['00000', '11111', '10000', '11110', '00001', '00001', '10001', '01110'],
  '6': ['00000', '00110', '01000', '10000', '11110', '10001', '10001', '01110'],
  '7': ['00000', '11111', '00001', '00010', '00100', '01000', '01000', '01000'],
  '8': ['00000', '01110', '10001', '10001', '01110', '10001', '10001', '01110'],
  '9': ['00000', '01110', '10001', '10001', '01111', '00001', '00010', '01100'],

  ' ': ['000', '000', '000', '000', '000', '000', '000', '000'],
  '.': ['000', '000', '000', '000', '000', '000', '000', '010'],
  ',': ['000', '000', '000', '000', '000', '000', '001', '010'],
  ':': ['000', '000', '000', '010', '000', '000', '010', '000'],
  '!': ['000', '010', '010', '010', '010', '010', '000', '010'],
  '?': ['00000', '01110', '10001', '00001', '00010', '00100', '00000', '00100'],
  "'": ['00', '10', '10', '00', '00', '00', '00', '00'],
  '-': ['00000', '00000', '00000', '00000', '11111', '00000', '00000', '00000'],
  // Em dash — used in dialogue lines (e.g. `dialogues/fall.ts`'s "Ты — да.").
  // Missing entirely before this pass: `drawLines` silently skips a glyph
  // with no bitmap but still advances the cursor by the unknown-char
  // fallback width, which left a blank gap instead of a dash on screen.
  '—': ['0000000', '0000000', '0000000', '0000000', '1111111', '0000000', '0000000', '0000000'],
  // «+» — счётчики наград в магазине («+20»); раньше `drawLines` молча
  // пропускал глиф и «+20» читалось как «20».
  '+': ['00000', '00000', '00100', '00100', '11111', '00100', '00100', '00000'],
  // «·» — разделитель в заголовках разделов («ОБЛИК · 1 ИЗ 6 ОТКРЫТО»).
  '·': ['000', '000', '000', '010', '000', '000', '000', '000'],
  '_': ['00000', '00000', '00000', '00000', '00000', '00000', '00000', '11111'],
  '/': ['00000', '00001', '00010', '00010', '00100', '01000', '01000', '10000'],
  '(': ['000', '001', '010', '100', '100', '100', '010', '001'],
  ')': ['000', '100', '010', '001', '001', '001', '010', '100'],
  '<': ['0000', '0001', '0010', '0100', '1000', '0100', '0010', '0001'],
  '>': ['0000', '1000', '0100', '0010', '0001', '0010', '0100', '1000'],

  // Cyrillic — every entry below is its own distinct bitmap.
  А: ['00000', '01110', '10001', '10001', '11111', '10001', '10001', '10001'],
  Б: ['00000', '11111', '10000', '10000', '11110', '10001', '10001', '11110'],
  В: ['00000', '11110', '10001', '10001', '11110', '10001', '10001', '11110'],
  Г: ['00000', '11111', '10000', '10000', '10000', '10000', '10000', '10000'],
  // Legs flush with the frame edge under a narrower shaft are what separates
  // Д from А at this width — same trick the previous pass used.
  Д: ['00000', '01110', '01010', '01010', '01010', '01010', '11111', '10001'],
  Е: ['00000', '11111', '10000', '10000', '11110', '10000', '10000', '11111'],
  Ё: ['01010', '11111', '10000', '10000', '11110', '10000', '10000', '11111'],
  // Wide, same width class as M/W — a continuous center stem (every row's
  // middle column is lit) with diagonal wings closing toward it top and
  // bottom. Without the stem this reads as a plain X (confirmed on screen —
  // this replaced a bowtie shape that did exactly that).
  Ж: ['0000000', '1001001', '0101010', '0011100', '0001000', '0011100', '0101010', '1001001'],
  З: ['00000', '01110', '10001', '00001', '00110', '00001', '10001', '01110'],
  И: ['00000', '10001', '10001', '10011', '10101', '11001', '10001', '10001'],
  Й: ['01110', '10001', '10001', '10011', '10101', '11001', '10001', '10001'],
  К: ['00000', '10001', '10010', '10100', '11000', '10100', '10010', '10001'],
  // A flat roof over straight parallel legs, flaring out to feet only on the
  // very last row — the ordinary "arch with a kicked-out foot" shape most
  // sans-serif Cyrillic fonts actually use, same construction as Д's legs
  // below. The previous pointed-triangle version (Λ-like) wasn't a
  // recognizable Л at all; still earlier than that, a version with the
  // widen split across two rows read as disconnected fragments.
  Л: ['00000', '01110', '01010', '01010', '01010', '01010', '01010', '10001'],
  // Same wide notch construction as Latin M.
  М: ['000000', '100001', '110011', '101101', '100001', '100001', '100001', '100001'],
  Н: ['00000', '10001', '10001', '10001', '11111', '10001', '10001', '10001'],
  О: ['00000', '01110', '10001', '10001', '10001', '10001', '10001', '01110'],
  П: ['00000', '11111', '10001', '10001', '10001', '10001', '10001', '10001'],
  Р: ['00000', '11110', '10001', '10001', '11110', '10000', '10000', '10000'],
  С: ['00000', '01111', '10000', '10000', '10000', '10000', '10000', '01111'],
  Т: ['00000', '11111', '00100', '00100', '00100', '00100', '00100', '00100'],
  У: ['00000', '10001', '10001', '01010', '00100', '00100', '01000', '10000'],
  // A hollow loop (not a filled diamond — the filled version read as a heart)
  // with the stem visible straight through its middle, like Φ.
  Ф: ['00000', '00100', '01110', '10101', '10101', '01110', '00100', '00100'],
  Х: ['00000', '10001', '10001', '01010', '00100', '01010', '10001', '10001'],
  // U-shaped body with the descender that's the whole point of the letter.
  Ц: ['00000', '10001', '10001', '10001', '10001', '10001', '11111', '00001'],
  Ч: ['00000', '10001', '10001', '10001', '01111', '00001', '00001', '00001'],
  // Three evenly-spaced legs on a full base. `'10101'` (5 chars) puts '1' at
  // columns 0/2/4 — three legs. The previous 7-wide `'1010101'` actually put
  // '1' at columns 0/2/4/6, four legs, not three (caught on screen).
  Ш: ['00000', '10101', '10101', '10101', '10101', '10101', '10101', '11111'],
  // Same three-leg body as Ш, one leg-row shorter to make room for Ц's
  // descender tail instead of a flat base.
  Щ: ['00000', '10101', '10101', '10101', '10101', '10101', '11111', '00011'],
  // Same stem-and-bowl body as Ь, with a small top hook distinguishing it.
  Ъ: ['00000', '11000', '01000', '01000', '01110', '01001', '01001', '01110'],
  // Wide — bowl and stem share their top and bottom rows so the two halves
  // read as one letter instead of "Ib".
  Ы: ['000000', '100001', '100001', '100001', '111101', '100101', '100101', '111101'],
  Ь: ['00000', '10000', '10000', '10000', '11110', '10001', '10001', '11110'],
  Э: ['00000', '11110', '00001', '00001', '00111', '00001', '00001', '11110'],
  // Wide — stem on the left, bowl on the right, joined through the middle row.
  Ю: ['0000000', '1001100', '1010010', '1010010', '1110010', '1010010', '1010010', '1001100'],
  Я: ['00000', '01111', '10001', '10001', '01111', '00101', '01001', '10001'],
};

/** Fallback advance width for a codepoint with no glyph — the width most letters actually use. */
export function glyphWidth(ch: string): number {
  const rows = GLYPHS[ch];
  return rows ? rows[rows.length - 1]!.length : 5;
}
