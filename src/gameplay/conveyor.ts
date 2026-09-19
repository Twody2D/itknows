import { PHYSICS } from '@/config/physics';

/**
 * The conveyor's rules, apart from the thing that draws it.
 *
 * `traps/ConveyorTrap.ts` needs Phaser; a rule that only the browser can
 * state is a rule no test can check, and this one has to be checked against
 * every level in the campaign. Same split `gameplay/stars.ts` and
 * `gameplay/jumpPhysics.ts` already use.
 */

/**
 * THE FASTEST THE FLOOR MAY EVER PULL, in px/s.
 *
 * A little over half the player's own speed, and the number is an honesty
 * rule rather than a taste setting: walking against the belt has to remain
 * possible, or a strip of floor becomes a wall `LevelValidator` cannot see —
 * it counts a conveyor as ordinary footing. It is the rule the pursuer
 * already lives under (CLAUDE.md #13), applied to the ground itself.
 */
export const MAX_CONVEYOR_SPEED = 60;

/** True for a speed a belt is allowed to run at — `tests/conveyor.test.ts` holds every level to it. */
export function isHonestConveyorSpeed(speed: number): boolean {
  return Math.abs(speed) > 0 && Math.abs(speed) <= MAX_CONVEYOR_SPEED && Math.abs(speed) < PHYSICS.moveSpeed;
}

/** Ground speed a player makes over a belt, walking in `direction` (+1 right, -1 left). */
export function effectiveWalkSpeed(beltSpeed: number, direction: 1 | -1): number {
  return Math.max(20, PHYSICS.moveSpeed + direction * beltSpeed);
}
