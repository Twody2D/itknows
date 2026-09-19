import Phaser from 'phaser';
import { PALETTE } from '@/config/palette';
import { Trap } from './Trap';
import type { TrapPhase } from './Trap';
import type { TrapTiming } from './TrapTiming';

export interface SpikeWallConfig {
  id: string;
  /** World X of the retracted edge — the wall grows away from this point, never past it. */
  edgeX: number;
  y: number;
  height: number;
  /** Full extended width in world px. */
  extendedWidth: number;
  /** false (default): grows rightward from `edgeX`. true: grows leftward — `edgeX` is the right edge. */
  fromRight?: boolean | undefined;
  timing?: TrapTiming | undefined;
  initialIdleMs?: number | undefined;
  loop?: boolean | undefined;
}

/**
 * A lethal `timing-gate` (see `TrapDef.ts`) — spikes slide out from a fixed
 * edge to seal a passage. Growing in *width* from a pinned edge, rather than
 * in height/position like every other timed hazard here, is what makes this
 * read as a different kind of thing to watch for: a gap that's sometimes
 * open and sometimes a wall, not a beam or a bank of points.
 */
export class SpikeWallTrap extends Trap {
  readonly gameObject: Phaser.GameObjects.Rectangle;

  private readonly edgeX: number;
  private readonly y: number;
  private readonly height: number;
  private readonly extendedWidth: number;
  private readonly sign: 1 | -1;

  constructor(scene: Phaser.Scene, config: SpikeWallConfig) {
    super('spike-wall', config.id, { timing: config.timing, loop: config.loop, initialIdleMs: config.initialIdleMs });
    this.edgeX = config.edgeX;
    this.y = config.y;
    this.height = config.height;
    this.extendedWidth = config.extendedWidth;
    this.sign = config.fromRight ? -1 : 1;

    this.gameObject = scene.add.rectangle(config.edgeX, config.y, 1, config.height, PALETTE.danger, 0.1);
    scene.physics.add.existing(this.gameObject, true);

    this.onEnterPhase('idle');
  }

  /** Repositions/resizes the shared static body so its edge stays pinned at `edgeX` while width changes. */
  private setExtent(width: number, fillColor: number, alpha: number): void {
    const w = Math.max(1, width);
    this.gameObject.setSize(w, this.height);
    this.gameObject.setPosition(this.edgeX + (this.sign * w) / 2, this.y);
    this.gameObject.setFillStyle(fillColor, alpha);
    const body = this.gameObject.body as Phaser.Physics.Arcade.StaticBody;
    body.setSize(w, this.height);
    body.updateFromGameObject();
  }

  /**
   * `warning` shows the FULL extended footprint already, not a
   * partway-grown one — whatever span turns lethal at `active` must have
   * been visibly present in that exact span for the entire warning phase
   * (CLAUDE.md #4.2), so growing the width gradually here would leave the
   * last portion of the wall appearing at the same instant it becomes
   * lethal. Same discrete phase-color swap `LaserTrap` uses (its beam is
   * always full-size too, only the fill changes) rather than an animated
   * grow — proven safe, not reinvented.
   */
  protected onEnterPhase(phase: TrapPhase): void {
    if (!this.gameObject) return; // guard: base constructor calls this before field assignment
    switch (phase) {
      case 'idle':
        this.setExtent(Math.min(4, this.extendedWidth * 0.06), PALETTE.danger, 0.12);
        break;
      case 'warning':
        this.setExtent(this.extendedWidth, PALETTE.dangerAlt, 0.5);
        break;
      case 'active':
        this.setExtent(this.extendedWidth, PALETTE.danger, 0.95);
        break;
      case 'cooldown':
        this.setExtent(Math.min(4, this.extendedWidth * 0.25), PALETTE.dangerAlt, 0.3);
        break;
    }
  }


  destroy(): void {
    this.gameObject.destroy();
  }
}
