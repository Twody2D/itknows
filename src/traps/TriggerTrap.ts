import Phaser from 'phaser';

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
 * An invisible pressure zone that arms a separate trap elsewhere on contact
 * (master-prompt §14 "активируется при определённом действии"). The cause
 * and effect are deliberately decoupled in space — the target trap still
 * owns its own honest warning phase before going lethal.
 *
 * NOTHING IS DRAWN HERE. Triggers used to paint a faint line on the ground
 * where they sat; the owner asked for that gone after playing it ("убери
 * эти видимые фиолетовые тригеры, пусть они будут невидимыми"), and it
 * costs no honesty: CLAUDE.md #4.2 requires the lethal state to be
 * telegraphed, not the existence of a switch. Every trap a trigger can fire
 * still flashes, shakes, or visibly moves for at least `MIN_WARNING_MS`
 * before it can kill — that warning is the contract, and it is the one the
 * player reacts to. Marking the switch as well only told them the surprise
 * was coming, which is the thing the sector exists to deliver.
 */
export class TriggerTrap {
  readonly type = 'trigger';
  readonly id: string;
  readonly gameObject: Phaser.GameObjects.Zone;
  private fired = false;
  private readonly target: Triggerable;

  constructor(scene: Phaser.Scene, config: TriggerConfig) {
    this.id = config.id;
    this.target = config.target;

    this.gameObject = scene.add.zone(config.x, config.y, config.width, config.height);
    scene.physics.add.existing(this.gameObject, true);
  }

  /** Called by the scene's overlap handler on player contact. */
  fire(): void {
    if (this.fired) return;
    this.fired = true;
    this.target.trigger();
  }

  destroy(): void {
    this.gameObject.destroy();
  }
}
