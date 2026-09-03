import Phaser from 'phaser';
import { PHYSICS } from '@/config/physics';
import type { InputState } from '@/utils/input/InputState';
import type { PlayerAnimState } from './PlayerAnimState';
import { EventBus } from '@/core/EventBus';
import type { DeathCause } from '@/core/EventBus';

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

  private isDashing = false;
  private dashEndsAtMs = 0;
  private dashReadyAtMs = 0;

  private currentAnim: PlayerAnimState = 'idle';
  private lifeState: LifeState = 'alive';
  private wasOnGround = true;

  constructor(scene: Phaser.Scene, x: number, y: number, input: InputState) {
    super(scene, x, y, 'player-idle-0');
    this.inputState = input;

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setOrigin(0.5, 1);
    this.body.setSize(6, 12);
    this.body.setOffset(2, 2);
    this.body.setMaxVelocity(PHYSICS.moveSpeed * 3, PHYSICS.maxFallSpeed);
    // World bounds are wide enough vertically to fall through a pit (death is
    // triggered by a Y check before the bound would stop it) but the level's
    // left/right edges are real walls — without this, walking off either edge
    // drops the player into untelegraphed empty space with no ground tile.
    this.setCollideWorldBounds(true);

    this.play('player-idle');
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
      EventBus.emit('player:jumped', undefined);
    } else if (!this.inputState.isJumpDown() && this.body.velocity.y < 0) {
      this.body.setVelocityY(this.body.velocity.y * PHYSICS.jumpCutMultiplier);
    }

    if (this.isDashing) {
      if (nowMs >= this.dashEndsAtMs) {
        this.isDashing = false;
      } else {
        this.body.setVelocityX(this.facing * PHYSICS.dashSpeed);
      }
    } else {
      if (this.inputState.dashJustPressed() && nowMs >= this.dashReadyAtMs) {
        this.isDashing = true;
        this.dashEndsAtMs = nowMs + PHYSICS.dashDurationMs;
        this.dashReadyAtMs = nowMs + PHYSICS.dashCooldownMs;
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
    }

    const gravityScale = this.body.velocity.y > 0 ? PHYSICS.fallGravityMultiplier : 1;
    this.body.setGravityY(PHYSICS.gravity * (gravityScale - 1));

    this.setFlipX(this.facing < 0);
    this.updateAnimState(onGround);
  }

  private updateAnimState(onGround: boolean): void {
    if (this.currentAnim === 'land' && this.anims.isPlaying) {
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
    this.play(`player-${state}`, true);
  }
}
