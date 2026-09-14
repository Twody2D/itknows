import Phaser from 'phaser';
import { PALETTE } from '@/config/palette';
import { TILE_SIZE } from '@/config/display';
import { Trap } from './Trap';
import type { TrapPhase } from './Trap';
import type { TrapTiming } from './TrapTiming';

export interface ElectricFloorConfig {
  id: string;
  x: number;
  y: number;
  widthTiles: number;
  timing?: TrapTiming | undefined;
}

/**
 * A floor segment that is always walkable (a constant support surface) but
 * periodically lethal. Two game objects share one phase clock: `support`
 * (always solid, for standing) and `hazard` (an overlap zone, lethal only
 * while active) — a visible color pulse telegraphs the switch.
 *
 * AT IDLE IT IS INVISIBLE, and that is the point rather than an economy.
 * The plate used to sit there tinted cyan across its whole run, so a player
 * could see from the spawn exactly which tiles would eventually kill them
 * and simply never stand there — "пол который превращается в лаву в
 * изначальном положении отличается цветом от земли и его видно" (owner).
 * Hiding it shows the ordinary ground tiles already drawn underneath
 * (`Level.ts` paints the whole ground row first), so a live plate and plain
 * floor are the same picture until the plate warns.
 *
 * That keeps CLAUDE.md #4.2 intact rather than bending it: the telegraph
 * was never the idle colour, it is the `warningMs` pulse — a full 500ms of
 * the plate flaring `dangerAlt` before anything is lethal. What is gone is
 * only the part that let the trap be avoided without ever reading it, which
 * is the same decision already recorded for fake platforms and falling
 * blocks (CLAUDE.md #4).
 */
export class ElectricFloorTrap extends Trap {
  readonly support: Phaser.Physics.Arcade.Sprite;
  readonly hazard: Phaser.GameObjects.Zone;

  constructor(scene: Phaser.Scene, config: ElectricFloorConfig) {
    super('electric-floor', config.id, { timing: config.timing });

    const width = config.widthTiles * TILE_SIZE;
    this.support = scene.physics.add.staticSprite(config.x, config.y, 'tile-ground-top');
    this.support.setDisplaySize(width, TILE_SIZE).refreshBody();

    this.hazard = scene.add.zone(config.x, config.y - TILE_SIZE / 2, width, TILE_SIZE);
    scene.physics.add.existing(this.hazard, true);

    this.onEnterPhase('idle');
  }

  protected onEnterPhase(phase: TrapPhase): void {
    if (!this.support) return; // guard: base ctor fires this before fields exist
    switch (phase) {
      case 'idle':
        // Invisible, not grey: the ground tiles under it are the picture.
        this.support.setAlpha(0);
        break;
      case 'warning':
        this.support.setAlpha(1);
        this.support.setTint(PALETTE.dangerAlt);
        break;
      case 'active':
        this.support.setAlpha(1);
        this.support.setTint(PALETTE.danger);
        break;
      case 'cooldown':
        this.support.setAlpha(1);
        this.support.setTint(PALETTE.dangerAlt);
        break;
    }
  }

  destroy(): void {
    this.support.destroy();
    this.hazard.destroy();
  }
}
