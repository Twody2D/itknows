import Phaser from 'phaser';
import { PALETTE } from '@/config/palette';
import { Trap } from './Trap';
import type { TrapPhase } from './Trap';
import type { TrapTiming } from './TrapTiming';
import { TRAP_HITBOX } from '@/config/physics';

export interface TimingGateConfig {
  id: string;
  x: number;
  yTop: number;
  yBottom: number;
  timing?: TrapTiming | undefined;
}

/**
 * A barrier that opens only during its `active` phase — passage requires
 * waiting for the right moment rather than reflexes against a hazard
 * (master-prompt §14 "timing gate"). Blocking, not lethal: mistiming costs
 * a beat, not a life — a needless insta-kill on a patience mechanic would
 * be exactly the "unfair frustration" CLAUDE.md #4 rules out.
 */
export class TimingGate extends Trap {
  readonly gameObject: Phaser.GameObjects.Rectangle;

  constructor(scene: Phaser.Scene, config: TimingGateConfig) {
    super('timing-gate', config.id, { timing: config.timing });

    const height = config.yBottom - config.yTop;
    this.gameObject = scene.add.rectangle(config.x, config.yTop + height / 2, TRAP_HITBOX.timingGateWidth, height, PALETTE.system, 0.8);
    scene.physics.add.existing(this.gameObject, true);

    this.onEnterPhase('idle');
  }

  /** Open (passable) only while active; closed (solid) otherwise. */
  isOpen(): boolean {
    return this.getPhase() === 'active';
  }

  protected onEnterPhase(phase: TrapPhase): void {
    if (!this.gameObject) return;
    switch (phase) {
      case 'idle':
        this.gameObject.setFillStyle(PALETTE.system, 0.85);
        break;
      case 'warning':
        this.gameObject.setFillStyle(PALETTE.cyan, 0.5);
        break;
      case 'active':
        this.gameObject.setFillStyle(PALETTE.cyan, 0.1);
        break;
      case 'cooldown':
        this.gameObject.setFillStyle(PALETTE.system, 0.5);
        break;
    }
  }

  destroy(): void {
    this.gameObject.destroy();
  }
}
