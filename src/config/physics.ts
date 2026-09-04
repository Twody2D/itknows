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
  jumpCutMultiplier: 0.45,
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

/** Minimum time a lethal trap must telegraph before it can kill (CLAUDE.md #4.2). */
export const MIN_WARNING_MS = 250;
/** Minimum reaction window between a visible signal and required input (CLAUDE.md #4.5). */
export const MIN_REACTION_WINDOW_MS = 300;
/** Maximum time from death to a player-controlled restart (CLAUDE.md #5). */
export const MAX_RESTART_MS = 700;
