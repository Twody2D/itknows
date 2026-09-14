import Phaser from 'phaser';
import { PALETTE } from '@/config/palette';
import { TILE_SIZE } from '@/config/display';

export interface FallingPlatformConfig {
  id: string;
  x: number;
  y: number;
  /**
   * Frames of ordinary, unchanged, solid floor between contact and the
   * drop — nothing is shown during it, the tile just still holds. Zero by
   * default: the floor goes the instant it is touched.
   *
   * It is the only knob a `variant` has left on this trap, and the only
   * thing between a running player and the pit, so where a level uses it
   * it is sized in strides: at `moveSpeed` 110px/s, 320ms is three and a
   * half tiles of crossing.
   */
  holdMs?: number | undefined;
  /** Speed at the instant the floor lets go, px/s. It accelerates from here — see `FALL_ACCEL`. */
  fallSpeed?: number | undefined;
  /**
   * Texture for the slab. Passed in by `Level.ts` so a trapdoor can be
   * drawn with the very tile the ground around it uses — a floor that
   * announces itself is a floor nobody walks on.
   */
  texture?: string | undefined;
  /**
   * True when this sits in the ground row and has to pass for ground:
   * it then carries the bright cyan lip every run of floor has, so the
   * level's edge reads as one unbroken line across it.
   *
   * False for a stone hanging in mid-air over a pit (sector 02's
   * FREEFALL), which carries no lip of its own: it takes
   * `tile-platform-slab-cracked` instead (see `Level.ts`), the same slab
   * its neighbours are drawn with, fractured. The player can still tell
   * which stones fall — they have to be able to, these hang over pits —
   * but the row reads as one material rather than as patches of floor
   * dropped into a run of platforms.
   */
  asFloor?: boolean | undefined;
  /**
   * Default (unset/false): the ordinary floor that sinks once it is stood
   * on — the player is already on top of it when it starts to go.
   *
   * `true`: an armed trapdoor instead. Standing on it does nothing; it
   * only goes when something else fires `trigger()` — in practice a
   * `trigger` zone placed a couple of columns *before* it, so the floor
   * drops out ahead of a running player rather than under a stationary
   * one. Direct request from the project owner: a floor that gives way
   * slowly underfoot can simply be outrun, so it never actually asks for
   * anything; this one springs, and doing nothing about it means falling.
   */
  armed?: boolean | undefined;
  /**
   * Height in pixels of the sub-surface rock to draw underneath this slab,
   * for a trapdoor sitting in the ground row.
   *
   * `Level.ts` paints that rock per contiguous *run* of ground, and a
   * trapdoor's columns are a gap in the level's geometry — so the run
   * stopped short on either side and the level showed a black shaft the
   * full height of the screen under a floor that still looked solid
   * (owner, playing: "ловушки всё равно видно"). Measured on DROP: the
   * strip below the floor read rgb(11,11,20) as rock and rgb(5,5,10) at
   * exactly cols 12-15, 22-25, 32-35 and 39-42 — the four trapdoors,
   * legible from across the level before anything had been triggered.
   *
   * The rock is hidden the moment the slab starts to fall, so the shaft
   * opens as the floor sinks into it.
   */
  shaftDepthPx?: number | undefined;
}

type State = 'armed' | 'solid' | 'doomed' | 'falling' | 'gone';

/** Width of the bright cyan lip `Level.ts` paints along every run of ground. */
const RIM_HEIGHT = 2;

/**
 * Downward acceleration of a slab that has let go, px/s².
 *
 * It used to fall at a flat 100px/s, chosen back when the slab had to keep
 * the player standing on it long enough to carry them past the lip of the
 * pit. That is no longer its job — a collapsing floor is not something you
 * can push off any more (`isCollapsing`), so the fall does not have to be
 * slow to be fatal, and being slow made it read as a lift: "сделай так,
 * чтобы земля быстрее падала вниз, чтобы не было эффекта, что я вниз еду на
 * лифте" (owner). A shade above the world's own 900 so the floor pulls away
 * from the player rather than lowering them.
 */
const FALL_ACCEL = 1100;

/**
 * Two floors in one trap, selected by `armed`.
 *
 * Unarmed: solid until the player stands on it, then it goes — at once,
 * unless `holdMs` buys a beat of ordinary-looking floor first.
 *
 * Armed: a trapdoor that ignores being stood on and springs when its
 * `trigger` zone fires a few columns earlier, so the pit opens in the floor
 * ahead of a running player.
 *
 * NOTHING IS SHOWN BEFORE EITHER OF THEM GOES. There used to be a warning
 * phase — the tile shook and flashed red while still holding — and the
 * owner asked for it gone: "давай сделаем так, чтобы платформы не
 * предупреждали о падении, а сразу падали", and when told that trades away
 * the telegraph CLAUDE.md #4.2 asks for, "делаем всё равно, всё равно на
 * инвариант честности". His call on his own design rule, recorded as such
 * in CLAUDE.md #4 — this comment is here so nobody later reads the missing
 * telegraph as an oversight and quietly puts it back.
 *
 * WHAT DID NOT CHANGE is everything that keeps the game finishable. The
 * trapdoor's trigger still sits `TRAPDOOR_LEAD` columns ahead of the pit,
 * so the hole is open and in plain sight for the whole run-up — longer than
 * before, in fact, because it used to spend that run-up still closed and
 * flashing. And `LevelValidator` still counts no falling floor as a surface
 * at all, so every level is proved passable with all of them already gone
 * (CLAUDE.md #4.3/#4.4). Softlock stays impossible; only the warning went.
 *
 * NEITHER COMES BACK, either. They used to respawn after a couple of
 * seconds, which the owner called out as soon as he played it ("после того
 * как земля упала она появляется на том месте через пару секунд, так не
 * должно быть") — a floor that reassembles itself reads as a bug, and it
 * quietly turns a trap into a waiting game.
 *
 * A floor in the ground row carries its own cyan lip and its own
 * sub-surface rock, because `Level.ts` paints both per contiguous run and a
 * trapdoor is not part of one — without them it would be a bright edge with
 * a notch in it over a black shaft, which is the one tell it must not have.
 */
export class FallingPlatformTrap {
  readonly type = 'falling-platform';
  readonly id: string;
  readonly gameObject: Phaser.Physics.Arcade.Sprite;
  private readonly rim: Phaser.GameObjects.Rectangle | null;
  private readonly shaft: Phaser.GameObjects.TileSprite | null;
  private readonly body: Phaser.Physics.Arcade.Body;

  private state: State;
  private timerMs = 0;
  private readonly originX: number;
  private readonly originY: number;
  private readonly holdMs: number;
  private readonly fallSpeed: number;
  private readonly armed: boolean;

  constructor(scene: Phaser.Scene, config: FallingPlatformConfig) {
    this.id = config.id;
    this.originX = config.x;
    this.originY = config.y;
    this.armed = config.armed ?? false;
    // THE FLOOR RIPS AWAY; it does not descend. Both of these used to be
    // tuned around carrying the player gently down past the lip of the pit,
    // because back then they could still jump off and the slow ride was the
    // only thing that made the trap fatal. Since a collapsing floor stopped
    // being jumpable (`isCollapsing`), the ride buys nothing and cost the
    // moment its whole feel: a floor sinking at 100px/s for half a second
    // is a lift, which is exactly what the owner called it.
    //
    // So: a short shove, then `FALL_ACCEL`. `holdMs` is only there so the
    // first frames read as the floor taking the player with it — by the end
    // of it the slab is already moving faster than they are and leaves on
    // its own.
    this.holdMs = Math.max(config.holdMs ?? 0, 0);
    this.fallSpeed = config.fallSpeed ?? 120;
    this.state = this.armed ? 'armed' : 'solid';

    this.gameObject = scene.physics.add.sprite(config.x, config.y, config.texture ?? 'tile-ground-top');
    this.body = this.gameObject.body as Phaser.Physics.Arcade.Body;
    this.body.setAllowGravity(false);
    this.body.setImmovable(true);

    this.rim = config.asFloor
      ? scene.add
          .rectangle(config.x, config.y - TILE_SIZE / 2, TILE_SIZE, RIM_HEIGHT, PALETTE.cyan, 0.85)
          .setOrigin(0.5, 0)
      : null;

    // Behind everything drawn at the default depth (the slab included, so
    // it sinks *in front of* the rock for the frame the two overlap), but
    // in front of the backdrop and the side walls at -4..-6. Tile-aligned
    // to the same grid as the runs either side, so the texture's phase
    // matches theirs and the seam is invisible.
    this.shaft =
      config.shaftDepthPx && config.shaftDepthPx > 0
        ? scene.add
            .tileSprite(
              config.x - TILE_SIZE / 2,
              config.y + TILE_SIZE / 2,
              TILE_SIZE,
              config.shaftDepthPx,
              'tile-ground-fill',
            )
            .setOrigin(0, 0)
            .setDepth(-1)
        : null;
  }

  notifyStandingOn(): void {
    // An armed trapdoor ignores being stood on entirely — that is the
    // point of it. It waits for its trigger.
    if (this.state !== 'solid') return;
    this.beginCollapse();
  }

  /** `Triggerable` — fired by a `trigger` zone placed ahead of this floor. */
  trigger(): void {
    if (this.state !== 'armed') return;
    this.beginCollapse();
  }

  /** Straight to the drop, or `holdMs` of ordinary-looking floor first where a level asks for one. */
  private beginCollapse(): void {
    this.timerMs = 0;
    if (this.holdMs > 0) {
      this.state = 'doomed';
      return;
    }
    this.state = 'falling';
    this.shaft?.setVisible(false);
    this.startFalling();
  }

  /**
   * True once the floor has let go. It is no longer solid at all by then,
   * so the player is already falling — this exists to take their coyote
   * time with it, which is what stops a vanished floor from still being
   * something you can push off ("земля когда падала — от неё нельзя
   * оттолкнуться", owner). `GameplayScene` sweeps for it each frame,
   * because the collider that used to report it stops firing the instant
   * the floor stops being solid.
   */
  isCollapsing(): boolean {
    return this.state === 'falling';
  }

  isSolid(): boolean {
    return this.state === 'armed' || this.state === 'solid' || this.state === 'doomed';
  }

  update(_time: number, delta: number): void {
    if (this.state === 'solid' || this.state === 'armed' || this.state === 'gone') return;

    this.timerMs += delta;

    if (this.state === 'doomed') {
      // Deliberately silent: no tint, no shake, no sink. The floor is as
      // solid and as ordinary as it looks, right up to the frame it is not
      // there at all.
      if (this.timerMs >= this.holdMs) {
        this.state = 'falling';
        this.timerMs = 0;
        this.shaft?.setVisible(false);
        this.startFalling();
      }
      return;
    }

    this.gameObject.x = this.originX + Math.sin(this.timerMs * 0.08) * 1.2;
    this.syncRim();
    if (this.gameObject.y - this.originY > 200) {
      this.state = 'gone';
      this.timerMs = 0;
      this.gameObject.setVisible(false);
      this.rim?.setVisible(false);
      this.body.setAccelerationY(0);
      this.body.setVelocityY(0);
    }
  }

  private startFalling(): void {
    this.body.setVelocityY(this.fallSpeed);
    this.body.setAccelerationY(FALL_ACCEL);
  }

  private syncRim(): void {
    this.rim?.setPosition(this.gameObject.x, this.gameObject.y - TILE_SIZE / 2);
  }

  destroy(): void {
    this.shaft?.destroy();
    this.rim?.destroy();
    this.gameObject.destroy();
  }
}
