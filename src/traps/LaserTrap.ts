import Phaser from 'phaser';
import { PALETTE } from '@/config/palette';
import { Trap } from './Trap';
import type { TrapPhase } from './Trap';
import type { TrapTiming } from './TrapTiming';
import { TRAP_HITBOX } from '@/config/physics';

export interface LaserConfig {
  id: string;
  x: number;
  yTop: number;
  yBottom: number;
  timing?: TrapTiming | undefined;
  /** Idle-phase length before the first warning — used to stagger/delay a laser (master-prompt "delayed laser"). */
  initialIdleMs?: number | undefined;
  /** false = stays dormant until trigger() is called (e.g. wired to a TriggerTrap). Default true (loops forever). */
  loop?: boolean | undefined;
}

/**
 * A vertical laser beam. Covers both "Laser" and "Delayed laser" from the
 * trap list — a delayed laser is just this with a longer initial idle phase
 * before its first warning, not a separate implementation.
 *
 * Hazard body is always present at full beam size; lethality is a pure
 * function of `isLethal()` (checked by the scene's shared overlap handler),
 * so nothing here has to enable/disable physics bodies on a timer.
 */
export class LaserTrap extends Trap {
  readonly gameObject: Phaser.GameObjects.Rectangle;


  constructor(scene: Phaser.Scene, config: LaserConfig) {
    super('laser', config.id, { timing: config.timing, loop: config.loop, initialIdleMs: config.initialIdleMs });

    const height = config.yBottom - config.yTop;
    this.gameObject = scene.add.rectangle(config.x, config.yTop + height / 2, TRAP_HITBOX.laserWidth, height, PALETTE.danger, 0.08);
    scene.physics.add.existing(this.gameObject, true);

    this.onEnterPhase('idle');
  }

  protected onEnterPhase(phase: TrapPhase): void {
    if (!this.gameObject) return; // guard: base constructor calls this before field assignment
    switch (phase) {
      case 'idle':
        this.gameObject.setFillStyle(PALETTE.danger, 0.08);
        break;
      case 'warning':
        this.gameObject.setFillStyle(PALETTE.dangerAlt, 0.4);
        break;
      case 'active':
        this.gameObject.setFillStyle(PALETTE.danger, 0.95);
        break;
      case 'cooldown':
        this.gameObject.setFillStyle(PALETTE.danger, 0.2);
        break;
    }
  }


  destroy(): void {
    this.gameObject.destroy();
  }
}
