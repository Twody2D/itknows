import Phaser from 'phaser';

export interface DisappearingPlatformConfig {
  id: string;
  x: number;
  y: number;
  /** Delay between the player's first contact and the platform vanishing. */
  crumbleMs?: number | undefined;
  /** How long it stays gone before reappearing. */
  goneMs?: number | undefined;
}

type State = 'solid' | 'crumbling' | 'gone';

/**
 * Solid until the player stands on it, then vanishes shortly after contact
 * and reappears after a cooldown. The crumble delay (a visible flicker) is
 * the telegraph — stepping on it is never an instant, unavoidable loss of
 * footing (CLAUDE.md #4.2).
 */
export class DisappearingPlatformTrap {
  readonly type = 'disappearing-platform';
  readonly id: string;
  readonly gameObject: Phaser.Physics.Arcade.Sprite;

  private state: State = 'solid';
  private timerMs = 0;
  private readonly crumbleMs: number;
  private readonly goneMs: number;
  private readonly originalAlpha = 1;
  private span: readonly DisappearingPlatformTrap[] = [this];

  constructor(scene: Phaser.Scene, config: DisappearingPlatformConfig) {
    this.id = config.id;
    this.crumbleMs = config.crumbleMs ?? 350;
    this.goneMs = config.goneMs ?? 1500;

    this.gameObject = scene.physics.add.staticSprite(config.x, config.y, 'tile-ground-top');
  }

  /**
   * Every tile of the same ledge, so contact with any one of them takes the
   * whole ledge with it — see `Level.ts`, where the span is linked. A tile
   * is in its own span list; `startCrumbling` is what breaks the recursion.
   */
  linkSpan(span: readonly DisappearingPlatformTrap[]): void {
    this.span = span;
  }

  /** Called by the level's collider process callback on first contact from above. */
  notifyStandingOn(): void {
    if (this.state !== 'solid') return;
    for (const tile of this.span) tile.startCrumbling();
  }

  private startCrumbling(): void {
    if (this.state !== 'solid') return;
    this.state = 'crumbling';
    this.timerMs = 0;
  }

  isSolid(): boolean {
    return this.state !== 'gone';
  }

  update(_time: number, delta: number): void {
    if (this.state === 'solid') return;

    this.timerMs += delta;

    if (this.state === 'crumbling') {
      // Flicker faster as it gets closer to vanishing.
      const t = this.timerMs / this.crumbleMs;
      this.gameObject.setAlpha(0.4 + 0.6 * Math.abs(Math.sin(t * Math.PI * 6)));
      if (this.timerMs >= this.crumbleMs) {
        this.state = 'gone';
        this.timerMs = 0;
        this.gameObject.setVisible(false);
      }
      return;
    }

    if (this.state === 'gone' && this.timerMs >= this.goneMs) {
      this.state = 'solid';
      this.timerMs = 0;
      this.gameObject.setVisible(true);
      this.gameObject.setAlpha(this.originalAlpha);
    }
  }

  destroy(): void {
    this.gameObject.destroy();
  }
}
