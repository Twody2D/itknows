import Phaser from 'phaser';

export interface FakePlatformConfig {
  id: string;
  x: number;
  y: number;
  /** Same bolt/no-bolt choice `Level.ts` makes for a real slab at this column, so the two are byte-identical on screen. */
  bolt: boolean;
}

/**
 * Looks like a platform and is not one — no physics body at all, so the
 * player falls straight through.
 *
 * IT IS DRAWN WITH THE REAL PLATFORM'S OWN TEXTURE, and that is the owner's
 * explicit call: "сделай тогда чтобы фантомные платформы выглядели точь в
 * точь как обычные, только на них нельзя встать, иначе смысла нет, если ты
 * видишь что они отличаются туда и нет смысла прыгать". Two earlier
 * versions tried to make the decoy legible instead — a dark box with orange
 * ticks, then a slab with a violet SYSTEM lip and a flicker — and both times
 * the answer was that a decoy you can identify is not a decoy.
 *
 * What keeps this honest is not the art, it is where these are allowed to
 * stand: a fake platform never has a pit, spikes or any hazard under it, so
 * falling through one costs the climb and never the attempt. That is
 * enforced in `tests/level-def-sanity.test.ts`, not by eye — it is the only
 * thing standing between this trap and an invisible kill (CLAUDE.md #4).
 */
export class FakePlatformTrap {
  readonly type = 'fake-platform';
  readonly id: string;
  readonly gameObject: Phaser.GameObjects.Image;

  constructor(scene: Phaser.Scene, config: FakePlatformConfig) {
    this.id = config.id;
    this.gameObject = scene.add.image(config.x, config.y, config.bolt ? 'tile-platform-slab-bolt' : 'tile-platform-slab');
  }

  destroy(): void {
    this.gameObject.destroy();
  }
}
