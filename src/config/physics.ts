/**
 * Fixed game-feel values (CLAUDE.md #5). Change only through this file, never
 * inline in gameplay code — the numbers here are what makes death feel fair.
 */
export const PHYSICS = {
  gravity: 900,
  fallGravityMultiplier: 1.25,
  maxFallSpeed: 420,

  moveSpeed: 110,
  acceleration: 900,
  airAcceleration: 700,
  friction: 1200,

  jumpVelocity: -250,
  // THERE IS NO VARIABLE JUMP HEIGHT ANY MORE. Releasing the button used to
  // cut the rise to 45% of its remaining velocity, so a tap gave a short hop
  // and a hold gave the full arc. The owner asked for it gone — "может
  // сделать всегда высокий прыжок и убрать маленький при быстром нажатии" —
  // so every jump is now the full jump, whatever the press looks like.
  //
  // This is a real trade and it is worth naming: the short hop was the only
  // way to pass under something without clearing it, and the only way to
  // land on a ledge barely above your head without overshooting it. What it
  // buys is that the height of a jump no longer depends on how long a
  // finger happened to stay on glass — which on a phone is the difference
  // between a jump and a mis-timed one, and CLAUDE.md #5 is emphatic that
  // input is never allowed to be the cause of a death.
  //
  // Nothing about level reachability changes: `jumpPhysics.ts` and the
  // solver have always measured the FULL jump, so every level is still
  // proved passable by the same numbers.
  // There is deliberately no dash. Run and jump are the whole vocabulary;
  // every level in the game is authored against that reach (`jumpPhysics.ts`),
  // and a dash on Shift only ever let a player skip past hazards they were
  // meant to read.

  /** Time after leaving a platform edge the player may still jump. */
  coyoteTimeMs: 100,
  /** Time a jump press is buffered before landing. */
  jumpBufferMs: 120,
} as const;

/**
 * Static spike hitbox, in px, against a `TILE_SIZE` (10x10) tile
 * (CLAUDE.md #5 — "хитбоксы шипов «прощают» 1-2 px"). Widened from an
 * earlier 6x4/offset(2,6) after direct playtest feedback that spike-jumps
 * should be forgiving enough for a casual player, not just a technically-
 * honest minimum — this only shrinks the margin for error on a grazing
 * near-miss, static spike columns still reliably kill on a direct run-in or
 * fall straight onto one (verified live, both cases).
 */
export const SPIKE_HITBOX_WIDTH = 4;
export const SPIKE_HITBOX_HEIGHT = 3;
export const SPIKE_HITBOX_OFFSET_X = 3;
export const SPIKE_HITBOX_OFFSET_Y = 7;

/**
 * The android's COLLISION body, in sprite pixels — what lands on ledges,
 * what a gap has to be measured against, and what an overlap zone has to
 * contain to notice the player. Every gap width in the campaign is tuned in
 * absolute pixels against this exact box, which is why it stays small while
 * the drawn android is 24x36 around it (`Player.ts`).
 */
export const PLAYER_BODY_WIDTH = 6;
export const PLAYER_BODY_HEIGHT = 12;

/**
 * The android's HURT BOX — what a hazard must touch to kill — in sprite
 * pixels, against the 24x36 frame `PLAYER_SPRITE.ts` draws.
 *
 * NOT the collision body, which is 6x12 at the feet and stays that way:
 * every gap width in the campaign is tuned in absolute pixels against it
 * (`Player.ts`). Lethality used to be read off that same box, so only the
 * android's legs could be hurt and a spike could pass through its head and
 * torso untouched — the owner sent a screenshot of exactly that. This box
 * is head + torso + legs minus 2px of forgiveness on every side; the arms
 * stay outside it, because a swinging arm clipping a spike is not what
 * anyone reads as being hit (CLAUDE.md #5).
 */
export const PLAYER_HURT_BOX_WIDTH = 12;
/** 32 of the sprite's 36 rows: the top 4 are the head's 2px cap plus the 2px it bobs. */
export const PLAYER_HURT_BOX_HEIGHT = 32;

/** Minimum time a lethal trap must telegraph before it can kill (CLAUDE.md #4.2). */
export const MIN_WARNING_MS = 250;
/** Minimum reaction window between a visible signal and required input (CLAUDE.md #4.5). */
export const MIN_REACTION_WINDOW_MS = 300;
/** Maximum time from death to a player-controlled restart (CLAUDE.md #5). */
export const MAX_RESTART_MS = 700;
