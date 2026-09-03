import Phaser from 'phaser';

export interface MovingPlatformConfig {
  id: string;
  from: { x: number; y: number };
  to: { x: number; y: number };
  travelMs: number;
  /** Display/body width in pixels — the sprite's 10px tile texture is stretched to fit. */
  widthPx: number;
}

/**
 * An always-solid platform (one-way, like a normal floating platform) that
 * ping-pongs between two points. The scene carries the player along by
 * applying this platform's per-frame delta to anyone standing on it —
 * Arcade Physics doesn't do that automatically for a kinematic body.
 */
export class MovingPlatformTrap {
  readonly type = 'moving-platform';
  readonly id: string;
  readonly gameObject: Phaser.Physics.Arcade.Sprite;

  private lastX: number;
  private lastY: number;
  private tween: Phaser.Tweens.Tween;

  constructor(scene: Phaser.Scene, config: MovingPlatformConfig) {
    this.id = config.id;
    this.gameObject = scene.physics.add.sprite(config.from.x, config.from.y, 'tile-moving-platform');
    this.gameObject.setDisplaySize(config.widthPx, 10);
    const body = this.gameObject.body as Phaser.Physics.Arcade.Body;
    body.setSize(config.widthPx, 10);
    body.setAllowGravity(false);
    body.setImmovable(true);
    this.lastX = config.from.x;
    this.lastY = config.from.y;

    this.tween = scene.tweens.add({
      targets: this.gameObject,
      x: config.to.x,
      y: config.to.y,
      duration: config.travelMs,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  /** Movement since the last call — apply to a passenger standing on top. */
  consumeDelta(): { dx: number; dy: number } {
    const dx = this.gameObject.x - this.lastX;
    const dy = this.gameObject.y - this.lastY;
    this.lastX = this.gameObject.x;
    this.lastY = this.gameObject.y;
    return { dx, dy };
  }

  destroy(): void {
    this.tween.stop();
    this.gameObject.destroy();
  }
}
