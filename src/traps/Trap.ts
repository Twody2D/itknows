import { assertHonestTiming, DEFAULT_TRAP_TIMING } from './TrapTiming';
import type { TrapTiming } from './TrapTiming';
import { EventBus } from '@/core/EventBus';

export type TrapPhase = 'idle' | 'warning' | 'active' | 'cooldown';

const PHASE_ORDER: readonly TrapPhase[] = ['idle', 'warning', 'active', 'cooldown'];

export interface TrapOptions {
  timing?: TrapTiming | undefined;
  /** Loops idle→warning→active→cooldown→idle forever (default) or waits for trigger() once per cycle. */
  loop?: boolean | undefined;
  /**
   * Extra idle time before this trap's FIRST warning, in ms — what makes two
   * traps of the same period run out of step with each other instead of
   * firing as one (sector 03's piston rows, sector 07's launch windows).
   *
   * It lives here and not in each subclass because it used to live in each
   * subclass: four identical copies of the same five lines, and the fifth
   * trap to take an `initialIdleMs` in its config — `LaunchPadTrap` — simply
   * forgot to write them. The field was declared, the level data was passed
   * through `Level.ts`, `docs/level-editing.md` described it, and it did
   * nothing at all. A shared rule implemented per class is a rule that is
   * one new class away from being false.
   */
  initialIdleMs?: number | undefined;
}

/**
 * Shared phase-cycle lifecycle for traps that must telegraph before killing
 * (CLAUDE.md #4.2/#4.5). Not every trap type extends this — ones with no
 * timed state (static spikes, a pursuer, a moving platform) don't need it —
 * but every trap that turns lethal on a timer does, so the honesty rule is
 * enforced in exactly one place instead of thirteen times.
 */
export abstract class Trap {
  readonly type: string;
  readonly id: string;

  protected timing: TrapTiming;
  protected phase: TrapPhase = 'idle';
  protected phaseElapsedMs = 0;
  private readonly loop: boolean;
  private armed: boolean;
  private initialIdleRemainingMs: number;

  constructor(type: string, id: string, options: TrapOptions = {}) {
    this.type = type;
    this.id = id;
    this.timing = options.timing ?? DEFAULT_TRAP_TIMING;
    assertHonestTiming(this.timing, `${type}:${id}`);
    this.loop = options.loop ?? true;
    this.armed = this.loop;
    this.initialIdleRemainingMs = options.initialIdleMs ?? 0;
    this.onEnterPhase('idle');
  }

  /** For loop:false traps — starts one warning→active→cooldown cycle. */
  trigger(): void {
    if (this.armed) return;
    this.armed = true;
    this.phaseElapsedMs = 0;
    this.setPhase('warning');
  }

  update(time: number, delta: number): void {
    if (!this.armed) return;

    // Held in `idle`, not merely behind schedule: the trap stays visually
    // dormant and nothing animates, which is what the four classes that used
    // to do this themselves did too (they returned before their own
    // `onUpdatePhase`).
    //
    // The frame that ends the wait carries only its OVERSHOOT into the
    // cycle. The copies this replaces threw the whole frame in, so an offset
    // that landed on a frame boundary came up to one frame early — harmless
    // on its own, and exactly the kind of small lie that stops two traps
    // meant to be half a second apart from being half a second apart.
    let step = delta;
    if (this.initialIdleRemainingMs > 0) {
      this.initialIdleRemainingMs -= delta;
      if (this.initialIdleRemainingMs > 0) return;
      step = -this.initialIdleRemainingMs;
      this.initialIdleRemainingMs = 0;
    }

    this.phaseElapsedMs += step;
    const duration = this.durationOf(this.phase);

    if (this.phaseElapsedMs >= duration) {
      this.phaseElapsedMs -= duration;
      this.advancePhase();
    }

    this.onUpdatePhase(this.phase, this.phaseElapsedMs, time);
  }

  /** True while this trap can actually kill on contact right now. */
  isLethal(): boolean {
    return this.armed && this.phase === 'active';
  }

  getPhase(): TrapPhase {
    return this.phase;
  }

  private durationOf(phase: TrapPhase): number {
    switch (phase) {
      case 'idle':
        return this.timing.idleMs;
      case 'warning':
        return this.timing.warningMs;
      case 'active':
        return this.timing.activeMs;
      case 'cooldown':
        return this.timing.cooldownMs;
    }
  }

  private advancePhase(): void {
    const currentIndex = PHASE_ORDER.indexOf(this.phase);
    const next = PHASE_ORDER[(currentIndex + 1) % PHASE_ORDER.length] as TrapPhase;

    if (next === 'idle' && !this.loop) {
      this.armed = false;
    }

    this.setPhase(next);
  }

  private setPhase(phase: TrapPhase): void {
    this.phase = phase;
    // Only the telegraph/lethal edges are interesting telemetry (BehaviorTracker
    // reaction-time measurement) — idle/cooldown are non-events for the player.
    if (phase === 'warning') EventBus.emit('trap:armed', { trapId: this.id });
    if (phase === 'active') EventBus.emit('trap:triggered', { trapId: this.id });
    this.onEnterPhase(phase);
  }

  /** Subclasses update visuals/hitboxes here on every phase transition. */
  protected abstract onEnterPhase(phase: TrapPhase): void;

  /** Optional per-frame hook within the current phase (e.g. beam flicker). */
  protected onUpdatePhase(_phase: TrapPhase, _elapsedMs: number, _time: number): void {
    // Default: nothing. Override for continuous per-frame visual effects.
  }

  abstract destroy(): void;
}
