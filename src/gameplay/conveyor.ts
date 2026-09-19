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
 * The number is an honesty rule rather than a taste setting: walking against
 * the belt has to remain possible, or a strip of floor becomes a wall
 * `LevelValidator` cannot see — it counts a conveyor as ordinary footing. It
 * is the rule the pursuer already lives under (CLAUDE.md #13), applied to the
 * ground itself.
 *
 * RAISED FROM 60 ON 2026-09-19, after the owner played the finished campaign:
 * «DRIFT полоска бесполезная, еле еле двигает тебя, нужно менять,
 * например чтобы сразу сносила в бок». The cap was never the problem — no
 * belt in the campaign was anywhere near it. Every one ran at 40-50 against
 * the player's 110, so standing still drifted at under half walking pace and
 * the floor read as a texture rather than a force. The ceiling moves to give
 * the belts room; the belts move with it.
 *
 * 72 AND NOT MORE, and the ceiling on the ceiling came from a test rather
 * than from taste: `tests/conveyor.test.ts` already demanded that upstream
 * progress stay worth making — better than a third of the player's normal
 * pace — and not merely non-zero. A first attempt at 80 broke it. At 72 the
 * player still makes 38 px/s against the belt, so no belt is ever a wall and
 * no route is ever closed; what changes is that standing still now drifts at
 * seven tiles a second instead of four, which is the difference between a
 * texture and a force.
 */
export const MAX_CONVEYOR_SPEED = 72;

/** True for a speed a belt is allowed to run at — `tests/conveyor.test.ts` holds every level to it. */
export function isHonestConveyorSpeed(speed: number): boolean {
  return Math.abs(speed) > 0 && Math.abs(speed) <= MAX_CONVEYOR_SPEED && Math.abs(speed) < PHYSICS.moveSpeed;
}

/** Ground speed a player makes over a belt, walking in `direction` (+1 right, -1 left). */
export function effectiveWalkSpeed(beltSpeed: number, direction: 1 | -1): number {
  return Math.max(20, PHYSICS.moveSpeed + direction * beltSpeed);
}
