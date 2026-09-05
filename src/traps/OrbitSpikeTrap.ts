import Phaser from 'phaser';

export interface OrbitSpikeConfig {
  id: string;
  pivotX: number;
  pivotY: number;
  radius: number;
  periodMs: number;
  /** Default true. */
  clockwise?: boolean | undefined;
}

/**
 * A spike on a fixed-radius arm, sweeping at constant angular speed forever
 * — see `TrapDef.ts` for how this differs from `swinging-spike` (bounded,
 * decelerating arc) and `loop-spike` (polyline circuit). No `Trap` phase
 * cycle, same honesty basis as `MovingSpikeTrap`: the continuous, never-
 * pausing motion is the telegraph, so it's lethal from the moment it exists.
 *
 * Position is driven by a dummy-target tween's progress rather than a
 * per-frame `update()` override (same technique `MainMenuScene`'s scanline
 * uses) — one `Linear`, non-yoyo, `repeat: -1` tween sweeping an angle
 * 0..2π, read back in `onUpdate` to place the sprite. `Linear` easing is
 * what keeps the angular speed constant; anything eased would slow near 0
 * and 2π every lap, which isn't a real orbit.
 */
export class OrbitSpikeTrap {
  readonly type = 'orbit-spike';
  readonly id: string;
  readonly gameObject: Phaser.Physics.Arcade.Sprite;

  private readonly tween: Phaser.Tweens.Tween;

  constructor(scene: Phaser.Scene, config: OrbitSpikeConfig) {
    this.id = config.id;
    const direction = config.clockwise === false ? -1 : 1;

    this.gameObject = scene.physics.add.sprite(config.pivotX, config.pivotY - config.radius, 'tile-spike');
    const body = this.gameObject.body as Phaser.Physics.Arcade.Body;
    body.setAllowGravity(false);
    body.setImmovable(true);
    body.setSize(6, 4);
    body.setOffset(2, 6);

    const state = { angle: 0 };
    this.tween = scene.tweens.add({
      targets: state,
      angle: Math.PI * 2 * direction,
      duration: config.periodMs,
      repeat: -1,
      ease: 'Linear',
      onUpdate: () => {
        this.gameObject.setPosition(
          config.pivotX + config.radius * Math.sin(state.angle),
          config.pivotY - config.radius * Math.cos(state.angle),
        );
      },
    });
  }

  isLethal(): boolean {
    return true;
  }

  destroy(): void {
    this.tween.stop();
    this.gameObject.destroy();
  }
}
