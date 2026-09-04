import Phaser from 'phaser';

export interface FallingPlatformConfig {
  id: string;
  x: number;
  y: number;
  /**
   * How long the platform keeps carrying the player while it sinks, before
   * collision drops out from under them — the telegraph. Contact starts the
   * sink immediately (no idle shake beforehand); this window is what makes
   * that honest (CLAUDE.md #4.2/#4.5 — `MIN_WARNING_MS`/`MIN_REACTION_WINDOW_MS`).
   */
  holdMs?: number | undefined;
  fallSpeed?: number | undefined;
  /** How long after falling before it respawns at its original spot. */
  respawnMs?: number | undefined;
}

type State = 'solid' | 'falling' | 'gone';

/**
 * Solid ground until the player steps on it — then it immediately starts
 * sinking under them (no idle shake first), still carrying them for
 * `holdMs`, before collision drops out and they fall the rest of the way
 * through. Respawns at its original position after a delay.
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
  private readonly holdMs: number;
  private readonly fallSpeed: number;
  private readonly respawnMs: number;

  constructor(scene: Phaser.Scene, config: FallingPlatformConfig) {
    this.id = config.id;
    this.originX = config.x;
    this.originY = config.y;
    this.holdMs = config.holdMs ?? 320;
    this.fallSpeed = config.fallSpeed ?? 180;
    this.respawnMs = config.respawnMs ?? 2000;

    this.gameObject = scene.physics.add.sprite(config.x, config.y, 'tile-ground');
    this.body = this.gameObject.body as Phaser.Physics.Arcade.Body;
    this.body.setAllowGravity(false);
    this.body.setImmovable(true);
  }

  notifyStandingOn(): void {
    if (this.state !== 'solid') return;
    this.state = 'falling';
    this.timerMs = 0;
    this.body.setVelocityY(this.fallSpeed);
  }

  isSolid(): boolean {
    if (this.state === 'solid') return true;
    if (this.state === 'falling') return this.timerMs < this.holdMs;
    return false;
  }

  update(_time: number, delta: number): void {
    if (this.state === 'solid') return;

    this.timerMs += delta;

    if (this.state === 'falling') {
      const wobble = Math.sin(this.timerMs * 0.08) * 1.2;
      this.gameObject.x = this.originX + wobble;
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
