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
  // Variable jump height is back (owner, 2026-09-14, one round after asking
  // for it gone — "верни всё же разные прыжки, по степени нажатия
  // пробела"). Releasing the button cuts the rise to 45% of its remaining
  // upward velocity, so a tap gives a short hop and a hold gives the full
  // arc — this is the reach the short-hop trick from before removal used,
  // restored rather than reinvented (`Player.ts`, once-per-jump guard
  // included, since a naive per-frame cut is what caused the juddering
  // re-jump bug the guard exists for).
  //
  // Nothing about level reachability changes: `jumpPhysics.ts` and the
  // solver have always measured the FULL jump (the held-button case), so
  // every level is proved passable independent of this multiplier.
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

/**
 * Hitboxes of the traps that move, in px, against a `TILE_SIZE` (10x10) tile.
 *
 * They live here rather than in each trap class because two different things
 * have to agree on them: the classes that hand them to Arcade, and
 * `gameplay/routeTrace.ts`, which asks whether the player's body can ever be
 * where a trap is and must not run Phaser to do it. The detector's first
 * version restated them as whole tiles, and a 3 px beam widened to 10 px is
 * how a laser standing inside RELAY's exit door was reported as fine.
 */
export const TRAP_HITBOX = {
  /**
   * Ground-mounted spikes: the box sits at the BASE of the tile, which is
   * the forgiving thing to do when the player runs into spikes standing
   * point-up on a surface.
   */
  spikeBase: { width: 6, height: 4, offsetX: 2, offsetY: 6 },
  /**
   * Spikes that swing, orbit or loop through open air: centred, because the
   * base-anchored box put the lethal part four pixels below the picture and
   * the visible spike passed straight through the player ("когда крутящийся
   * шип проходит прямо сквозь меня он не убивает", owner).
   */
  spikeCentred: { width: 6, height: 6, offsetX: 2, offsetY: 2 },
  /** `LaserTrap`'s beam — three pixels wide, not a tile. */
  laserWidth: 3,
  /** `TimingGate`'s shutter. */
  timingGateWidth: 4,
} as const;

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
