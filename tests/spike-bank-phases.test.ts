import { describe, expect, it } from 'vitest';
import { SpikeBankTrap } from '@/traps/SpikeBankTrap';
import type { TrapPhase } from '@/traps/Trap';

/**
 * THE ONE INVARIANT A SPIKE BANK HAS: nothing that moves is harmless, and
 * nothing harmless is in the way.
 *
 * It was broken from the day the trap was written and only found by playing:
 * the bank travelled its whole distance inside `warning`, on `Quint.easeIn`,
 * so the last quarter of the telegraph slammed it across the corridor while
 * `isLethal()` was still false — and then `cooldown` walked it back out over
 * another 400 ms, equally harmless. On HOLD FIRE, where the bank hangs
 * directly over a launch pad, that is a spike visibly crossing the lane the
 * player is flying up and passing straight through them ("я как будто
 * пролетел через край шипов сверху и не умер", owner, 2026-09-19).
 *
 * Neither the phase clock nor any level number was wrong, which is why no
 * test caught it: the bug lived entirely in which phase owned the movement.
 * So that is what this asserts — position against phase, not timing.
 */
type Sprite = {
  x: number;
  y: number;
  alpha: number;
  flipY: boolean;
  setFlipY(v: boolean): Sprite;
  setPosition(x: number, y: number): Sprite;
  setAlpha(a: number): Sprite;
  body: unknown;
  destroy(): void;
};

interface TweenCall {
  y: number;
  duration: number;
}

function probe(yHidden: number, yLethal: number, yPeek?: number) {
  const sprite: Sprite = {
    x: 0,
    y: 0,
    alpha: 0,
    flipY: false,
    setFlipY(v) {
      this.flipY = v;
      return this;
    },
    setPosition(x, y) {
      this.x = x;
      this.y = y;
      return this;
    },
    setAlpha(a) {
      this.alpha = a;
      return this;
    },
    body: {
      setAllowGravity: () => undefined,
      setImmovable: () => undefined,
      setSize: () => undefined,
      setOffset: () => undefined,
    },
    destroy: () => undefined,
  };
  const tweens: TweenCall[] = [];
  let lethalWhenTweened: boolean[] = [];
  const scene = {
    physics: { add: { sprite: () => sprite } },
    tweens: {
      add: (cfg: { y: number; duration: number }) => {
        tweens.push({ y: cfg.y, duration: cfg.duration });
        lethalWhenTweened.push(trap.isLethal());
        return { stop: () => undefined };
      },
    },
  } as unknown as Phaser.Scene;

  const trap = new SpikeBankTrap(scene, {
    id: 'probe',
    x: 100,
    yHidden,
    yLethal,
    yPeek,
    timing: { idleMs: 500, warningMs: 900, activeMs: 1200, cooldownMs: 400 },
  });

  /**
   * Steps the trap the way the scene's update loop does, sampling position
   * and lethality every frame. Reading the phase machine rather than poking
   * `onEnterPhase` is the point: the bug was in which phase owned the
   * movement, so a probe that sets the phase itself would have passed.
   */
  const samples: Array<{ phase: TrapPhase; y: number; alpha: number; lethal: boolean }> = [];
  const run = (totalMs: number) => {
    tweens.length = 0;
    lethalWhenTweened = [];
    samples.length = 0;
    for (let ms = 0; ms <= totalMs; ms += 10) {
      trap.update(ms, 10);
      samples.push({ phase: trap.getPhase(), y: sprite.y, alpha: sprite.alpha, lethal: trap.isLethal() });
    }
    return { samples: [...samples], tweens: [...tweens], lethalWhenTweened: [...lethalWhenTweened] };
  };
  return { trap, run, peekY: sprite.y };
}

/** One full cycle of the probe timing, with room to spare. */
const CYCLE_MS = 500 + 900 + 1200 + 400 + 100;

/**
 * A bank hanging in open air: it is readable where it rests, so the peek is
 * the resting position and the telegraph is the sprite simply appearing.
 */
const CEILING = { hidden: 140, lethal: 170, peek: 140 };
/**
 * A bank buried under the floor, with the peek `gameplay/spikeBankPeek.ts`
 * computes for `hiddenRow: 23` against a `groundRow` of 22 — see
 * `tests/spike-bank-peek.test.ts` for why the resting position alone shows
 * the player nothing.
 */
const FLOOR = { hidden: 235, lethal: 215, peek: 219 };

describe('spike bank: movement and lethality never come apart', () => {
  for (const [label, { hidden, lethal, peek }] of [
    ['ceiling bank', CEILING],
    ['floor bank', FLOOR],
  ] as const) {
    describe(label, () => {
      it('never moves while it cannot kill', () => {
        const { run } = probe(hidden, lethal, peek);
        const { tweens, lethalWhenTweened } = run(CYCLE_MS * 2);
        expect(tweens.length).toBeGreaterThan(0);
        expect(lethalWhenTweened.every(Boolean)).toBe(true);
        for (const t of tweens) expect(t.y).toBe(lethal);
      });

      it('shows a still, visible telegraph for the whole warning', () => {
        const { run } = probe(hidden, lethal, peek);
        const warning = run(CYCLE_MS).samples.filter((s2) => s2.phase === 'warning');
        expect(warning.length).toBeGreaterThan(0);
        expect(warning.every((s2) => s2.lethal)).toBe(false);
        expect(warning.every((s2) => s2.alpha === 1)).toBe(true);
        // ONE POSITION FOR ALL OF IT, AND THE ONE IT WAS GIVEN. This used to
        // assert `y !== hidden` and `|y - hidden| <= 5`, which is the shape
        // the first fix happened to have rather than anything the player can
        // see: four pixels out of a resting row that is itself twelve pixels
        // under the floor still shows nothing above the floor. The number
        // now comes from `gameplay/spikeBankPeek.ts`, which is held to the
        // surface line by `tests/spike-bank-peek.test.ts`; what belongs here
        // is that the trap holds it, still, for the whole warning.
        expect(new Set(warning.map((s2) => s2.y)).size).toBe(1);
        expect(warning[0]!.y).toBe(peek);
        // Never past the strike position, and never away from it.
        expect(Math.sign(lethal - peek)).toBe(Math.sign(lethal - hidden));
      });

      it('is out of sight whenever it is out of the way', () => {
        const { run } = probe(hidden, lethal, peek);
        const off = run(CYCLE_MS * 2).samples.filter(
          (s2) => s2.phase === 'idle' || s2.phase === 'cooldown',
        );
        expect(off.length).toBeGreaterThan(0);
        expect(off.every((s2) => s2.alpha === 0)).toBe(true);
        expect(off.every((s2) => s2.y === hidden)).toBe(true);
        expect(off.every((s2) => !s2.lethal)).toBe(true);
      });
    });
  }

  it('points its tips at the player it threatens', () => {
    expect(probe(CEILING.hidden, CEILING.lethal, CEILING.peek).trap.gameObject.flipY).toBe(true);
    expect(probe(FLOOR.hidden, FLOOR.lethal, FLOOR.peek).trap.gameObject.flipY).toBe(false);
  });
});
