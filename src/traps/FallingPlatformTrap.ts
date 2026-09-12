import Phaser from 'phaser';
import { PALETTE } from '@/config/palette';
import { TILE_SIZE } from '@/config/display';
import { MIN_WARNING_MS } from '@/config/physics';

export interface FallingPlatformConfig {
  id: string;
  x: number;
  y: number;
  /**
   * How long the platform keeps carrying the player while it sinks, before
   * collision drops out from under them — the telegraph. Contact starts the
   * sink immediately (no idle shake beforehand); this window is what makes
   * that honest (CLAUDE.md #4.2/#4.5 — `MIN_WARNING_MS`/`MIN_REACTION_WINDOW_MS`).
   */
  holdMs?: number | undefined;
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
}

type State = 'armed' | 'warning' | 'solid' | 'falling' | 'gone';

/** Width of the bright cyan lip `Level.ts` paints along every run of ground. */
const RIM_HEIGHT = 2;

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
    // AN ARMED TRAPDOOR TAKES THE PLAYER WITH IT, and these two numbers are
    // what make that happen rather than a near miss. Dropping collision the
    // instant it springs does not work: a running player covers the last
    // columns of the floor in ~100ms, free fall moves them barely 5px in
    // that time, and they step off the far edge having visibly wobbled and
    // survived (measured live — the trap fired correctly and killed
    // nobody). A fast sinking floor does not work either; it simply leaves
    // from under them, which is the same thing.
    //
    // So it sinks *slower* than gravity would take them: 100px/s keeps the
    // player standing on it, riding it down, for the whole 520ms. By the
    // end they are 52px below the lip of the pit — past a 34.7px jump, so
    // there is no way back out — and the floor stops holding. Jumping off
    // early still works for most of the ride, which is the skill the trap
    // rewards on the attempts after the first one.
    this.holdMs = config.holdMs ?? (this.armed ? 520 : 320);
    this.fallSpeed = config.fallSpeed ?? (this.armed ? 100 : 180);
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
  }

  notifyStandingOn(): void {
    // An armed trapdoor ignores being stood on entirely — that is the
    // point of it. It waits for its trigger.
    if (this.state !== 'solid') return;
    this.state = 'falling';
    this.timerMs = 0;
    this.body.setVelocityY(this.fallSpeed);
  }

  /** `Triggerable` — fired by a `trigger` zone placed ahead of this floor. */
  trigger(): void {
    if (this.state !== 'armed') return;
    this.state = 'warning';
    this.timerMs = 0;
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
        this.body.setVelocityY(this.fallSpeed);
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
        this.body.setVelocityY(0);
      }
    }
  }

  private syncRim(): void {
    this.rim?.setPosition(this.gameObject.x, this.gameObject.y - TILE_SIZE / 2);
  }

  destroy(): void {
    this.rim?.destroy();
    this.gameObject.destroy();
  }
}
