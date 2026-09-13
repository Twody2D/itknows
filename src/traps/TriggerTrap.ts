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
  /**
   * The switch is a plain rectangle, NOT a physics body, and the scene
   * tests it by hand (`GameplayScene.sweepZoneContacts`).
   *
   * It used to be a `Zone` with a static body behind `physics.add.overlap`,
   * and that is a trampoline. Arcade's `SeparateY` sets `touching.down` on
   * the player whenever it resolves a vertical intersection — including an
   * overlap-only one, where it flags the contact and then declines to
   * separate. `Player` reads `touching.down` as "there is ground under my
   * feet", so every frame the android was inside a trigger band it was
   * treated as standing on it: coyote time kept refreshing and a buffered
   * jump fired again. With the band five tiles tall (`APPROACH_BAND_TILES`)
   * and sitting right at the lip of a pit, tapping jump repeatedly let the
   * player climb the trigger like a staircase — "можно буквально летать и
   * прыгать от воздуха... будто от триггера отталкиваюсь", which is
   * exactly what was happening.
   */
  readonly bounds: Phaser.Geom.Rectangle;
  private fired = false;
  private readonly target: Triggerable;

  constructor(_scene: Phaser.Scene, config: TriggerConfig) {
    this.id = config.id;
    this.target = config.target;

    this.bounds = new Phaser.Geom.Rectangle(
      config.x - config.width / 2,
      config.y - config.height / 2,
      config.width,
      config.height,
    );
  }

  /** Called by the scene's overlap handler on player contact. */
  fire(): void {
    if (this.fired) return;
    this.fired = true;
    this.target.trigger();
  }

  destroy(): void {
    // Nothing to tear down — the trigger owns no display object and no body.
  }
}
