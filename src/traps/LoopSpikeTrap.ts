import Phaser from 'phaser';
import { TRAP_HITBOX } from '@/config/physics';

export interface LoopSpikeConfig {
  id: string;
  /** 3+ points, world px. The circuit closes from the last point back to the first. */
  waypoints: Array<{ x: number; y: number }>;
  /** Duration of each leg between consecutive waypoints. */
  travelMs: number;
}

/**
 * A spike patrolling a closed circuit in one direction, never reversing —
 * see `TrapDef.ts` for how this differs from `moving-spike`'s symmetric
 * ping-pong (which teaches "it always comes straight back the way it
 * came"). No `Trap` phase cycle: continuous visible motion at a constant,
 * predictable per-leg speed is the telegraph, same basis every other
 * continuously-moving hazard here uses.
 *
 * Built from `scene.add.tweenchain` (Phaser 3.60+) — a real sequence of
 * straight legs through 3+ points, which a single two-point tween (what
 * `MovingSpikeTrap` uses) can't express.
 */
export class LoopSpikeTrap {
  readonly type = 'loop-spike';
  readonly id: string;
  readonly gameObject: Phaser.Physics.Arcade.Sprite;

  private readonly chain: Phaser.Tweens.TweenChain;

  constructor(scene: Phaser.Scene, config: LoopSpikeConfig) {
    this.id = config.id;
    const [first, ...rest] = config.waypoints;
    if (!first) throw new Error(`loop-spike ${config.id}: needs at least one waypoint`);

    this.gameObject = scene.physics.add.sprite(first.x, first.y, 'tile-spike');
    const body = this.gameObject.body as Phaser.Physics.Arcade.Body;
    body.setAllowGravity(false);
    body.setImmovable(true);
    // Centred, not floor-anchored. The 6x4-at-offset(2,6) box every
    // ground-mounted spike uses sits at the *base* of the tile, which is
    // the forgiving thing to do when the player runs into spikes standing
    // point-up on a surface. On an arm swinging through open air it is
    // wrong: the visible spike passed straight through the player and
    // nothing happened, because the part of the tile that kills was four
    // pixels below where the picture was (owner, playing: "когда
    // крутящийся шип проходит прямо сквозь меня он не убивает").
    body.setSize(TRAP_HITBOX.spikeCentred.width, TRAP_HITBOX.spikeCentred.height);
    body.setOffset(TRAP_HITBOX.spikeCentred.offsetX, TRAP_HITBOX.spikeCentred.offsetY);

    // Every remaining waypoint, then back to the first — one full lap.
    const legs = [...rest, first].map((point) => ({
      x: point.x,
      y: point.y,
      duration: config.travelMs,
      ease: 'Linear',
    }));

    this.chain = scene.add.tweenchain({
      targets: this.gameObject,
      tweens: legs,
      loop: -1,
    });
  }

  isLethal(): boolean {
    return true;
  }

  destroy(): void {
    this.chain.stop();
    this.gameObject.destroy();
  }
}
