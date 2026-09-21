import { describe, expect, it } from 'vitest';
import { PACKS } from '@/data/dialogues';
import { FAKE_EXIT_LINES_FOR_TEST } from '@/data/dialogues/fakeExit';
import { PREMISE_MAX_CHARS, SECTOR_PREMISE, levelSelectComment, sectorPremise } from '@/data/dialogues/levelSelect';
import { LEVELS_PER_SECTOR, SECTOR_COUNT } from '@/gameplay/sectors';
import { LocaleState } from '@/i18n/Locale';

const CATEGORIES = [
  'early_death',
  'fall',
  'repeated_mistake',
  'near_exit',
  'long_hesitation',
  'successful_adaptation',
  'multiple_deaths',
  'general',
] as const;

describe('SYSTEM commentary packs', () => {
  for (const [packId, pool] of Object.entries(PACKS)) {
    describe(packId, () => {
      it('covers every comment category with at least one line', () => {
        for (const category of CATEGORIES) {
          expect(pool[category]?.length ?? 0).toBeGreaterThan(0);
        }
      });

      it('has no duplicate line ids within the pack', () => {
        const ids = CATEGORIES.flatMap((category) => pool[category].map((line) => line.id));
        expect(new Set(ids).size).toBe(ids.length);
      });

      it('every line has non-empty ru and en text', () => {
        for (const category of CATEGORIES) {
          for (const line of pool[category]) {
            expect(line.ru.length).toBeGreaterThan(0);
            expect(line.en.length).toBeGreaterThan(0);
          }
        }
      });
    });
  }
});

/**
 * The decoy door's lines sit outside `Commentator`'s cascade (nobody died,
 * so no death category applies) but carry more weight than flavour: the
 * trap moves the player across the level without killing them, and this
 * line is the only thing that names the door as the cause. A pool that
 * repeated itself, or was missing a language, would leave the player
 * reading a teleport as a bug.
 */
describe('SYSTEM fake-exit lines', () => {
  it('has enough lines for the shuffle bag to avoid immediate repeats', () => {
    expect(FAKE_EXIT_LINES_FOR_TEST.length).toBeGreaterThanOrEqual(3);
  });

  it('has unique line ids', () => {
    const ids = FAKE_EXIT_LINES_FOR_TEST.map((line) => line.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every line is localized in both languages', () => {
    for (const line of FAKE_EXIT_LINES_FOR_TEST) {
      expect(line.ru.length).toBeGreaterThan(0);
      expect(line.en.length).toBeGreaterThan(0);
    }
  });
});

describe('every sector says what it is, once, on the map', () => {
  // The finale was built as a retrospective — one level per sector, in the
  // order they were taught — and the owner played it and called it
  // «непонятный». The structure was real and entirely imperceptible: by
  // level fifty-five everything is familiar, so a citation the player cannot
  // name is just another corridor. Geometry says what to do, never why this
  // screen differs from the last fifty; SYSTEM says the second thing, and it
  // now says it on the map while the sector is still untouched.
  //
  // This test exists so a sector added later cannot silently arrive without
  // one and fall back to the generic line nobody would notice was generic.
  it('has a premise line for every sector, in both locales', () => {
    const missing: number[] = [];
    for (let sector = 1; sector <= SECTOR_COUNT; sector++) {
      LocaleState.current = 'ru';
      const ru = levelSelectComment(0, LEVELS_PER_SECTOR, sector);
      LocaleState.current = 'en';
      const en = levelSelectComment(0, LEVELS_PER_SECTOR, sector);
      LocaleState.current = 'ru';
      const generic = { ru: levelSelectComment(0, LEVELS_PER_SECTOR), en: '' };
      if (ru === generic.ru || ru.trim() === '' || en.trim() === '' || ru === en) missing.push(sector);
    }
    expect(missing, `sectors with no premise of their own: ${missing.join(', ')}`).toEqual([]);
  });

  it('stops saying it once the player has started the sector', () => {
    // A premise repeated is a premise nobody reads, and the map is read to
    // check progress far more often than to be told what a sector is.
    LocaleState.current = 'ru';
    const untouched = levelSelectComment(0, LEVELS_PER_SECTOR, 10);
    const started = levelSelectComment(1, LEVELS_PER_SECTOR, 10);
    expect(started).not.toBe(untouched);
    expect(started).toBe(levelSelectComment(1, LEVELS_PER_SECTOR));
  });
});

describe('a sector premise fits the column it is printed in', () => {
  // SYSTEM's panel on the level map is ~94 px wide and 86 px tall: six lines
  // of 10 px uppercase at the narrowest supported width. The first drafts of
  // sectors 07 and 10 ran to 72 and 99 characters and were measured live at
  // 105 px and 150 px of text inside a 90 px box — cut off mid-sentence at
  // 480 and spilling past the panel at the widest supported canvas.
  //
  // `LevelSelectScene` now derives both the size and the clamp from the room
  // available, so nothing can spill. That is the backstop, not the fix: a
  // clamp that fits shows the first half of a sentence, and the first half of
  // a premise is the setup. The fix is that the lines are short enough not to
  // need it, and this is what holds them there.
  it('keeps every line inside the authoring budget, in both locales', () => {
    const over: string[] = [];
    for (const [sector, line] of Object.entries(SECTOR_PREMISE)) {
      for (const locale of ['ru', 'en'] as const) {
        const text = line[locale];
        if (text.length > PREMISE_MAX_CHARS) over.push(`${sector}/${locale}: ${text.length} > ${PREMISE_MAX_CHARS}`);
      }
    }
    expect(over, over.join('; ')).toEqual([]);
  });

  it('fits the HUD line the campaign says it on, prefix included', () => {
    // THE BINDING CONSTRAINT, and the one the budget is derived from. The
    // campaign says the premise in `GameplayScene`'s SYSTEM pill, whose
    // `wordWrapWidth` is `width - 32` — 448 px at the narrowest supported
    // width — and which carries a constant 13-character prefix
    // (`SYSTEM v3.0: `). Measured live: 75 characters render 423 px.
    //
    // This is deliberately arithmetic on measured numbers rather than a
    // repeat of `PREMISE_MAX_CHARS`: if someone raises the budget, the two
    // assertions disagree and the one holding the pixels wins.
    const HUD_BOX_PX = 448;
    const PREFIX_CHARS = 'SYSTEM v3.0: '.length;
    const PX_PER_CHAR = 423 / 75;

    const over: string[] = [];
    for (const [sector, line] of Object.entries(SECTOR_PREMISE)) {
      for (const locale of ['ru', 'en'] as const) {
        const px = (PREFIX_CHARS + line[locale].length) * PX_PER_CHAR;
        if (px > HUD_BOX_PX) over.push(`${sector}/${locale}: ${Math.round(px)}px > ${HUD_BOX_PX}px`);
      }
    }
    expect(over, over.join('; ')).toEqual([]);
    expect((PREFIX_CHARS + PREMISE_MAX_CHARS) * PX_PER_CHAR).toBeLessThanOrEqual(HUD_BOX_PX);
  });

  it('has a premise for every sector in the campaign', () => {
    // The campaign path says it on the way in, so a missing one is a sector
    // that introduces itself with silence.
    for (let sector = 1; sector <= SECTOR_COUNT; sector++) {
      expect(sectorPremise(sector), `sector ${sector}`).not.toBeNull();
    }
    expect(sectorPremise(SECTOR_COUNT + 1)).toBeNull();
  });

  it('says something different for every sector', () => {
    const ru = Object.values(SECTOR_PREMISE).map((l) => l.ru);
    expect(new Set(ru).size).toBe(ru.length);
  });
});
