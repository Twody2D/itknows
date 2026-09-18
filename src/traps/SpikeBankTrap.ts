import Phaser from 'phaser';
import { Trap } from './Trap';
import type { TrapPhase } from './Trap';
import type { TrapTiming } from './TrapTiming';

export interface SpikeBankConfig {
  id: string;
  x: number;
  /** World Y of the retracted/idle position — either side of `yLethal`. */
  yHidden: number;
  /** World Y it reaches at `active` — where it's actually lethal. */
  yLethal: number;
  timing?: TrapTiming | undefined;
  initialIdleMs?: number | undefined;
  loop?: boolean | undefined;
}

/**
 * One column of `spike-bank` (see `TrapDef.ts` for the full reasoning) — a
 * single tile-wide instance; `width > 1` in the level data spawns several of
 * these side by side, each independently timed but sharing the same config,
 * so they stay in lockstep the same way `disappearing-platform`/
 * `falling-platform` already do for their own `width`.
 *
 * Hidden at `idle` and visible from the first frame of `warning`, when it
 * starts rising — the whole rise is the telegraph, and `isLethal()` is
 * false for all of it. It differs from `AmbushSpikeTrap` in what it is for
 * rather than in what it shows: this loops on its own timer by default and
 * is ordinary reusable content, where the ambush spike is a one-shot
 * narrative device fired by a trigger.
 */
export class SpikeBankTrap extends Trap {
  readonly gameObject: Phaser.Physics.Arcade.Sprite;

  private readonly scene: Phaser.Scene;
  private readonly x: number;
  private readonly yHidden: number;
  private readonly yLethal: number;
  private idleElapsedOverride = 0;
  private moveTween: Phaser.Tweens.Tween | null = null;

  constructor(scene: Phaser.Scene, config: SpikeBankConfig) {
    super('spike-bank', config.id, { timing: config.timing, loop: config.loop });
    this.scene = scene;
    this.x = config.x;
    this.yHidden = config.yHidden;
    this.yLethal = config.yLethal;
    this.idleElapsedOverride = config.initialIdleMs ?? 0;

    this.gameObject = scene.physics.add.sprite(config.x, config.yHidden, 'tile-spike');
    // `tile-spike` is drawn tips-up, for punching up out of a floor. A bank
    // whose hidden position is ABOVE its lethal one (`yHidden < yLethal`)
    // hangs from a ceiling and punches down instead — flip it once, at
    // construction, so the tips point at the player it threatens rather
    // than away from them ("шипы сверху переверни текстуру, чтобы они
    // смотрели вниз", owner). A floor bank (`yHidden > yLethal`) is
    // untouched.
    if (this.yHidden < this.yLethal) this.gameObject.setFlipY(true);
    const body = this.gameObject.body as Phaser.Physics.Arcade.Body;
    body.setAllowGravity(false);
    body.setImmovable(true);
    body.setSize(6, 4);
    body.setOffset(2, 6);

    this.onEnterPhase('idle');
  }

  protected onEnterPhase(phase: TrapPhase): void {
    if (!this.gameObject) return; // guard: base constructor calls this before field assignment
    this.moveTween?.stop();
    this.moveTween = null;
    switch (phase) {
      case 'idle':
        // Fully hidden, not dimly visible. It used to idle at alpha 0.35 as
        // a standing tell; the owner asked for it gone after playing
        // ("шипы, которые под землёй, заранее не были видны"). The honest
        // warning is the `warning` phase below — the bank rises into view
        // over `warningMs` and only `active` can kill, so what is
        // telegraphed is the lethal state, which is what CLAUDE.md #4.2
        // actually requires.
        this.gameObject.setPosition(this.x, this.yHidden);
        this.gameObject.setAlpha(0);
        break;
      case 'warning':
        // IT SITS, THEN PUNCHES. Visible for the whole of `warningMs` — the
        // telegraph is untouched and still the full window — but `Quint.easeIn`
        // spends the first three quarters of it barely clearing the floor and
        // the last quarter covering most of the rise, so the spikes snap up
        // instead of gliding ("шипы, движущиеся из земли, должны двигаться
        // быстрее" — owner). A linear rise made a lethal thing look like it
        // was being winched.
        this.moveTween = this.scene.tweens.add({
          targets: this.gameObject,
          y: this.yLethal,
          alpha: { from: 1, to: 1 },
          duration: this.timing.warningMs,
          ease: 'Quint.easeIn',
        });
        break;
      case 'active':
        // The tween above should already have arrived — snapping removes
        // any float drift between the phase clock and the tween's own.
        this.gameObject.setPosition(this.x, this.yLethal);
        this.gameObject.setAlpha(1);
        break;
      case 'cooldown':
        // All the way back to invisible, matching `idle` — a bank left at
        // alpha 0.35 was the standing tell the owner asked to have removed,
        // and it reappeared here on every retraction.
        this.moveTween = this.scene.tweens.add({
          targets: this.gameObject,
          y: this.yHidden,
          alpha: 0,
          duration: this.timing.cooldownMs,
          ease: 'Sine.easeOut',
        });
        break;
    }
  }

  override update(time: number, delta: number): void {
    if (this.idleElapsedOverride > 0) {
      this.idleElapsedOverride -= delta;
      if (this.idleElapsedOverride > 0) return;
    }
    super.update(time, delta);
  }

  destroy(): void {
    this.moveTween?.stop();
    this.gameObject.destroy();
  }
}
