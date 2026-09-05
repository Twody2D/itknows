import Phaser from 'phaser';

export interface SwingingSpikeConfig {
  id: string;
  pivotX: number;
  pivotY: number;
  length: number;
  maxAngleDeg: number;
  periodMs: number;
}

/**
 * A spike on a chain, swinging through a bounded arc — see `TrapDef.ts` for
 * how this differs from `orbit-spike`'s constant-speed full rotation. No
 * `Trap` phase cycle: the continuous pendulum motion is itself the
 * telegraph (same basis `MovingSpikeTrap` already uses), and the visible
 * deceleration toward each extreme (`Sine.easeInOut`, `yoyo: true`) is part
 * of the read — the arm visibly slowing is what "it's about to reverse"
 * looks like.
 *
 * Same dummy-target-tween-driving-a-callback technique as `OrbitSpikeTrap`,
 * since neither a straight-line position tween nor Arcade's own physics can
 * trace a curved arc on their own.
 */
export class SwingingSpikeTrap {
  readonly type = 'swinging-spike';
  readonly id: string;
  readonly gameObject: Phaser.Physics.Arcade.Sprite;

  private readonly tween: Phaser.Tweens.Tween;

  constructor(scene: Phaser.Scene, config: SwingingSpikeConfig) {
    this.id = config.id;
    const maxAngle = Phaser.Math.DegToRad(config.maxAngleDeg);

    this.gameObject = scene.physics.add.sprite(
      config.pivotX + config.length * Math.sin(-maxAngle),
      config.pivotY + config.length * Math.cos(-maxAngle),
      'tile-spike',
    );
    const body = this.gameObject.body as Phaser.Physics.Arcade.Body;
    body.setAllowGravity(false);
    body.setImmovable(true);
    body.setSize(6, 4);
    body.setOffset(2, 6);

    const state = { t: 0 };
    this.tween = scene.tweens.add({
      targets: state,
      t: 1,
      duration: config.periodMs,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
      onUpdate: () => {
        const angle = Phaser.Math.Linear(-maxAngle, maxAngle, state.t);
        this.gameObject.setPosition(
          config.pivotX + config.length * Math.sin(angle),
          config.pivotY + config.length * Math.cos(angle),
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
