import Phaser from 'phaser';
import { TILE_SIZE } from '@/config/display';
import { MAX_CONVEYOR_SPEED } from '@/gameplay/conveyor';

export interface ConveyorConfig {
  id: string;
  /** Left edge of the strip, in world px. */
  x: number;
  /** World Y of the surface the player stands on. */
  surfaceY: number;
  widthPx: number;
  /** Positive drags right, negative drags left, in px/s. */
  speed: number;
}

/**
 * A strip of floor that moves. The sector-08 mechanic, and the first thing
 * in the game that changes what STANDING STILL means.
 *
 * It is not a hazard and has no phase cycle: it never turns lethal, never
 * warns, and never stops. That is why it can be honest with no telegraph
 * beyond itself — the chevrons scroll at exactly the speed the belt pulls,
 * so what the player sees is what will happen to them, continuously, the way
 * a patrolling spike's motion is its own warning (CLAUDE.md #4.2 only ever
 * governs things that kill).
 *
 * What it does to the rest of the game is the point. Every timed trap in
 * sectors 02-07 is answered by waiting somewhere safe; here the safe tile
 * slides out from under you while you wait.
 */
export class ConveyorTrap {
  readonly id: string;
  readonly gameObject: Phaser.GameObjects.TileSprite;
  /** Where a player has to be standing to be carried — swept by hand, never `physics.add.overlap` (CLAUDE.md #5). */
  readonly zone: Phaser.Geom.Rectangle;
  readonly speed: number;

  constructor(scene: Phaser.Scene, config: ConveyorConfig) {
    this.id = config.id;
    this.speed = Phaser.Math.Clamp(config.speed, -MAX_CONVEYOR_SPEED, MAX_CONVEYOR_SPEED);

    // ONE TileSprite for the whole strip rather than one sprite per tile
    // (the shape `spike-bank` and `launch-pad` use): the belt's scroll is a
    // single `tilePositionX`, so N tiles would be N objects animating in
    // lockstep for no gain, and the seam between them would show.
    this.gameObject = scene.add.tileSprite(
      config.x + config.widthPx / 2,
      config.surfaceY + TILE_SIZE / 2,
      config.widthPx,
      TILE_SIZE,
      'tile-conveyor',
    );
    // Drawn pointing right; a leftward belt is the same art mirrored, so the
    // chevrons never disagree with the pull.
    this.gameObject.setFlipX(this.speed < 0);
    scene.physics.add.existing(this.gameObject, true);

    this.zone = new Phaser.Geom.Rectangle(config.x, config.surfaceY - TILE_SIZE, config.widthPx, TILE_SIZE);
  }

  /** How far the belt moves whatever is standing on it this frame, in px. */
  carryPx(deltaMs: number): number {
    return (this.speed * deltaMs) / 1000;
  }

  update(_time: number, delta: number): void {
    // Scrolled by the same number that moves the player, so the surface the
    // player sees sliding is the surface that slides them.
    this.gameObject.tilePositionX += this.carryPx(delta) * (this.speed < 0 ? -1 : 1);
  }

  destroy(): void {
    this.gameObject.destroy();
  }
}
