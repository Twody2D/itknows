import Phaser from 'phaser';
import { Trap } from './Trap';
import type { TrapPhase } from './Trap';
import type { TrapTiming } from './TrapTiming';

/** How long the bank takes to cross from peek to lethal — lethal throughout. */
const PUNCH_MS = 120;

/**
 * How far out of its resting position the bank shows during `warning`, in px.
 *
 * A floor bank rests one row UNDER the ground (`hiddenRow: 23` against a
 * `groundRow` of 22), so "visible at the resting position" would be a spike
 * drawn through the floor — not a telegraph, just a rendering artefact. It
 * peeks instead: four pixels of tips over the floor line, motionless, for the
 * whole of `warningMs`. A ceiling bank rests in open air and is readable
 * either way; it peeks by the same amount so both orientations behave
 * identically.
 */
const PEEK_PX = 4;

export interface SpikeBankConfig {
  id: string;
  x: number;
  /** World Y of the retracted/idle position — either side of `yLethal`. */
  yHidden: number;
  /** World Y it reaches at `active` — where it's actually lethal. */
  yLethal: number;
  timing?: TrapTiming | undefined;
  initialIdleMs?: number | undefined;
  loop?: boolean | undefined;
}

/**
 * One column of `spike-bank` (see `TrapDef.ts` for the full reasoning) — a
 * single tile-wide instance; `width > 1` in the level data spawns several of
 * these side by side, each independently timed but sharing the same config,
 * so they stay in lockstep the same way `disappearing-platform`/
 * `falling-platform` already do for their own `width`.
 *
 * Hidden at `idle`; at `warning` it shows its tips and holds them still for
 * the whole telegraph; at `active` it crosses to the lethal position, and it
 * kills for every millisecond of that crossing; at `cooldown` it vanishes in
 * one frame rather than gliding back. Nothing that moves is ever harmless and
 * nothing harmless is ever in the way — see the `warning` case for the bug
 * that cost. It differs from `AmbushSpikeTrap` in what it is for
 * rather than in what it shows: this loops on its own timer by default and
 * is ordinary reusable content, where the ambush spike is a one-shot
 * narrative device fired by a trigger.
 */
export class SpikeBankTrap extends Trap {
  readonly gameObject: Phaser.Physics.Arcade.Sprite;

  private readonly scene: Phaser.Scene;
  private readonly x: number;
  private readonly yHidden: number;
  private readonly yLethal: number;
  /** Where the tips show during `warning` — see `PEEK_PX`. */
  private readonly peekY: number;
  private moveTween: Phaser.Tweens.Tween | null = null;

  constructor(scene: Phaser.Scene, config: SpikeBankConfig) {
    super('spike-bank', config.id, { timing: config.timing, loop: config.loop, initialIdleMs: config.initialIdleMs });
    this.scene = scene;
    this.x = config.x;
    this.yHidden = config.yHidden;
    this.yLethal = config.yLethal;
    this.peekY = config.yHidden + Math.sign(config.yLethal - config.yHidden) * PEEK_PX;

    this.gameObject = scene.physics.add.sprite(config.x, config.yHidden, 'tile-spike');
    // `tile-spike` is drawn tips-up, for punching up out of a floor. A bank
    // whose hidden position is ABOVE its lethal one (`yHidden < yLethal`)
    // hangs from a ceiling and punches down instead — flip it once, at
    // construction, so the tips point at the player it threatens rather
    // than away from them ("шипы сверху переверни текстуру, чтобы они
    // смотрели вниз", owner). A floor bank (`yHidden > yLethal`) is
    // untouched.
    if (this.yHidden < this.yLethal) this.gameObject.setFlipY(true);
    const body = this.gameObject.body as Phaser.Physics.Arcade.Body;
    body.setAllowGravity(false);
    body.setImmovable(true);
    body.setSize(6, 4);
    body.setOffset(2, 6);

    this.onEnterPhase('idle');
  }

  protected onEnterPhase(phase: TrapPhase): void {
    if (!this.gameObject) return; // guard: base constructor calls this before field assignment
    this.moveTween?.stop();
    this.moveTween = null;
    switch (phase) {
      case 'idle':
        // Fully hidden, not dimly visible. It used to idle at alpha 0.35 as
        // a standing tell; the owner asked for it gone after playing
        // ("шипы, которые под землёй, заранее не были видны"). The honest warning is
        // the `warning` phase below.
        this.gameObject.setPosition(this.x, this.yHidden);
        this.gameObject.setAlpha(0);
        break;
      case 'warning':
        // IT SITS, THEN PUNCHES — and the punch itself now happens in
        // `active`, where it kills. The bank used to travel the whole way
        // here, over `warningMs` and on `Quint.easeIn`, so the last quarter
        // of the telegraph slammed it through the corridor while
        // `isLethal()` was still false: on HOLD FIRE that is a spike
        // visibly crossing the launch lane and passing straight through the
        // android ("я как будто пролетел через край шипов сверху и не умер", owner, 2026-09-19).
        // It is the same defect the drop spike was repaired of on
        // 2026-09-14, and this is the same repair: telegraph and travel
        // swapped, never overlapping.
        //
        // The warning is now exactly what CLAUDE.md #4.2 asks one to be — a
        // visible, motionless signal at the resting position for the full
        // `warningMs` — and no number in any level changes. That matters
        // beyond tidiness: CLAUDE.md #4.5's launch-pad clause sizes HOLD
        // FIRE's 900 ms against the flight through the band, and that sum is
        // measured from the first visible frame to the first lethal one,
        // which is still the whole of `warningMs`.
        this.gameObject.setPosition(this.x, this.peekY);
        this.gameObject.setAlpha(1);
        break;
      case 'active':
        // THE TRAVEL, AND IT IS LETHAL FOR ALL OF IT. `PUNCH_MS` is short on
        // purpose — the owner asked for spikes that snap rather than glide —
        // and `sweepLethalContact` stretches a hazard's rectangle back over
        // the ground it covered since the last frame, so a bank crossing
        // four tiles in 120 ms cannot step over the android between two
        // frames.
        this.gameObject.setAlpha(1);
        this.moveTween = this.scene.tweens.add({
          targets: this.gameObject,
          y: this.yLethal,
          duration: Math.min(PUNCH_MS, this.timing.activeMs),
          ease: 'Quad.easeIn',
        });
        break;
      case 'cooldown':
        // GONE IN THE SAME FRAME, not withdrawn over `cooldownMs`. The glide
        // back was the second half of the same bug: several hundred
        // milliseconds of a spike visibly occupying the corridor while unable
        // to kill. "Visible only while it's actually a threat" is the owner's
        // own framing, already applied to the drop spike.
        this.gameObject.setPosition(this.x, this.yHidden);
        this.gameObject.setAlpha(0);
        break;
    }
  }


  destroy(): void {
    this.moveTween?.stop();
    this.gameObject.destroy();
  }
}
