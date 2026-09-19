import Phaser from 'phaser';
import { Trap } from './Trap';
import type { TrapPhase } from './Trap';
import type { TrapTiming } from './TrapTiming';
import { PALETTE } from '@/config/palette';
import { TILE_SIZE } from '@/config/display';

export interface LaunchPadConfig {
  id: string;
  /** Centre X of this tile. */
  x: number;
  /** World Y of the surface the player stands on. */
  surfaceY: number;
  /** How far above the surface the launch carries the player, in px. */
  liftPx: number;
  timing?: TrapTiming | undefined;
  initialIdleMs?: number | undefined;
  loop?: boolean | undefined;
}

/**
 * One tile of a `launch-pad` (see `TrapDef.ts` for what the mechanic is for)
 * — a `width > 1` pad in the level data spawns several of these side by side,
 * exactly the way `spike-bank` and `disappearing-platform` already do.
 *
 * It is a PLATFORM first and a trap second. The body is immovable and
 * collides like any other one-way platform, so the pad can be stood on,
 * walked across and jumped from while it is idle; `isLethal()` is never true
 * for it, and nothing in the scene's hazard sweep ever sees it. What the
 * phase cycle drives is not danger but readiness — the whole point of the
 * warning phase here is that the player can see the launch coming and decide
 * whether to be standing on it.
 */
export class LaunchPadTrap extends Trap {
  readonly gameObject: Phaser.Physics.Arcade.Sprite;
  readonly liftPx: number;
  /** The strip the player has to be standing in to be carried — swept by hand, never `physics.add.overlap` (CLAUDE.md #5). */
  readonly zone: Phaser.Geom.Rectangle;

  private readonly chevron: Phaser.GameObjects.Graphics;
  private readonly surfaceY: number;
  private readonly x: number;
  private pulse: Phaser.Tweens.Tween | null = null;

  constructor(scene: Phaser.Scene, config: LaunchPadConfig) {
    super('launch-pad', config.id, { timing: config.timing, loop: config.loop, initialIdleMs: config.initialIdleMs });
    this.x = config.x;
    this.surfaceY = config.surfaceY;
    this.liftPx = config.liftPx;

    // `tile-moving-platform` rather than the plain slab: this is machinery,
    // and the player has to be able to tell it apart from ordinary footing
    // at a glance. Unlike `fake-platform`/`falling-platform`, being readable
    // is the POINT here — a pad you cannot find is a route you cannot plan.
    this.gameObject = scene.physics.add.sprite(config.x, config.surfaceY + TILE_SIZE / 2, 'tile-moving-platform');
    const body = this.gameObject.body as Phaser.Physics.Arcade.Body;
    body.setAllowGravity(false);
    body.setImmovable(true);

    this.chevron = scene.add.graphics();
    this.zone = new Phaser.Geom.Rectangle(config.x - TILE_SIZE / 2, config.surfaceY - TILE_SIZE, TILE_SIZE, TILE_SIZE);

    this.onEnterPhase('idle');
  }

  /** True only on the frames the pad is actually throwing — read by `GameplayScene`'s zone sweep. */
  isFiring(): boolean {
    return this.getPhase() === 'active';
  }

  protected onEnterPhase(phase: TrapPhase): void {
    if (!this.chevron) return; // guard: the base constructor calls this before the fields exist
    this.pulse?.stop();
    this.pulse = null;
    this.chevron.setAlpha(1);
    this.drawChevron(phase);

    if (phase === 'warning') {
      // The telegraph is a rising blink rather than a colour the player has
      // to have learned: something is about to happen HERE, and the arrow
      // already says which way.
      this.pulse = this.chevron.scene.tweens.add({
        targets: this.chevron,
        alpha: { from: 0.35, to: 1 },
        duration: Math.max(90, this.timing.warningMs / 4),
        yoyo: true,
        repeat: -1,
      });
    }
  }

  private drawChevron(phase: TrapPhase): void {
    const lit = phase === 'active' ? PALETTE.white : phase === 'warning' ? PALETTE.reward : PALETTE.cyanDim;
    const top = this.surfaceY - 6;
    this.chevron.clear();
    this.chevron.fillStyle(lit, 1);
    // A two-row arrowhead in axis-aligned rectangles — same constraint every
    // other piece of this game's art works under (integer upscale, no assets).
    this.chevron.fillRect(this.x - 1, top, 2, 2);
    this.chevron.fillRect(this.x - 3, top + 2, 6, 2);
    if (phase === 'active') this.chevron.fillRect(this.x - 4, top + 5, 8, 1);
  }

  destroy(): void {
    this.pulse?.stop();
    this.chevron.destroy();
    this.gameObject.destroy();
  }
}
