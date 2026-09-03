import Phaser from 'phaser';

export interface FallingPlatformConfig {
  id: string;
  x: number;
  y: number;
  /** Delay between contact and the platform starting to fall — the telegraph (a shake). */
  shakeMs?: number | undefined;
  fallSpeed?: number | undefined;
  /** How long after falling before it respawns at its original spot. */
  respawnMs?: number | undefined;
}

type State = 'solid' | 'shaking' | 'falling' | 'gone';

/**
 * Solid until the player lands on it, shakes briefly (telegraph), then
 * drops away and respawns at its original position after a delay.
 */
export class FallingPlatformTrap {
  readonly type = 'falling-platform';
  readonly id: string;
  readonly gameObject: Phaser.Physics.Arcade.Sprite;
  private readonly body: Phaser.Physics.Arcade.Body;

  private state: State = 'solid';
  private timerMs = 0;
  private readonly originX: number;
  private readonly originY: number;
  private readonly shakeMs: number;
  private readonly fallSpeed: number;
  private readonly respawnMs: number;

  constructor(scene: Phaser.Scene, config: FallingPlatformConfig) {
    this.id = config.id;
    this.originX = config.x;
    this.originY = config.y;
    this.shakeMs = config.shakeMs ?? 350;
    this.fallSpeed = config.fallSpeed ?? 180;
    this.respawnMs = config.respawnMs ?? 2000;

    this.gameObject = scene.physics.add.sprite(config.x, config.y, 'tile-ground');
    this.body = this.gameObject.body as Phaser.Physics.Arcade.Body;
    this.body.setAllowGravity(false);
    this.body.setImmovable(true);
  }

  notifyStandingOn(): void {
    if (this.state !== 'solid') return;
    this.state = 'shaking';
    this.timerMs = 0;
  }

  isSolid(): boolean {
    return this.state === 'solid' || this.state === 'shaking';
  }

  update(_time: number, delta: number): void {
    if (this.state === 'solid') return;

    this.timerMs += delta;

    if (this.state === 'shaking') {
      const shakeX = Math.sin(this.timerMs * 0.08) * 1.2;
      this.gameObject.x = this.originX + shakeX;
      if (this.timerMs >= this.shakeMs) {
        this.state = 'falling';
        this.timerMs = 0;
        this.gameObject.x = this.originX;
        this.body.setVelocityY(this.fallSpeed);
      }
      return;
    }

    if (this.state === 'falling') {
      if (this.gameObject.y - this.originY > 200) {
        this.state = 'gone';
        this.timerMs = 0;
        this.gameObject.setVisible(false);
        this.body.setVelocityY(0);
      }
      return;
    }

    if (this.state === 'gone' && this.timerMs >= this.respawnMs) {
      this.state = 'solid';
      this.timerMs = 0;
      this.gameObject.setPosition(this.originX, this.originY);
      this.gameObject.setVisible(true);
    }
  }

  destroy(): void {
    this.gameObject.destroy();
  }
}
