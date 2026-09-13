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
 * IT WAITS FOR THE PLAYER TO MOVE, not for a clock.
 *
 * This has now been wrong in both directions. Setting off on the first
 * frame killed players who were still reading the level ("у меня есть время
 * меньше секунды нажать бежать, иначе я умру"); a flat 2000ms hold fixed
 * that and produced the opposite complaint, that the chase starts after it
 * stops mattering ("красный шарик стоит афк первые пару секунд, я буквально
 * уже убежал с зоны его действия и он только заработал").
 *
 * A fixed number cannot satisfy both, because the thing being waited for
 * was never time — it was the player finishing reading the screen. So that
 * is what is waited for: the drone holds while the player holds, and leaves
 * the instant they commit to a direction (`MOVE_TO_START_PX` of travel from
 * where they were standing). `startDelayMs` stays as the cap for a player
 * who never moves at all, so a level cannot sit frozen forever.
 */
/** How far the player must travel from their spawn before the chase is on — a step, not a twitch. */
const MOVE_TO_START_PX = 12;

export class Pursuer {
  readonly type = 'pursuer';
  readonly id: string;
  readonly gameObject: Phaser.Physics.Arcade.Sprite;
  private readonly body: Phaser.Physics.Arcade.Body;
  private readonly speed: number;
  private waitMs: number;
  private readonly totalWaitMs: number;
  /** Where the player was on the first frame — the baseline `MOVE_TO_START_PX` is measured from. */
  private anchorX: number | null = null;

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
    this.anchorX ??= targetX;
    if (this.waitMs > 0 && Math.abs(targetX - this.anchorX) >= MOVE_TO_START_PX) {
      // The player committed. Skip the rest of the hold rather than letting
      // them walk away from a drone that has not started yet.
      this.waitMs = 0;
    }
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
