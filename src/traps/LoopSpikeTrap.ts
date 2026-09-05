import Phaser from 'phaser';

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
    body.setSize(6, 4);
    body.setOffset(2, 6);

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
