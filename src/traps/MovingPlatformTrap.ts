import Phaser from 'phaser';
import { PALETTE } from '@/config/palette';

export interface MovingPlatformConfig {
  id: string;
  from: { x: number; y: number };
  to: { x: number; y: number };
  travelMs: number;
  /** Display/body width in pixels — the sprite's 10px tile texture is stretched to fit. */
  widthPx: number;
  /**
   * Draw it as a length of floor rather than a mechanical slab: ground
   * texture, plus the bright cyan lip a run of ground carries. For a slab
   * that slides along the ground row, where what the level is actually
   * showing is a hole in the floor moving, not a vehicle.
   */
  asFloor?: boolean | undefined;
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
  private readonly rim: Phaser.GameObjects.Rectangle | null;

  constructor(scene: Phaser.Scene, config: MovingPlatformConfig) {
    this.id = config.id;
    this.gameObject = scene.physics.add.sprite(
      config.from.x,
      config.from.y,
      config.asFloor ? 'tile-ground-top-s3' : 'tile-moving-platform',
    );
    this.gameObject.setDisplaySize(config.widthPx, 10);
    const body = this.gameObject.body as Phaser.Physics.Arcade.Body;
    // `setSize` takes *source* pixels and multiplies by the sprite's scale.
    // `setDisplaySize` above already scaled a 10px tile up to `widthPx`, so
    // passing `widthPx` here asked for widthPx x (widthPx/10) — a body many
    // times wider than the slab, hanging off both ends as invisible floor
    // (owner, playing: "у движущихся платформ хитбокс длиннее с каждой из
    // сторон и я могу оттолкнуться от воздуха"). One tile is the right
    // source size; the scale turns it into exactly the slab.
    body.setSize(10, 10);
    body.setAllowGravity(false);
    body.setImmovable(true);
    this.lastX = config.from.x;
    this.lastY = config.from.y;

    this.rim = config.asFloor
      ? scene.add
          .rectangle(config.from.x, config.from.y - 5, config.widthPx, 2, PALETTE.cyan, 0.85)
          .setOrigin(0.5, 0)
      : null;

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
    this.rim?.setPosition(this.gameObject.x, this.gameObject.y - 5);
    const dx = this.gameObject.x - this.lastX;
    const dy = this.gameObject.y - this.lastY;
    this.lastX = this.gameObject.x;
    this.lastY = this.gameObject.y;
    return { dx, dy };
  }

  destroy(): void {
    this.tween.stop();
    this.rim?.destroy();
    this.gameObject.destroy();
  }
}
