import Phaser from 'phaser';

export interface FakePlatformConfig {
  id: string;
  x: number;
  y: number;
  /** Position within its span, so a run of tiles ripples rather than blinking in unison. */
  rippleIndex?: number | undefined;
}

/**
 * Looks like a platform and is not one — no physics body at all, so the
 * player falls straight through. Honesty is entirely visual (CLAUDE.md #4 /
 * master-prompt §14 "имеет понятный визуальный сигнал"), and it has to be
 * visual that anyone reads without being told, which the still texture was
 * not: the owner looked at a screenshot of them twice and asked both times
 * what they were even for.
 *
 * So it flickers. A still translucent slab with a broken lip is a puzzle
 * about pixel differences; a slab that is visibly winking in and out is a
 * sentence — "this one is not really there" — in a vocabulary every player
 * already has. The pulse is a tween on alpha, not a per-frame redraw
 * (CLAUDE.md #9), and each tile is offset from its neighbours so a span of
 * them ripples instead of blinking as one block, which is what keeps it
 * reading as interference rather than as a deliberate light.
 */
export class FakePlatformTrap {
  readonly type = 'fake-platform';
  readonly id: string;
  readonly gameObject: Phaser.GameObjects.Image;

  private readonly flicker: Phaser.Tweens.Tween;

  constructor(scene: Phaser.Scene, config: FakePlatformConfig) {
    this.id = config.id;
    this.gameObject = scene.add.image(config.x, config.y, 'tile-fake-platform');
    this.flicker = scene.tweens.add({
      targets: this.gameObject,
      // Shallow on purpose. A deeper pulse takes the slab off the screen at
      // the bottom of every cycle, and a thing that is not there half the
      // time cannot be recognised as a platform — which is the whole job of
      // this trap's art (`drawFakePlatformTile`).
      alpha: { from: 1, to: 0.55 },
      duration: 380,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
      delay: (config.rippleIndex ?? 0) * 90,
    });
  }

  destroy(): void {
    this.flicker.stop();
    this.gameObject.destroy();
  }
}
