import Phaser from 'phaser';
import { TRAP_HITBOX } from '@/config/physics';

export interface MovingSpikeConfig {
  id: string;
  /** World-space endpoints the spike ping-pongs between. */
  from: { x: number; y: number };
  to: { x: number; y: number };
  /** Full traversal (one direction) duration, ms. Slow and steady — the motion itself is the telegraph. */
  travelMs: number;
}

/**
 * A spike that moves along a fixed, predictable back-and-forth track
 * (master-prompt §14 "moving spikes... с предсказуемым движением"). No
 * warning phase: the ongoing visible motion IS the telegraph, so honesty
 * comes from a slow, readable speed rather than a timed cue.
 */
export class MovingSpikeTrap {
  readonly type = 'moving-spike';
  readonly id: string;
  readonly gameObject: Phaser.Physics.Arcade.Sprite;

  private tween: Phaser.Tweens.Tween;

  constructor(scene: Phaser.Scene, config: MovingSpikeConfig) {
    this.id = config.id;
    this.gameObject = scene.physics.add.sprite(config.from.x, config.from.y, 'tile-spike');
    const body = this.gameObject.body as Phaser.Physics.Arcade.Body;
    body.setAllowGravity(false);
    body.setImmovable(true);
    body.setSize(TRAP_HITBOX.spikeBase.width, TRAP_HITBOX.spikeBase.height);
    body.setOffset(TRAP_HITBOX.spikeBase.offsetX, TRAP_HITBOX.spikeBase.offsetY);

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

  isLethal(): boolean {
    return true;
  }

  destroy(): void {
    this.tween.stop();
    this.gameObject.destroy();
  }
}
