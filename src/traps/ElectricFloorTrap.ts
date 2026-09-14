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
 */
export class ElectricFloorTrap extends Trap {
  readonly support: Phaser.Physics.Arcade.Sprite;
  readonly hazard: Phaser.GameObjects.Zone;

  constructor(scene: Phaser.Scene, config: ElectricFloorConfig) {
    super('electric-floor', config.id, { timing: config.timing });

    const width = config.widthTiles * TILE_SIZE;
    this.support = scene.physics.add.staticSprite(config.x, config.y, 'tile-ground-top');
    this.support.setDisplaySize(width, TILE_SIZE).refreshBody();
    this.support.setTint(PALETTE.cyan);

    this.hazard = scene.add.zone(config.x, config.y - TILE_SIZE / 2, width, TILE_SIZE);
    scene.physics.add.existing(this.hazard, true);

    this.onEnterPhase('idle');
  }

  protected onEnterPhase(phase: TrapPhase): void {
    if (!this.support) return; // guard: base ctor fires this before fields exist
    switch (phase) {
      case 'idle':
        this.support.setTint(PALETTE.cyan);
        this.support.setAlpha(1);
        break;
      case 'warning':
        this.support.setTint(PALETTE.dangerAlt);
        break;
      case 'active':
        this.support.setTint(PALETTE.danger);
        break;
      case 'cooldown':
        this.support.setTint(PALETTE.dangerAlt);
        break;
    }
  }

  destroy(): void {
    this.support.destroy();
    this.hazard.destroy();
  }
}
