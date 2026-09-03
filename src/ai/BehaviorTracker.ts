import { EventBus } from '@/core/EventBus';
import type { AttemptSummary } from './PlayerProfile';

/** Pending warnings older than this were never reacted to — drop them, don't count them. */
const REACTION_TIMEOUT_MS = 2000;

export interface InputSample {
  left: boolean;
  right: boolean;
}

/**
 * Collects raw telemetry for exactly one attempt (one `GameplayScene`
 * lifetime — CLAUDE.md #4.1, this only ever informs the *next* attempt).
 * `GameplayScene` feeds it per-frame input via `sample()` and hands the
 * result to `PlayerProfile.integrate()` when the attempt ends.
 *
 * Reaction time is measured from a telegraphed trap's `trap:armed` event
 * (only `LaserTrap`/`ElectricFloorTrap`/`TimingGate` emit it — the traps
 * with an honest warning phase, see `Trap.ts`) to the player's next jump or
 * directional key-press edge — whichever reactive input comes first. Only
 * `LaserTrap`/`ElectricFloorTrap`/`TimingGate` traps are close enough to a
 * warning-driven "the player noticed and did something" signal to measure
 * this way; a stale warning (nothing reacted within `REACTION_TIMEOUT_MS`)
 * is dropped rather than recorded as a very slow reaction.
 *
 * `riskEncounters`/`riskSurvived` approximate "склонность к риску" (§68
 * riskLevel) as: how many `trap:triggered` (a hazard actually going live)
 * happened near the player this attempt, and how many of those they walked
 * away from. If the attempt ended in a `trap` death, one encounter is
 * charged as *not* survived (the one that got them) — an approximation,
 * not a precise per-trap correlation, since `Player.kill()` doesn't carry
 * which trap did it. Documented here the same way `LevelValidator`
 * documents its own scope limit.
 */
export class BehaviorTracker {
  private jumps = 0;
  private activeMs = 0;
  private leftMs = 0;
  private rightMs = 0;
  private hesitationMs = 0;
  private hasFirstInput = false;
  private reactionSamplesMs: number[] = [];
  private pendingWarnings = new Map<string, number>();
  private riskEncounters = 0;
  private currentTimeMs = 0;
  private wasLeft = false;
  private wasRight = false;

  constructor() {
    EventBus.on('player:jumped', this.onJumped, this);
    EventBus.on('trap:armed', this.onTrapArmed, this);
    EventBus.on('trap:triggered', this.onTrapTriggered, this);
  }

  destroy(): void {
    EventBus.off('player:jumped', this.onJumped, this);
    EventBus.off('trap:armed', this.onTrapArmed, this);
    EventBus.off('trap:triggered', this.onTrapTriggered, this);
  }

  /** Freezes once the player gives their first input — safe to poll every frame for the hesitation comment trigger. */
  get hesitationSoFarMs(): number {
    return this.hesitationMs;
  }

  sample(time: number, delta: number, input: InputSample, alive: boolean): void {
    this.currentTimeMs = time;
    if (!alive) return;

    if (!this.hasFirstInput) {
      if (input.left || input.right) {
        this.hasFirstInput = true;
      } else {
        this.hesitationMs += delta;
      }
    }

    this.activeMs += delta;
    if (input.left && !input.right) this.leftMs += delta;
    else if (input.right && !input.left) this.rightMs += delta;

    if ((input.left && !this.wasLeft) || (input.right && !this.wasRight)) {
      this.resolveOldestReaction();
    }
    this.wasLeft = input.left;
    this.wasRight = input.right;

    for (const [trapId, armedAt] of this.pendingWarnings) {
      if (time - armedAt > REACTION_TIMEOUT_MS) this.pendingWarnings.delete(trapId);
    }
  }

  finish(cause: 'spike' | 'trap' | 'fall' | null, cleared: boolean): AttemptSummary {
    const riskSurvived = cause === 'trap' ? Math.max(0, this.riskEncounters - 1) : this.riskEncounters;
    return {
      jumps: this.jumps,
      activeMs: this.activeMs,
      leftMs: this.leftMs,
      rightMs: this.rightMs,
      hesitationMs: this.hesitationMs,
      reactionSamplesMs: this.reactionSamplesMs,
      riskEncounters: this.riskEncounters,
      riskSurvived,
      cause,
      cleared,
    };
  }

  private onJumped = (): void => {
    this.jumps += 1;
    this.hasFirstInput = true;
    this.resolveOldestReaction();
  };

  private onTrapArmed = (payload: { trapId: string }): void => {
    if (!this.pendingWarnings.has(payload.trapId)) {
      this.pendingWarnings.set(payload.trapId, this.currentTimeMs);
    }
  };

  private onTrapTriggered = (): void => {
    this.riskEncounters += 1;
  };

  private resolveOldestReaction(): void {
    if (this.pendingWarnings.size === 0) return;
    let oldestId: string | null = null;
    let oldestAt = Infinity;
    for (const [id, at] of this.pendingWarnings) {
      if (at < oldestAt) {
        oldestAt = at;
        oldestId = id;
      }
    }
    if (oldestId === null) return;
    this.pendingWarnings.delete(oldestId);
    this.reactionSamplesMs.push(this.currentTimeMs - oldestAt);
  }
}
