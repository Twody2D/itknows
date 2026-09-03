import Phaser from 'phaser';
import { PHYSICS } from '@/config/physics';

export interface PursuerConfig {
  id: string;
  x: number;
  y: number;
  /** Fraction of the player's max move speed this pursuer hunts at — kept below 1 so it is always outrunnable. */
  speedFactor?: number | undefined;
}

/**
 * A small drone that drifts toward the player's horizontal position.
 * Deliberately capped below the player's own top speed (CLAUDE.md #13 — a
 * threat the player can never outrun by definition isn't fair difficulty,
 * it's a countdown). Its constant visible motion toward the player is the
 * telegraph; always lethal on touch.
 */
export class Pursuer {
  readonly type = 'pursuer';
  readonly id: string;
  readonly gameObject: Phaser.Physics.Arcade.Sprite;
  private readonly body: Phaser.Physics.Arcade.Body;
  private readonly speed: number;

  constructor(scene: Phaser.Scene, config: PursuerConfig) {
    this.id = config.id;
    this.speed = PHYSICS.moveSpeed * (config.speedFactor ?? 0.7);

    this.gameObject = scene.physics.add.sprite(config.x, config.y, 'trap-pursuer');
    this.body = this.gameObject.body as Phaser.Physics.Arcade.Body;
    this.body.setAllowGravity(false);
    this.body.setSize(8, 8);
  }

  isLethal(): boolean {
    return true;
  }

  update(targetX: number): void {
    const dx = targetX - this.gameObject.x;
    if (Math.abs(dx) < 2) {
      this.body.setVelocityX(0);
      return;
    }
    this.body.setVelocityX(Math.sign(dx) * this.speed);
  }

  destroy(): void {
    this.gameObject.destroy();
  }
}
