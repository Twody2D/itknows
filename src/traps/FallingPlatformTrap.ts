import Phaser from 'phaser';
import { PALETTE } from '@/config/palette';
import { TILE_SIZE } from '@/config/display';
import { MIN_WARNING_MS } from '@/config/physics';

export interface FallingPlatformConfig {
  id: string;
  x: number;
  y: number;
  /**
   * How long the slab keeps carrying the player after it lets go, before
   * collision drops out from under them. NOT the telegraph any more — the
   * warning phase before it is (see `warnMs`) — so it is short: just long
   * enough that the floor is visibly taking the player with it rather than
   * blinking out under their feet.
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
   * FREEFALL), where the opposite is wanted — it keeps the plain ground
   * tile and no lip, so it is visibly not one of the level's solid slabs
   * and the player can choose their route across.
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
   * Armed mode only: how long the floor visibly shakes and flashes red
   * after being triggered, before it stops holding anything. Floored at
   * `MIN_WARNING_MS` (CLAUDE.md #4.2) — the flash is the whole telegraph,
   * so it is never allowed to be shorter than the honesty invariant.
   */
  warnMs?: number | undefined;
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

type State = 'armed' | 'warning' | 'solid' | 'falling' | 'gone';

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
 * Unarmed (the original): solid ground until the player steps on it, then
 * it immediately starts sinking under them, still carrying them for
 * `holdMs` before collision drops out.
 *
 * Armed: a trapdoor that ignores being stood on and springs when its
 * `trigger` zone fires — placed a column or two earlier, so the floor
 * ahead of a running player flashes red, shakes for `warnMs`, and then is
 * not there.
 *
 * NEITHER COMES BACK. They used to respawn after a couple of seconds, which
 * the owner called out as soon as he played it ("после того как земля упала
 * она появляется на том месте через пару секунд, так не должно быть") — and
 * he is right twice over: a floor that reassembles itself reads as a bug,
 * and it quietly turns a trap into a waiting game. `LevelValidator` counts
 * no falling floor as a surface at all, so every level is proved passable
 * with all of them already gone and nothing can strand the player
 * (CLAUDE.md #4.4).
 *
 * It also carries its own cyan lip, because `Level.ts` paints that rim per
 * run of ground and a trapdoor is not part of one — without it the floor
 * would have a bright edge with a dull two-metre notch in it, which is
 * exactly the tell the trap must not have.
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
  private readonly warnMs: number;

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
    this.holdMs = config.holdMs ?? (this.armed ? 180 : 160);
    this.fallSpeed = config.fallSpeed ?? 120;
    this.warnMs = Math.max(config.warnMs ?? 350, MIN_WARNING_MS);
    this.state = this.armed ? 'armed' : 'solid';

    this.gameObject = scene.physics.add.sprite(config.x, config.y, config.texture ?? 'tile-ground');
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
    // Shake and flash first, THEN go. It used to start sinking on contact,
    // which made the sink itself the telegraph — and a sinking floor you
    // can still jump off is barely a trap at all: CRUMBLE was cleared by
    // walking across it (owner: "сектор Crumble слишком лёгкий и проходится
    // очень просто"). Now the tile announces itself for `warnMs` while it
    // is still solid footing, and once it actually lets go there is no
    // pushing off it. The honest window is that warning, not the fall.
    this.state = 'warning';
    this.timerMs = 0;
  }

  /** `Triggerable` — fired by a `trigger` zone placed ahead of this floor. */
  trigger(): void {
    if (this.state !== 'armed') return;
    this.state = 'warning';
    this.timerMs = 0;
  }

  /**
   * True once the floor has actually let go — it still carries the player
   * for `holdMs`, but it is no longer something to jump from.
   *
   * `GameplayScene` feeds this to `Player.notifyFootingCollapsed()`, which
   * is what makes the trap cost something: "земля когда падала — от неё
   * нельзя оттолкнуться" (owner). The escape is the warning phase before
   * this, which is `warnMs` long and never shorter than `MIN_WARNING_MS`.
   */
  isCollapsing(): boolean {
    return this.state === 'falling';
  }

  isSolid(): boolean {
    if (this.state === 'armed' || this.state === 'solid' || this.state === 'warning') return true;
    if (this.state === 'falling') return this.timerMs < this.holdMs;
    return false;
  }

  update(_time: number, delta: number): void {
    if (this.state === 'solid' || this.state === 'armed') return;

    this.timerMs += delta;

    if (this.state === 'warning') {
      // Shaking hard and flashing red, still carrying whatever is on it.
      // Everything the player needs in order to jump is on screen for the
      // whole of `warnMs` before the floor stops holding.
      this.gameObject.x = this.originX + Math.sin(this.timerMs * 0.05) * 1.5;
      const flash = Math.floor(this.timerMs / 80) % 2 === 0 ? PALETTE.danger : PALETTE.dangerAlt;
      this.gameObject.setTint(flash);
      this.rim?.setFillStyle(flash, 1);
      this.syncRim();
      if (this.timerMs >= this.warnMs) {
        this.state = 'falling';
        this.timerMs = 0;
        this.gameObject.clearTint();
        this.shaft?.setVisible(false);
        this.startFalling();
      }
      return;
    }

    if (this.state === 'falling') {
      const wobble = Math.sin(this.timerMs * 0.08) * 1.2;
      this.gameObject.x = this.originX + wobble;
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
