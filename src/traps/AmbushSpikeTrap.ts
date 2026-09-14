import Phaser from 'phaser';
import { Trap } from './Trap';
import type { TrapPhase } from './Trap';
import type { TrapTiming } from './TrapTiming';
import { MIN_WARNING_MS } from '@/config/physics';

/**
 * How long the spike is visible before it can kill.
 *
 * The fall used to BE the telegraph — the spike was harmless the whole way
 * down and only turned lethal in the frame it landed, so it visibly passed
 * through the player ("когда шип летит вниз я могу прыгнуть и он пролетит
 * через меня и не убьёт"). The first fix made the spike hang still for this
 * long before dropping, and the owner rejected the look of it: "верни
 * скорость падения шипа как до этого, сейчас он резко падает и трясётся
 * сверху. Сделай чтобы сразу падал".
 *
 * So nothing hangs and nothing shakes: the spike appears and starts falling
 * in the same frame, down the whole of `warningMs` on the `Cubic.easeIn`
 * curve it always used. What this constant now measures is only when the
 * thing becomes dangerous — and the easing is what makes both true at once.
 * Cubic spends its first quarter of TIME on a twentieth of the DISTANCE, so
 * at 250ms into a 560ms drop the spike has moved about 9px: it is plainly
 * visible, plainly committed to falling, and has not reached anybody. After
 * that it accelerates into the floor, lethal for the rest of the fall.
 *
 * CLAUDE.md #4.2 holds exactly as written — a visible signal for at least
 * 250ms before the lethal state — and so does the owner's "just let it
 * fall".
 */
const HANG_MS = MIN_WARNING_MS;

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
 * invisible while idle, then appears overhead and drops — harmless for the
 * first `HANG_MS` of the fall, lethal for the rest of it. Unlike the ordinary `MovingSpikeTrap` (a bare
 * tween with no phase concept, always lethal, always visible — its
 * continuous motion IS the telegraph), this reuses `Trap`'s
 * idle→warning→active→cooldown cycle, with `warning` as one uninterrupted
 * fall that turns lethal `HANG_MS` in (see that constant for why the
 * easing makes that fair). `warningMs` must therefore be longer than
 * `HANG_MS`; the constructor refuses anything else.
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
    if (this.timing.warningMs <= HANG_MS) {
      throw new Error(
        `moving-spike:${config.id}: warningMs (${this.timing.warningMs}) must exceed HANG_MS (${HANG_MS}) — the spike needs time to fall after its telegraph`,
      );
    }

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
        // Appears and falls, in that frame. No delay, no hold — the slow
        // start is the easing curve doing it, not a pause.
        this.gameObject.setPosition(this.x, this.yHidden);
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

  /**
   * Lethal once it is properly moving, not once it lands.
   * `phase === 'warning'` is only ever reached armed, so no extra check is
   * needed for the first, harmless part of the fall.
   */
  override isLethal(): boolean {
    if (this.phase === 'warning') return this.phaseElapsedMs >= HANG_MS;
    return super.isLethal();
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
