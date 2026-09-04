import Phaser from 'phaser';
import { Trap } from './Trap';
import type { TrapPhase } from './Trap';
import type { TrapTiming } from './TrapTiming';

export interface AmbushSpikeConfig {
  id: string;
  x: number;
  /** World Y of the hidden, idle position (above the screen/ceiling). */
  yHidden: number;
  /** World Y it drops to — where it's actually lethal. */
  yLanded: number;
  timing?: TrapTiming | undefined;
  initialIdleMs?: number | undefined;
  loop?: boolean | undefined;
}

/**
 * The ambush variant of `moving-spike` (`TrapDef.ts`'s `ambush: true`) —
 * invisible while idle, then drops fast and becomes visible at the same
 * moment, landing lethal. Unlike the ordinary `MovingSpikeTrap` (a bare
 * tween with no phase concept, always lethal, always visible — its
 * continuous motion IS the telegraph), this reuses `Trap`'s honest
 * idle→warning→active→cooldown cycle so "invisible until it drops" still
 * satisfies CLAUDE.md #4.2: the *entire* visible fall (`warningMs`, ≥
 * `MIN_WARNING_MS`) happens before `isLethal()` ever turns true — lethality
 * only starts once `active` begins, which `onEnterPhase` times to land
 * exactly when the drop tween finishes. The fall looking sudden is a
 * `Cubic.easeIn` tween, not a shorter warning than anything else in the
 * game gets.
 *
 * Visibility never depends on `FxManager`'s warning-pulse (that's optional,
 * degradable FX, CLAUDE.md #9) — `onEnterPhase` sets `alpha` itself for
 * every phase, so the hazard is honestly visible even with FX fully
 * disabled.
 */
export class AmbushSpikeTrap extends Trap {
  readonly gameObject: Phaser.Physics.Arcade.Sprite;

  // Captured directly rather than read back via `this.gameObject.scene` —
  // Phaser nulls a GameObject's own `.scene` as part of scene
  // shutdown/destroy, which happens *before* `GameplayScene`'s own trap
  // cleanup loop runs `destroy()` on every trap; reading it back at that
  // point threw ("Cannot read properties of undefined (reading 'tweens')"),
  // caught live via headless-browser testing across repeated scene
  // restarts. `MovingSpikeTrap` sidesteps the same trap by stopping its own
  // stored tween reference instead of asking the scene to kill it — same
  // fix here, generalized to also cover the constructor-time scene handle.
  private readonly scene: Phaser.Scene;
  private readonly x: number;
  private readonly yHidden: number;
  private readonly yLanded: number;
  private idleElapsedOverride = 0;
  private fallTween: Phaser.Tweens.Tween | null = null;

  constructor(scene: Phaser.Scene, config: AmbushSpikeConfig) {
    super('moving-spike', config.id, { timing: config.timing, loop: config.loop });
    this.scene = scene;
    this.x = config.x;
    this.yHidden = config.yHidden;
    this.yLanded = config.yLanded;
    this.idleElapsedOverride = config.initialIdleMs ?? 0;

    this.gameObject = scene.physics.add.sprite(config.x, config.yHidden, 'tile-spike');
    const body = this.gameObject.body as Phaser.Physics.Arcade.Body;
    body.setAllowGravity(false);
    body.setImmovable(true);
    body.setSize(6, 4);
    body.setOffset(2, 6);

    this.onEnterPhase('idle');
  }

  protected onEnterPhase(phase: TrapPhase): void {
    if (!this.gameObject) return; // guard: base constructor calls this before field assignment
    this.fallTween?.stop();
    this.fallTween = null;
    switch (phase) {
      case 'idle':
        this.gameObject.setPosition(this.x, this.yHidden);
        this.gameObject.setAlpha(0);
        break;
      case 'warning':
        this.gameObject.setAlpha(1);
        this.fallTween = this.scene.tweens.add({
          targets: this.gameObject,
          y: this.yLanded,
          duration: this.timing.warningMs,
          ease: 'Cubic.easeIn',
        });
        break;
      case 'active':
        // Snap exactly onto the landed position — the tween above should
        // already have arrived, but the phase timer and the tween aren't
        // literally the same clock, so this removes any float drift.
        this.gameObject.setPosition(this.x, this.yLanded);
        this.gameObject.setAlpha(1);
        break;
      case 'cooldown':
        // Retracts out of sight immediately rather than visibly rising —
        // "visible only while it's actually a threat" (the project owner's
        // own framing), not a second visible-but-safe animation to watch.
        this.gameObject.setPosition(this.x, this.yHidden);
        this.gameObject.setAlpha(0);
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
    this.fallTween?.stop();
    this.gameObject.destroy();
  }
}
