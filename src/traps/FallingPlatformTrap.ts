import Phaser from 'phaser';
import { PALETTE } from '@/config/palette';
import { MIN_WARNING_MS } from '@/config/physics';

export interface FallingPlatformConfig {
  id: string;
  x: number;
  y: number;
  /**
   * How long the platform keeps carrying the player while it sinks, before
   * collision drops out from under them — the telegraph. Contact starts the
   * sink immediately (no idle shake beforehand); this window is what makes
   * that honest (CLAUDE.md #4.2/#4.5 — `MIN_WARNING_MS`/`MIN_REACTION_WINDOW_MS`).
   */
  holdMs?: number | undefined;
  fallSpeed?: number | undefined;
  /** How long after falling before it respawns at its original spot. */
  respawnMs?: number | undefined;
  /**
   * Default (unset/false): the ordinary floor that sinks once it is stood
   * on — the player is already on top of it when it starts to go.
   *
   * `true`: an armed trapdoor instead. Standing on it does nothing; it
   * only goes when something else fires `trigger()` — in practice a
   * `trigger` zone placed a couple of columns *before* it, so the floor
   * drops out ahead of a running player rather than under a stationary
   * one. Direct request from the project owner: a floor that gives way
   * slowly underfoot can simply be outrun, so it never actually asks for
   * anything; this one springs, and doing nothing about it means falling.
   */
  armed?: boolean | undefined;
  /**
   * Armed mode only: how long the floor visibly shakes and flashes red
   * after being triggered, before it stops holding anything. Floored at
   * `MIN_WARNING_MS` (CLAUDE.md #4.2) — the flash is the whole telegraph,
   * so it is never allowed to be shorter than the honesty invariant.
   */
  warnMs?: number | undefined;
}

type State = 'armed' | 'warning' | 'solid' | 'falling' | 'gone';

/**
 * Two floors in one trap, selected by `armed`.
 *
 * Unarmed (the original): solid ground until the player steps on it, then
 * it immediately starts sinking under them, still carrying them for
 * `holdMs` before collision drops out.
 *
 * Armed: a trapdoor that ignores being stood on and springs when its
 * `trigger` zone fires — placed a column or two earlier, so the floor
 * ahead of a running player flashes red, shakes for `warnMs`, and then is
 * not there. Both respawn at their original position after a delay.
 */
export class FallingPlatformTrap {
  readonly type = 'falling-platform';
  readonly id: string;
  readonly gameObject: Phaser.Physics.Arcade.Sprite;
  private readonly body: Phaser.Physics.Arcade.Body;

  private state: State;
  private timerMs = 0;
  private readonly originX: number;
  private readonly originY: number;
  private readonly holdMs: number;
  private readonly fallSpeed: number;
  private readonly respawnMs: number;
  private readonly armed: boolean;
  private readonly warnMs: number;

  constructor(scene: Phaser.Scene, config: FallingPlatformConfig) {
    this.id = config.id;
    this.originX = config.x;
    this.originY = config.y;
    this.armed = config.armed ?? false;
    // AN ARMED TRAPDOOR TAKES THE PLAYER WITH IT, and these two numbers are
    // what make that happen rather than a near miss. Dropping collision the
    // instant it springs does not work: a running player covers the last
    // columns of the floor in ~100ms, free fall moves them barely 5px in
    // that time, and they step off the far edge having visibly wobbled and
    // survived (measured live — the trap fired correctly and killed
    // nobody). A fast sinking floor does not work either; it simply leaves
    // from under them, which is the same thing.
    //
    // So it sinks *slower* than gravity would take them: 100px/s keeps the
    // player standing on it, riding it down, for the whole 520ms. By the
    // end they are 52px below the lip of the pit — past a 34.7px jump, so
    // there is no way back out — and the floor stops holding. Jumping off
    // early still works for most of the ride, which is the skill the trap
    // rewards on the attempts after the first one.
    this.holdMs = config.holdMs ?? (this.armed ? 520 : 320);
    this.fallSpeed = config.fallSpeed ?? (this.armed ? 100 : 180);
    this.respawnMs = config.respawnMs ?? 2000;
    this.warnMs = Math.max(config.warnMs ?? 350, MIN_WARNING_MS);
    this.state = this.armed ? 'armed' : 'solid';

    this.gameObject = scene.physics.add.sprite(config.x, config.y, 'tile-ground');
    this.body = this.gameObject.body as Phaser.Physics.Arcade.Body;
    this.body.setAllowGravity(false);
    this.body.setImmovable(true);
  }

  notifyStandingOn(): void {
    // An armed trapdoor ignores being stood on entirely — that is the
    // point of it. It waits for its trigger.
    if (this.state !== 'solid') return;
    this.state = 'falling';
    this.timerMs = 0;
    this.body.setVelocityY(this.fallSpeed);
  }

  /** `Triggerable` — fired by a `trigger` zone placed ahead of this floor. */
  trigger(): void {
    if (this.state !== 'armed') return;
    this.state = 'warning';
    this.timerMs = 0;
  }

  isSolid(): boolean {
    if (this.state === 'armed' || this.state === 'solid' || this.state === 'warning') return true;
    if (this.state === 'falling') return this.timerMs < this.holdMs;
    return false;
  }

  update(_time: number, delta: number): void {
    if (this.state === 'solid' || this.state === 'armed') return;

    this.timerMs += delta;

    if (this.state === 'warning') {
      // Shaking hard and flashing red, still carrying whatever is on it.
      // Everything the player needs in order to jump is on screen for the
      // whole of `warnMs` before the floor stops holding.
      this.gameObject.x = this.originX + Math.sin(this.timerMs * 0.05) * 1.5;
      this.gameObject.setTint(Math.floor(this.timerMs / 80) % 2 === 0 ? PALETTE.danger : PALETTE.dangerAlt);
      if (this.timerMs >= this.warnMs) {
        this.state = 'falling';
        this.timerMs = 0;
        this.gameObject.clearTint();
        this.body.setVelocityY(this.fallSpeed);
      }
      return;
    }

    if (this.state === 'falling') {
      const wobble = Math.sin(this.timerMs * 0.08) * 1.2;
      this.gameObject.x = this.originX + wobble;
      if (this.gameObject.y - this.originY > 200) {
        this.state = 'gone';
        this.timerMs = 0;
        this.gameObject.setVisible(false);
        this.body.setVelocityY(0);
      }
      return;
    }

    if (this.state === 'gone' && this.timerMs >= this.respawnMs) {
      // Back to whichever resting state this platform has. An armed one
      // returns to `armed`, though its `TriggerTrap` only ever fires once
      // per attempt (`TriggerTrap.fire`) — so respawning is what keeps the
      // level walkable after the trap has sprung, not a second ambush.
      this.state = this.armed ? 'armed' : 'solid';
      this.timerMs = 0;
      this.gameObject.setPosition(this.originX, this.originY);
      this.gameObject.setVisible(true);
    }
  }

  destroy(): void {
    this.gameObject.destroy();
  }
}
