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
  private readonly totalWaitMs: number;

  constructor(scene: Phaser.Scene, config: PursuerConfig) {
    this.id = config.id;
    this.speed = PHYSICS.moveSpeed * (config.speedFactor ?? 0.7);
    this.waitMs = config.startDelayMs ?? 2000;
    this.totalWaitMs = Math.max(this.waitMs, 1);

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
      this.body.setVelocityX(0);
      // IT HAS TO LOOK LIKE A COUNTDOWN, not like nothing. Hovering
      // motionless at the far edge of the screen for two seconds is
      // indistinguishable from being broken — the owner watched it and
      // reported the wait as endless. So it spins up instead: the drone
      // swells and brightens as its hold runs out, and is at full size and
      // full opacity in the frame it starts moving. Two cheap setters on
      // one object, no tween to cancel on restart.
      const charge = 1 - Math.max(this.waitMs, 0) / this.totalWaitMs;
      this.gameObject.setScale(0.55 + 0.45 * charge);
      this.gameObject.setAlpha(0.45 + 0.55 * charge);
      return;
    }
    this.gameObject.setScale(1);
    this.gameObject.setAlpha(1);

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
