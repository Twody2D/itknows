import Phaser from 'phaser';
import { TILE_SIZE } from '@/config/display';
import { PALETTE } from '@/config/palette';

export interface FakeExitConfig {
  id: string;
  x: number;
  y: number;
}

/**
 * A decoy exit portal. Reuses the same "inactive" (unlit) texture the real
 * exit uses before it's reachable — the honest tell is that a fake exit
 * never glows the way the real one does (CLAUDE.md #4.7). Never lethal:
 * touching it just refuses entry with a small visual bump, never ends the
 * run or damages the player. Master-prompt §14 — use rarely, always fairly.
 */
export class FakeExit {
  readonly type = 'fake-exit';
  readonly id: string;
  readonly gameObject: Phaser.GameObjects.Image;
  /** A plain rectangle swept by hand, never a physics body — see `TriggerTrap.bounds` for why an overlap zone under the player's feet is a trampoline. */
  readonly zone: Phaser.Geom.Rectangle;
  private rejecting: Phaser.Tweens.Tween | null = null;

  constructor(scene: Phaser.Scene, config: FakeExitConfig) {
    this.id = config.id;
    this.gameObject = scene.add.image(config.x, config.y, 'exit-inactive');

    const width = TILE_SIZE * 2;
    const height = TILE_SIZE * 3;
    this.zone = new Phaser.Geom.Rectangle(config.x - width / 2, config.y - height / 2, width, height);
  }

  /** Called by the scene's contact sweep — visual refusal only, never lethal. */
  reject(): void {
    // The sweep calls this every frame the player stands in the doorway, so
    // the refusal has to be one bump per visit, not a tween stacked per
    // frame.
    if (this.rejecting?.isPlaying()) return;
    // A red rattle, not a fade. Fading out is what a thing does when it is
    // disappearing; the owner read it as the door doing something to him
    // ("зачем он моргает когда в нём стоишь"). A door that shakes and
    // flashes red is one that refused, which is what actually happened.
    const restX = this.gameObject.x;
    this.gameObject.setTint(PALETTE.danger);
    this.rejecting = this.gameObject.scene.tweens.add({
      targets: this.gameObject,
      x: { from: restX - 1, to: restX + 1 },
      yoyo: true,
      duration: 55,
      repeat: 2,
      onComplete: () => {
        this.gameObject.clearTint();
        this.gameObject.setX(restX);
      },
    });
  }

  destroy(): void {
    this.gameObject.destroy();
  }
}
