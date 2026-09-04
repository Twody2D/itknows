import { describe, expect, it } from 'vitest';
import { PACKS } from '@/data/dialogues';

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
