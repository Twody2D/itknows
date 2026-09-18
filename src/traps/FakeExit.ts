import Phaser from 'phaser';
import { TILE_SIZE } from '@/config/display';
import { PALETTE } from '@/config/palette';

export interface FakeExitConfig {
  id: string;
  /** Centre of the doorway, the same `col * TILE_SIZE + TILE_SIZE` the real exit uses. */
  x: number;
  /** The surface line the door stands on — `row * TILE_SIZE`, matching the real exit's `exitSurfaceY`. */
  surfaceY: number;
}

/**
 * A decoy exit portal, drawn pixel-for-pixel like the real one.
 *
 * IT USED TO BE TELLABLE, and CLAUDE.md #4.7 used to require that: the
 * decoy wore the unlit `exit-inactive` texture, had no glow, and sat 10px
 * lower than a real door. The owner's call, 2026-09-18, was to take all
 * three away — "сделай тогда чтобы он визуально не отличался от обычного
 * портала" — which is the same decision already on record for
 * `fake-platform` and `falling-platform`: a decoy you can identify from
 * across the room is not a decoy, it is a labelled detour.
 *
 * So this now builds itself from the real door's own recipe (`Level.ts`'s
 * exit block): `exit-active`, bottom-anchored on the surface line, and the
 * same 1400ms cyan glow pulse. Identical by construction rather than by
 * two lists of numbers that have to be kept in step by hand.
 *
 * WHAT MAKES THAT FAIR, since nothing on screen distinguishes it any more:
 * it is never lethal, and — as of the same round — it is never in the way.
 * The player has to walk past their own route to reach it (see `MIRROR`'s
 * own note), and what it costs them is the walk back. An unreadable trap
 * whose price is time, standing somewhere you had to choose to go, is a
 * question. The same trap standing across the only corridor would be a
 * toll booth, which is what the owner actually hit: "портал невозможно
 * обойти".
 *
 * Master-prompt §14 — use rarely, always fairly.
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
  private readonly glowPulse: Phaser.Tweens.Tween;

  constructor(scene: Phaser.Scene, config: FakeExitConfig) {
    this.id = config.id;

    // Every number below is the real exit's, copied from `Level.ts`'s exit
    // block on purpose — texture, anchor and glow. If that door's look ever
    // changes, this one has to change with it or the decoy starts giving
    // itself away again.
    this.gameObject = scene.add.image(config.x, config.surfaceY, 'exit-active').setOrigin(0.5, 1);
    const glow = this.gameObject.postFX.addGlow(PALETTE.cyan, 1, 0, false, 0.3, 6);
    this.glowPulse = scene.tweens.add({
      targets: glow,
      outerStrength: { from: 1, to: 4 },
      duration: 1400,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // Also the real door's: a 2x3 catch area standing on the surface line.
    const width = TILE_SIZE * 2;
    const height = TILE_SIZE * 3;
    this.zone = new Phaser.Geom.Rectangle(config.x - width / 2, config.surfaceY - height, width, height);
  }

  /**
   * Called by the scene's contact sweep. Returns `true` on the one frame it
   * actually catches someone, so the scene runs the transit once rather
   * than restarting it every frame the player stands in the doorway.
   */
  swallow(): boolean {
    if (this.closing?.isPlaying()) return false;

    // THE ONLY MOMENT IT DIFFERS FROM A REAL DOOR, and it comes strictly
    // after the choice has been made: cyan turns violet and the frame
    // snaps shut. Nothing here is a warning — there is nothing left to warn
    // about, since the trap is not lethal and the player is already inside
    // it. It is the answer to "what just happened to me", which a silent
    // teleport would leave unanswered.
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
    this.glowPulse.stop();
    this.closing?.stop();
    this.gameObject.destroy();
  }
}
