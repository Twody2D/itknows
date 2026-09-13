import { describe, expect, it } from 'vitest';
import { validateLevel } from '@/gameplay/LevelValidator';
import { LEVEL_VARIANTS } from '@/data/levels/variants';
import { getLevel } from '@/gameplay/LevelFactory';

const flatVariants = Object.entries(LEVEL_VARIANTS).flatMap(([levelId, variants]) =>
  Object.entries(variants).map(([variantId, def]) => ({ levelId, variantId, def })),
);

describe.each(flatVariants)('validateLevel: $levelId ($variantId)', ({ def }) => {
  it('has a jump-reachable path from spawn to exit', () => {
    const result = validateLevel(def);
    expect(result.valid, result.reason).toBe(true);
  });
});

/**
 * Traps are addressed by id, never by index. They used to be read as
 * `traps[0]`, which quietly made every one of these tests a claim about
 * authoring order as well as behaviour — and broke the moment a level
 * gained an ambush at the front of its list.
 */
function trapById(def: ReturnType<typeof getLevel>, id: string): unknown {
  return def.traps?.find((trap) => trap.id === id);
}

describe('LevelFactory variant resolution', () => {
  it('returns the base level for an unknown variantId', () => {
    const level = getLevel('sector-03-level-01', 'nonexistent');
    expect(level.id).toBe('sector-03-level-01');
    expect(trapById(level, 'laser-01')).toMatchObject({ id: 'laser-01' });
  });

  it('returns the base level for "standard" or no variantId', () => {
    const base = getLevel('sector-03-level-01');
    expect(getLevel('sector-03-level-01', 'standard')).toBe(base);
  });

  it('resolves a real gentle variant that retunes the hazard without moving the level', () => {
    const base = getLevel('sector-03-level-01');
    const gentle = getLevel('sector-03-level-01', 'gentle');
    // A variant may only change how an already-present hazard behaves
    // (`variants.ts`) — so the timing differs and everything the solver
    // proved reachable stays byte-for-byte identical.
    expect(trapById(gentle, 'laser-01')).not.toEqual(trapById(base, 'laser-01'));
    expect(gentle.platforms).toEqual(base.platforms);
    expect(gentle.gaps).toEqual(base.gaps);
    expect(gentle.playerStartCol).toBe(base.playerStartCol);
    expect(gentle.exitCol).toBe(base.exitCol);
  });

  it('resolves a real bold variant for a level that has one', () => {
    const bold = getLevel('sector-03-level-01', 'bold');
    expect(trapById(bold, 'laser-01')).toMatchObject({ type: 'laser' });
  });

  it('falls back to the base level for a level with no variants at all', () => {
    const level = getLevel('sector-01-level-01', 'gentle');
    expect(level.id).toBe('sector-01-level-01');
  });
});

describe('variants change how fast a hazard moves, never whether it fires', () => {
  // A variant exists to make a level feel personal between attempts
  // (CLAUDE.md #4.1/#6). It may retune a speed, a period, a phase length —
  // anything the player can watch happening. It may NOT reach a property
  // that decides whether the hazard happens at all, because a trap that
  // visibly does not fire is indistinguishable from a broken one.
  //
  // DROP taught this the hard way: its `troll` held the first trapdoor for
  // 1300ms, which is the floor staying solid while the player runs across
  // the pit it was supposed to open. Reasoned as "strictly safer" when it
  // was written; reported by the owner as a bug the first time he met it.
  const SUPPRESSING_FIELDS = ['holdMs', 'armed', 'loop'] as const;

  for (const { levelId, variantId, def } of flatVariants) {
    if (variantId === 'standard') continue;
    it(`${levelId} (${variantId}) keeps every trap firing`, () => {
      const base = getLevel(levelId);
      for (const trap of def.traps ?? []) {
        const original = (base.traps ?? []).find((t) => t.id === trap.id);
        expect(original, `${trap.id} exists only in the variant`).toBeDefined();
        for (const field of SUPPRESSING_FIELDS) {
          expect(
            (trap as Record<string, unknown>)[field],
            `${levelId}/${variantId} retunes ${trap.id}.${field}, which decides whether the trap fires at all`,
          ).toEqual((original as Record<string, unknown>)[field]);
        }
      }
    });
  }
});
