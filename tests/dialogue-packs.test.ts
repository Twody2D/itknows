import { describe, expect, it } from 'vitest';
import { PACKS } from '@/data/dialogues';
import { FAKE_EXIT_LINES_FOR_TEST } from '@/data/dialogues/fakeExit';

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
