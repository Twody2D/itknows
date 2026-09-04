import Phaser from 'phaser';
import { PHYSICS } from '@/config/physics';
import type { InputState } from '@/utils/input/InputState';
import type { PlayerAnimState } from './PlayerAnimState';
import { EventBus } from '@/core/EventBus';
import type { DeathCause } from '@/core/EventBus';
import { InventoryService } from '@/services/InventoryService';

type LifeState = 'alive' | 'dead' | 'victory';

/**
 * Movement controller for the android. Coyote time and jump buffering exist
 * so death is always attributable to a decision, never to input latency
 * (CLAUDE.md #5).
 */
export class Player extends Phaser.Physics.Arcade.Sprite {
  declare body: Phaser.Physics.Arcade.Body;

  private inputState: InputState;
  private facing: 1 | -1 = 1;

  private lastGroundedAtMs = -Infinity;
  private lastJumpPressedAtMs = -Infinity;
  private jumpCutApplied = false;


  private currentAnim: PlayerAnimState = 'idle';
  private lifeState: LifeState = 'alive';
  private wasOnGround = true;
  /** Resolved once at spawn from the equipped skin — matches `SpriteFactory.generatePlayerTextures`'s key scheme (`'player'` for `default`, `'player-{skinId}'` otherwise). A skin equipped mid-run only applies next attempt, same as every other cosmetic (CLAUDE.md "adaptation only between attempts" spirit). */
  private readonly texPrefix: string;

  constructor(scene: Phaser.Scene, x: number, y: number, input: InputState) {
    const skinId = InventoryService.getEquipped('character');
    const texPrefix = skinId === 'default' ? 'player' : `player-${skinId}`;
    super(scene, x, y, `${texPrefix}-idle-0`);
    this.texPrefix = texPrefix;
    this.inputState = input;

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setOrigin(0.5, 1);
    // Hitbox is the ORIGINAL 6x12 box, not scaled up with the bigger 24x36
    // sprite (VISUAL RESET v1). Gap widths across every level are tuned in
    // absolute pixels against this exact box (`jumpPhysics.ts`/`LevelDef`
    // gaps) — scaling it up proportionally with the art (as a first pass
    // did, to 14x30) silently shrank the "no ground under either edge"
    // window under a 2-tile gap from 14px to 6px, which let a player just
    // run straight across it at speed with no jump at all. Forgiving-hitbox
    // margin now comes entirely from the sprite being much bigger than the
    // box, not from the box itself growing (CLAUDE.md #5).
    this.body.setSize(6, 12);
    this.body.setOffset(9, 24);
    this.body.setMaxVelocity(PHYSICS.moveSpeed * 3, PHYSICS.maxFallSpeed);
    // World bounds are wide enough vertically to fall through a pit (death is
    // triggered by a Y check before the bound would stop it) but the level's
    // left/right edges are real walls — without this, walking off either edge
    // drops the player into untelegraphed empty space with no ground tile.
    this.setCollideWorldBounds(true);

    this.play(`${texPrefix}-idle`);
  }

  isAlive(): boolean {
    return this.lifeState === 'alive';
  }

  kill(cause: DeathCause): void {
    if (this.lifeState !== 'alive') return;
    this.lifeState = 'dead';
    this.body.setVelocity(0, 0);
    this.body.enable = false;
    this.setAnim('death');
    EventBus.emit('player:died', { cause, x: this.x, y: this.y });
  }

  markVictory(): void {
    if (this.lifeState !== 'alive') return;
    this.lifeState = 'victory';
    this.body.setVelocity(0, 0);
    this.body.enable = false;
    this.setAnim('victory');
  }

  override preUpdate(time: number, delta: number): void {
    super.preUpdate(time, delta);
    if (this.lifeState !== 'alive') return;

    const dt = delta / 1000;
    const onGround = this.body.blocked.down || this.body.touching.down;
    const nowMs = time;

    if (onGround) this.lastGroundedAtMs = nowMs;
    if (this.inputState.jumpJustPressed()) this.lastJumpPressedAtMs = nowMs;

    const canCoyoteJump = nowMs - this.lastGroundedAtMs <= PHYSICS.coyoteTimeMs;
    const hasBufferedJump = nowMs - this.lastJumpPressedAtMs <= PHYSICS.jumpBufferMs;

    if (hasBufferedJump && canCoyoteJump) {
      this.body.setVelocityY(PHYSICS.jumpVelocity);
      this.lastJumpPressedAtMs = -Infinity;
      this.lastGroundedAtMs = -Infinity;
      this.jumpCutApplied = false;
      EventBus.emit('player:jumped', undefined);
    } else if (!this.inputState.isJumpDown() && this.body.velocity.y < 0 && !this.jumpCutApplied) {
      // Applied once per jump, not every frame the key stays up — multiplying
      // every frame compounded (0.45, then 0.45² within 2 frames, ...), so a
      // tap shorter than ~3 frames decayed almost to zero velocity instead of
      // a short hop. That tiny hop touched ground again almost immediately,
      // and with a jump press still buffered from rapid tapping, re-triggered
      // an instant re-jump — the character visibly juddering in place instead
      // of jumping, exactly what rapid space-tapping produced.
      this.body.setVelocityY(this.body.velocity.y * PHYSICS.jumpCutMultiplier);
      this.jumpCutApplied = true;
    }

    const wantLeft = this.inputState.left;
    const wantRight = this.inputState.right;
    const accel = onGround ? PHYSICS.acceleration : PHYSICS.airAcceleration;

    if (wantLeft && !wantRight) {
      this.facing = -1;
      this.body.setAccelerationX(-accel);
    } else if (wantRight && !wantLeft) {
      this.facing = 1;
      this.body.setAccelerationX(accel);
    } else {
      this.body.setAccelerationX(0);
      const sign = Math.sign(this.body.velocity.x);
      const friction = PHYSICS.friction * dt;
      if (Math.abs(this.body.velocity.x) <= friction) {
        this.body.setVelocityX(0);
      } else {
        this.body.setVelocityX(this.body.velocity.x - sign * friction);
      }
    }

    const maxSpeed = PHYSICS.moveSpeed;
    if (this.body.velocity.x > maxSpeed) this.body.setVelocityX(maxSpeed);
    if (this.body.velocity.x < -maxSpeed) this.body.setVelocityX(-maxSpeed);

    const gravityScale = this.body.velocity.y > 0 ? PHYSICS.fallGravityMultiplier : 1;
    this.body.setGravityY(PHYSICS.gravity * (gravityScale - 1));

    this.setFlipX(this.facing < 0);
    this.updateAnimState(onGround);
  }

  private updateAnimState(onGround: boolean): void {
    // The land squash plays out uninterrupted normally, but a fresh jump
    // (rapid tapping can trigger one before it finishes) has to visibly
    // override it — otherwise the sprite shows a landed/squashed pose while
    // actually launching upward, which is its own kind of "looks broken".
    if (this.currentAnim === 'land' && this.anims.isPlaying && this.body.velocity.y >= 0) {
      this.wasOnGround = onGround;
      return;
    }

    let next: PlayerAnimState = this.currentAnim;

    if (onGround && !this.wasOnGround) {
      next = 'land';
      EventBus.emit('player:landed', { x: this.x, y: this.y });
    } else if (!onGround && this.body.velocity.y < 0) {
      next = 'jump';
    } else if (!onGround && this.body.velocity.y >= 0) {
      next = 'fall';
    } else if (onGround && Math.abs(this.body.velocity.x) > 5) {
      next = 'run';
    } else if (onGround) {
      next = 'idle';
    }

    this.wasOnGround = onGround;
    this.setAnim(next);
  }

  private setAnim(state: PlayerAnimState): void {
    if (this.currentAnim === state && this.anims.isPlaying) return;
    this.currentAnim = state;
    this.play(`${this.texPrefix}-${state}`, true);
  }
}
