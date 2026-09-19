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

function probe(yHidden: number, yLethal: number) {
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

const CEILING = { hidden: 140, lethal: 170 };
const FLOOR = { hidden: 230, lethal: 210 };

describe('spike bank: movement and lethality never come apart', () => {
  for (const [label, { hidden, lethal }] of [
    ['ceiling bank', CEILING],
    ['floor bank', FLOOR],
  ] as const) {
    describe(label, () => {
      it('never moves while it cannot kill', () => {
        const { run } = probe(hidden, lethal);
        const { tweens, lethalWhenTweened } = run(CYCLE_MS * 2);
        expect(tweens.length).toBeGreaterThan(0);
        expect(lethalWhenTweened.every(Boolean)).toBe(true);
        for (const t of tweens) expect(t.y).toBe(lethal);
      });

      it('shows a still, visible telegraph for the whole warning', () => {
        const { run } = probe(hidden, lethal);
        const warning = run(CYCLE_MS).samples.filter((s2) => s2.phase === 'warning');
        expect(warning.length).toBeGreaterThan(0);
        expect(warning.every((s2) => s2.lethal)).toBe(false);
        expect(warning.every((s2) => s2.alpha === 1)).toBe(true);
        // One position for all of it, and not the resting one: a floor bank
        // rests a row under the ground, so resting position alone shows
        // nothing at all.
        expect(new Set(warning.map((s2) => s2.y)).size).toBe(1);
        const y = warning[0]!.y;
        expect(y).not.toBe(hidden);
        expect(Math.abs(y - hidden)).toBeLessThanOrEqual(5);
        // Peeking toward where it will strike, never away from it.
        expect(Math.sign(y - hidden)).toBe(Math.sign(lethal - hidden));
      });

      it('is out of sight whenever it is out of the way', () => {
        const { run } = probe(hidden, lethal);
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
    expect(probe(CEILING.hidden, CEILING.lethal).trap.gameObject.flipY).toBe(true);
    expect(probe(FLOOR.hidden, FLOOR.lethal).trap.gameObject.flipY).toBe(false);
  });
});
