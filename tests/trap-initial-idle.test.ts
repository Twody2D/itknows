import { describe, expect, it } from 'vitest';
import { Trap, type TrapPhase } from '@/traps/Trap';
import { DEFAULT_TRAP_TIMING } from '@/traps/TrapTiming';

/**
 * `initialIdleMs` — the offset that makes two traps of the same period run
 * out of step instead of firing as one. Sector 03 is built on it, and so is
 * every launch window where a pad has to throw the player through a gap in
 * something else's cycle.
 *
 * IT IS TESTED HERE BECAUSE IT WAS IMPLEMENTED FOUR TIMES AND FORGOTTEN THE
 * FIFTH. Laser, spike bank, spike wall and ambush spike each carried their
 * own copy of the same five lines; `LaunchPadTrap` declared the option in
 * its config, `Level.ts` passed the level's value into it, the owner's guide
 * documented it — and nothing consumed it, so a pad offset by half a second
 * fired exactly when an un-offset one did. The logic now lives in `Trap`,
 * where a new trap type inherits it rather than remembering it, and this is
 * the test that keeps it there.
 */
class ProbeTrap extends Trap {
  readonly entered: Array<{ phase: TrapPhase; atMs: number }> = [];
  private nowMs = 0;

  constructor(initialIdleMs?: number) {
    super('probe', `probe-${initialIdleMs ?? 0}`, { initialIdleMs });
  }

  /** Runs the trap forward in 10ms steps, the way the scene's update loop would. */
  run(totalMs: number): void {
    for (let i = 0; i < totalMs / 10; i++) {
      this.nowMs += 10;
      this.update(this.nowMs, 10);
    }
  }

  /** When the trap first became lethal, or `null` if it never did. */
  firstActiveAtMs(): number | null {
    return this.entered.find((e) => e.phase === 'active')?.atMs ?? null;
  }

  protected onEnterPhase(phase: TrapPhase): void {
    // The base constructor calls this before `nowMs` exists, hence the guard.
    this.entered?.push({ phase, atMs: this.nowMs ?? 0 });
  }

  destroy(): void {
    /* nothing to release */
  }
}

const { idleMs, warningMs, activeMs, cooldownMs } = DEFAULT_TRAP_TIMING;
const CYCLE = idleMs + warningMs + activeMs + cooldownMs;

describe('initialIdleMs, shared by every timed trap', () => {
  it('turns lethal one idle+warning after the level starts when it has no offset', () => {
    const trap = new ProbeTrap();
    trap.run(CYCLE * 2);
    expect(trap.firstActiveAtMs()).toBe(idleMs + warningMs);
  });

  it('delays the first warning by exactly the offset', () => {
    const trap = new ProbeTrap(700);
    trap.run(CYCLE * 2);
    expect(trap.firstActiveAtMs()).toBe(700 + idleMs + warningMs);
  });

  it('keeps two traps of the same period exactly that offset apart, forever', () => {
    const early = new ProbeTrap();
    const late = new ProbeTrap(500);
    early.run(CYCLE * 4);
    late.run(CYCLE * 4);

    const activeTimes = (t: ProbeTrap): number[] =>
      t.entered.filter((e) => e.phase === 'active').map((e) => e.atMs);

    const a = activeTimes(early);
    const b = activeTimes(late);
    expect(a.length).toBeGreaterThan(2);
    // The offset applies once and then never drifts — which is the whole
    // point: a window that exists on the first cycle has to exist on the
    // tenth, or the level is a different level each attempt (CLAUDE.md #4.1).
    for (let i = 0; i < Math.min(a.length, b.length); i++) {
      expect((b[i] as number) - (a[i] as number)).toBe(500);
    }
  });

  it('is genuinely idle while it waits, not merely late', () => {
    const trap = new ProbeTrap(600);
    trap.run(300);
    expect(trap.getPhase()).toBe('idle');
    expect(trap.isLethal()).toBe(false);
  });

  it('runs the ordinary cycle once the offset is spent', () => {
    const trap = new ProbeTrap(400);
    trap.run(400 + idleMs + warningMs + activeMs + cooldownMs + idleMs + warningMs);
    const actives = trap.entered.filter((e) => e.phase === 'active').map((e) => e.atMs);
    expect(actives).toHaveLength(2);
    expect((actives[1] as number) - (actives[0] as number)).toBe(CYCLE);
  });
});
