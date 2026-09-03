import Phaser from 'phaser';
import { PALETTE } from '@/config/palette';
import { Trap } from './Trap';
import type { TrapPhase } from './Trap';
import type { TrapTiming } from './TrapTiming';

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

  private idleElapsedOverride = 0;
  private consumedInitialDelay = false;

  constructor(scene: Phaser.Scene, config: LaserConfig) {
    super('laser', config.id, { timing: config.timing, loop: config.loop });
    this.idleElapsedOverride = config.initialIdleMs ?? 0;

    const height = config.yBottom - config.yTop;
    this.gameObject = scene.add.rectangle(config.x, config.yTop + height / 2, 3, height, PALETTE.danger, 0.08);
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

  override update(time: number, delta: number): void {
    if (!this.consumedInitialDelay && this.idleElapsedOverride > 0) {
      this.idleElapsedOverride -= delta;
      if (this.idleElapsedOverride > 0) return;
      this.consumedInitialDelay = true;
    }
    super.update(time, delta);
  }

  destroy(): void {
    this.gameObject.destroy();
  }
}
