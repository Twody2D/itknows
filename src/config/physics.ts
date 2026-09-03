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

  jumpVelocity: -240,
  jumpCutMultiplier: 0.45,

  /** Time after leaving a platform edge the player may still jump. */
  coyoteTimeMs: 100,
  /** Time a jump press is buffered before landing. */
  jumpBufferMs: 120,

  dashSpeed: 320,
  dashDurationMs: 140,
  dashCooldownMs: 500,
} as const;

/** Minimum time a lethal trap must telegraph before it can kill (CLAUDE.md #4.2). */
export const MIN_WARNING_MS = 250;
/** Minimum reaction window between a visible signal and required input (CLAUDE.md #4.5). */
export const MIN_REACTION_WINDOW_MS = 300;
/** Maximum time from death to a player-controlled restart (CLAUDE.md #5). */
export const MAX_RESTART_MS = 700;
