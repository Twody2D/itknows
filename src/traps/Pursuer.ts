import Phaser from 'phaser';
import { PHYSICS } from '@/config/physics';

export interface PursuerConfig {
  id: string;
  x: number;
  y: number;
  /** Fraction of the player's max move speed this pursuer hunts at — kept below 1 so it is always outrunnable. */
  speedFactor?: number | undefined;
  /**
   * How long it hangs at its spawn point before it starts hunting. The
   * head start the player gets, and the reason the level opens as a
   * decision instead of a scramble — see the class comment.
   */
  startDelayMs?: number | undefined;
}

/**
 * A small drone that drifts toward the player's horizontal position.
 * Deliberately capped below the player's own top speed (CLAUDE.md #13 — a
 * threat the player can never outrun by definition isn't fair difficulty,
 * it's a countdown). Its constant visible motion toward the player is the
 * telegraph; always lethal on touch.
 *
 * IT WAITS BEFORE IT HUNTS. Capping the speed turned out not to be enough
 * on its own: the drone spawns a few columns behind the player and used to
 * set off on the first frame, so a player still reading the level lost
 * before they had moved ("уровни, где на меня летит красный шарик — у меня
 * есть время меньше секунды нажать бежать, иначе я умру"). `startDelayMs`
 * is the fix, and it is the same idea every other trap here already obeys:
 * the threat is visible for a beat before it can do anything. The default
 * of 2000ms is many times `MIN_REACTION_WINDOW_MS`, and the player covers
 * 220px in it — nearly half the screen of daylight before the chase is
 * even on.
 */
export class Pursuer {
  readonly type = 'pursuer';
  readonly id: string;
  readonly gameObject: Phaser.Physics.Arcade.Sprite;
  private readonly body: Phaser.Physics.Arcade.Body;
  private readonly speed: number;
  private waitMs: number;

  constructor(scene: Phaser.Scene, config: PursuerConfig) {
    this.id = config.id;
    this.speed = PHYSICS.moveSpeed * (config.speedFactor ?? 0.7);
    this.waitMs = config.startDelayMs ?? 2000;

    this.gameObject = scene.physics.add.sprite(config.x, config.y, 'trap-pursuer');
    this.body = this.gameObject.body as Phaser.Physics.Arcade.Body;
    this.body.setAllowGravity(false);
    this.body.setSize(8, 8);
  }

  isLethal(): boolean {
    return true;
  }

  update(targetX: number, deltaMs = 0): void {
    if (this.waitMs > 0) {
      this.waitMs -= deltaMs;
      // Visibly idling, not frozen out of existence: it hovers in place,
      // in frame, so the player can see what is about to come after them.
      this.body.setVelocityX(0);
      return;
    }

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
