import Phaser from 'phaser';
import { PALETTE } from '@/config/palette';

export interface Triggerable {
  trigger(): void;
}

export interface TriggerConfig {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  target: Triggerable;
}

/**
 * An invisible-ish pressure zone that arms a separate trap elsewhere on
 * contact (master-prompt §14 "активируется при определённом действии").
 * The cause and effect are deliberately decoupled in space — the target
 * trap still owns its own honest warning phase before going lethal.
 */
export class TriggerTrap {
  readonly type = 'trigger';
  readonly id: string;
  readonly gameObject: Phaser.GameObjects.Zone;
  private marker: Phaser.GameObjects.Rectangle;
  private fired = false;
  private readonly target: Triggerable;

  constructor(scene: Phaser.Scene, config: TriggerConfig) {
    this.id = config.id;
    this.target = config.target;

    this.gameObject = scene.add.zone(config.x, config.y, config.width, config.height);
    scene.physics.add.existing(this.gameObject, true);

    this.marker = scene.add.rectangle(config.x, config.y, config.width, 2, PALETTE.system, 0.5);
  }

  /** Called by the scene's overlap handler on player contact. */
  fire(): void {
    if (this.fired) return;
    this.fired = true;
    this.target.trigger();
    this.marker.setFillStyle(PALETTE.system, 0.15);
  }

  destroy(): void {
    this.gameObject.destroy();
    this.marker.destroy();
  }
}
