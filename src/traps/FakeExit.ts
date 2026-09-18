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
 * never glows the way the real one does (CLAUDE.md #4.7). Master-prompt §14
 * — use rarely, always fairly.
 *
 * IT TAKES THE PLAYER NOW, and does not merely refuse them. For two rounds
 * this door only shook and flashed red when touched, and both times the
 * owner's verdict was the same: "вообще не понятно зачем нужен
 * перечёркнутый фиолетовый портал, у него буквально нет никаких функций",
 * then "этот фиолетовый портал бесполезен, либо полностью переделываем,
 * либо убираем его". A door that does nothing to you is scenery, and
 * scenery is not worth walking over to check.
 *
 * So it works — just not the way its shape promises. It swallows whoever
 * steps in and puts them back at the level's spawn point, clock still
 * running (`GameplayScene.onSwallowedByFakeExit`). The cost is the whole
 * walk back and every hazard on it, which on `MIRROR` is twenty-five
 * columns, a spike pair and a piston.
 *
 * STILL NEVER LETHAL, which is the part CLAUDE.md #4.7 actually fixes: no
 * life is spent, no death is recorded, the run is not ended, and the player
 * is returned to a position the level itself guarantees is safe — it is the
 * one they started from. Being wrong here costs time, and only time.
 */
export class FakeExit {
  readonly type = 'fake-exit';
  readonly id: string;
  readonly gameObject: Phaser.GameObjects.Image;
  /** A plain rectangle swept by hand, never a physics body — see `TriggerTrap.bounds` for why an overlap zone under the player's feet is a trampoline. */
  readonly zone: Phaser.Geom.Rectangle;
  private closing: Phaser.Tweens.Tween | null = null;

  constructor(scene: Phaser.Scene, config: FakeExitConfig) {
    this.id = config.id;
    this.gameObject = scene.add.image(config.x, config.y, 'exit-inactive');

    const width = TILE_SIZE * 2;
    const height = TILE_SIZE * 3;
    this.zone = new Phaser.Geom.Rectangle(config.x - width / 2, config.y - height / 2, width, height);
  }

  /**
   * Called by the scene's contact sweep. Returns `true` on the one frame it
   * actually catches someone, so the scene runs the transit once rather
   * than restarting it every frame the player stands in the doorway.
   */
  swallow(): boolean {
    if (this.closing?.isPlaying()) return false;

    // THE ONE MOMENT IT LIGHTS UP, and it is the wrong one. The unlit core
    // is this door's honest tell and it never stops being unlit while the
    // player is deciding (CLAUDE.md #4.7); the violet flare happens only
    // after the choice is already made, so it reads as the door closing on
    // someone rather than as an invitation.
    const restX = this.gameObject.x;
    this.gameObject.setTint(PALETTE.system);
    this.closing = this.gameObject.scene.tweens.add({
      targets: this.gameObject,
      scaleX: { from: 1, to: 1.12 },
      scaleY: { from: 1, to: 0.9 },
      x: { from: restX - 1, to: restX + 1 },
      yoyo: true,
      duration: 90,
      repeat: 1,
      onComplete: () => {
        this.gameObject.clearTint();
        this.gameObject.setScale(1);
        this.gameObject.setX(restX);
      },
    });
    return true;
  }

  destroy(): void {
    this.gameObject.destroy();
  }
}
