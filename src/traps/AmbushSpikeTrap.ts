import Phaser from 'phaser';
import { Trap } from './Trap';
import type { TrapPhase } from './Trap';
import type { TrapTiming } from './TrapTiming';
import { MIN_WARNING_MS } from '@/config/physics';

/**
 * How long the spike hangs in plain sight before it starts falling.
 *
 * THIS, not the fall, is the telegraph now. The fall used to be it — the
 * spike was harmless for the whole descent and only turned lethal in the
 * frame it landed — which is honest on paper and nonsense on screen: "когда
 * шип летит вниз я могу прыгнуть и он пролетит через меня и не убьёт, а я
 * перепрыгну" (owner). A spike passing through the android without touching
 * it teaches the player that falling spikes are scenery.
 *
 * So the two are swapped: the spike appears, holds still where the player
 * can see it for the full `MIN_WARNING_MS`, and everything after that —
 * the whole fall included — kills on contact. The honesty invariant is
 * intact (CLAUDE.md #4.2: a visible signal for at least 250ms before the
 * lethal state), and the thing now behaves the way a falling spike looks
 * like it should.
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
 * invisible while idle, then appears overhead, hangs there for `HANG_MS`,
 * and drops lethal. Unlike the ordinary `MovingSpikeTrap` (a bare
 * tween with no phase concept, always lethal, always visible — its
 * continuous motion IS the telegraph), this reuses `Trap`'s
 * idle→warning→active→cooldown cycle, splitting `warning` in two: the
 * spike is visible and motionless for `HANG_MS` (the telegraph, see that
 * constant), then falls — and it is lethal from the first frame of the
 * fall through to the end of `active`. `warningMs` must therefore be
 * longer than `HANG_MS`; the constructor refuses anything else.
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
        // Appears where it will fall from and holds — `delay` is the whole
        // telegraph, and the tween covers only what is left of the window.
        this.gameObject.setPosition(this.x, this.yHidden);
        this.gameObject.setAlpha(1);
        this.fallTween = this.scene.tweens.add({
          targets: this.gameObject,
          y: this.yLanded,
          delay: HANG_MS,
          duration: this.timing.warningMs - HANG_MS,
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
   * Lethal from the moment it starts moving, not from the moment it lands.
   * `phase === 'warning'` is only ever reached armed, so no extra check is
   * needed for the hanging half.
   */
  override isLethal(): boolean {
    if (this.phase === 'warning') return this.phaseElapsedMs >= HANG_MS;
    return super.isLethal();
  }

  /** A 1px jitter while it hangs — cheap, allocation-free, and the difference between "a spike is up there" and "a spike is up there and it is about to go". */
  protected override onUpdatePhase(phase: TrapPhase, elapsedMs: number): void {
    if (phase !== 'warning' || elapsedMs >= HANG_MS) return;
    this.gameObject.setX(this.x + (Math.sin(elapsedMs / 22) > 0 ? 1 : -1));
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
