import Phaser from 'phaser';

export interface FakePlatformConfig {
  id: string;
  x: number;
  y: number;
}

/**
 * Looks exactly like a platform but has no collision at all — the player
 * falls straight through. Honesty comes entirely from the visual tell baked
 * into the `tile-fake-platform` texture (a broken top edge), never from a
 * hidden difference (CLAUDE.md #4 / master-prompt §14 "имеет понятный
 * визуальный сигнал"). No physics body: nothing to collide with.
 */
export class FakePlatformTrap {
  readonly type = 'fake-platform';
  readonly id: string;
  readonly gameObject: Phaser.GameObjects.Image;

  constructor(scene: Phaser.Scene, config: FakePlatformConfig) {
    this.id = config.id;
    this.gameObject = scene.add.image(config.x, config.y, 'tile-fake-platform');
  }

  destroy(): void {
    this.gameObject.destroy();
  }
}
