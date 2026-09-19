import type { TrapTiming } from './TrapTiming';

/**
 * Compact, tile-column/row placement data for the dynamic trap types
 * (static spikes stay level-geometry, not a trap def — see LevelDef).
 * `id` must be unique within a level; `trigger` defs reference another
 * trap's `id` via `targetId`.
 *
 * 13 types (counting static spikes as level geometry, not a def here) are
 * the master-prompt §14 minimal set — `laser` covers "delayed laser" too,
 * via `initialIdleMs`, rather than being a separate class.
 * `spike-bank`/`spike-wall`/`orbit-spike`/`swinging-spike`/`loop-spike` are
 * a later addition beyond that list, by direct request — recorded honestly
 * as a scope-lock revision in `TODO.md`, not folded into the original count.
 */
export type TrapDef =
  | {
      type: 'moving-spike';
      id: string;
      fromCol: number;
      fromRow: number;
      toCol: number;
      toRow: number;
      /** Required unless `ambush: true` — the ordinary continuous patrol's ping-pong duration. */
      travelMs?: number;
      /**
       * Default (unset/false): the campaign's ordinary moving spike —
       * always visible, continuously patrolling between `from`/`to`, no
       * warning phase (the motion itself is the telegraph). `travelMs` is
       * required in this mode.
       *
       * `true`: an ambush variant instead — invisible while idle, then
       * visibly drops fast from `fromRow` to `toRow` and back, honestly
       * telegraphed through `Trap`'s ordinary idle→warning→active→cooldown
       * cycle (`timing`/`initialIdleMs`/`loop` below configure that cycle,
       * same fields `laser` already uses; `travelMs` is unused). Only ever
       * the campaign's single verified exception (`sector-01-level-01`) —
       * see that file's doc comment.
       */
      ambush?: boolean;
      timing?: TrapTiming;
      initialIdleMs?: number;
      loop?: boolean;
    }
  | {
      type: 'laser';
      id: string;
      col: number;
      topRow: number;
      bottomRow: number;
      timing?: TrapTiming;
      initialIdleMs?: number;
      loop?: boolean;
    }
  | { type: 'fake-platform'; id: string; col: number; row: number; width: number }
  | {
      type: 'disappearing-platform';
      id: string;
      col: number;
      row: number;
      width: number;
      crumbleMs?: number;
      goneMs?: number;
    }
  | {
      type: 'falling-platform';
      id: string;
      col: number;
      row: number;
      width: number;
      holdMs?: number;
      fallSpeed?: number;
      /**
       * `true` turns this stretch of floor into an armed trapdoor: it no
       * longer reacts to being stood on, and instead goes when a `trigger`
       * def naming its `id` fires. Point that trigger at the ground a
       * column or two *before* the floor and the trap springs ahead of a
       * running player instead of under a standing one — see
       * `FallingPlatformTrap` and sector 01's `TRAPDOOR_LEAD`.
       */
      armed?: boolean;
    }
  | {
      type: 'moving-platform';
      id: string;
      fromCol: number;
      fromRow: number;
      toCol: number;
      toRow: number;
      width: number;
      travelMs: number;
      /**
       * A SHIFTING PIT rather than a sliding bridge: still until a `trigger`
       * fires it, then one trip to `to` and it stays. See
       * `MovingPlatformTrap` for the rule about where that trigger may sit
       * — the hole has to finish moving while the player is still on their
       * feet, never mid-jump.
       */
      armed?: boolean;
    }
  | { type: 'electric-floor'; id: string; col: number; row: number; width: number; timing?: TrapTiming }
  | {
      type: 'trigger';
      id: string;
      col: number;
      row: number;
      width: number;
      height: number;
      targetId: string;
    }
  | {
      type: 'pursuer';
      id: string;
      col: number;
      row: number;
      speedFactor?: number;
      /** Head start before it begins hunting, in ms — see `Pursuer`. Defaults to 2000. */
      startDelayMs?: number;
    }
  | { type: 'timing-gate'; id: string; col: number; topRow: number; bottomRow: number; timing?: TrapTiming }
  | { type: 'fake-exit'; id: string; col: number; row: number }
  | {
      /**
       * A bank of spikes that rises/descends between two rows on an honest,
       * self-timed repeating cycle — `hiddenRow` can be either side of
       * `lethalRow` (below it for a floor-mounted bank punching upward,
       * above it for a ceiling-mounted one slamming down), so the same
       * data shape covers both roles. Unlike `moving-spike`'s `ambush`
       * mode (truly invisible while idle, `loop: false`, a one-off
       * narrative device reserved for a single verified placement —
       * see sector01's file doc comment), this is dimly visible at idle
       * (a real tell the player learns to read) and loops by default —
       * ordinary, reusable level content, not a rare surprise. `width`
       * spans multiple tile-columns as independent same-timed instances
       * (same convention as `disappearing-platform`/`falling-platform`),
       * so crossing it means clearing the whole span, not one point.
       */
      type: 'spike-bank';
      id: string;
      col: number;
      width: number;
      hiddenRow: number;
      lethalRow: number;
      timing?: TrapTiming;
      initialIdleMs?: number;
      loop?: boolean;
    }
  | {
      /**
       * A lethal `timing-gate`: spikes slide out from one edge to seal a
       * horizontal passage, honestly cycled the same way every other timed
       * trap is. `timing-gate` only ever blocks (a mistimed approach costs
       * a beat); this kills if the player is caught in the gap while
       * extended — a higher-stakes sibling for the same "wait for the
       * right moment" family, distinguished by growing in *width* from a
       * fixed edge rather than in height/position like every vertical
       * hazard above. `topRow`/`bottomRow` span enough rows to be genuinely
       * un-jumpable (matching `laser`/`timing-gate`'s own full-height
       * span) — a single-row version would just be a slower `spike-bank`,
       * not a real "wait, don't jump" obstacle.
       */
      type: 'spike-wall';
      id: string;
      /** The retracted edge the wall extends from. */
      col: number;
      topRow: number;
      bottomRow: number;
      extendTiles: number;
      /** Default false: extends rightward from `col`. True: extends leftward, `col` is the right/retracted edge. */
      fromRight?: boolean;
      timing?: TrapTiming;
      initialIdleMs?: number;
      loop?: boolean;
    }
  | {
      /**
       * A pad that throws the player upward when they are standing on it at
       * the moment it fires — the sector-06 mechanic, and the first thing in
       * this file that is not purely an obstacle.
       *
       * Every other entry here answers "can you get past me". This one
       * answers "will you use me": a `launch-pad` is a SURFACE (solid,
       * standable, never lethal) whose active phase carries the player
       * `liftTiles` above itself, higher than any jump reaches. Levels built
       * on it are climbs whose upper half is out of jump range entirely, so
       * the pad is not a shortcut around the question — it is the question.
       *
       * Honesty: it runs the shared idle → warning → active → cooldown cycle
       * like every timed trap, so the launch telegraphs for `MIN_WARNING_MS`
       * before it happens (CLAUDE.md #4.2). That matters even though the pad
       * cannot kill: being thrown without warning into a spike overhead
       * would be a death the player could not have avoided, which is the
       * thing #4 actually forbids. `LevelValidator` knows about the lift
       * (`jumpPhysics.launchReach`), so a level whose exit is only reachable
       * by riding a pad still has to prove itself passable.
       */
      type: 'launch-pad';
      id: string;
      col: number;
      /** Surface row the pad sits on — the player stands here. */
      row: number;
      width: number;
      /** Height in TILES the launch carries the player above the pad's surface. */
      liftTiles: number;
      timing?: TrapTiming;
      initialIdleMs?: number;
      loop?: boolean;
    }
  | {
      /**
       * A strip of floor that moves — the sector-08 mechanic, and the first
       * thing in the game that changes what STANDING STILL means.
       *
       * Solid, standable, never lethal and never on a clock: it simply
       * pulls whoever is on it, forever, at `speed` px/s (positive right,
       * negative left). Every timed trap in sectors 02-07 is answered by
       * waiting somewhere safe — a conveyor takes the safe tile out from
       * under the player while they wait, so "when" and "where" stop being
       * separate questions.
       *
       * `speed` is capped at `MAX_CONVEYOR_SPEED` (60, against the player's
       * own 110) and the cap is an honesty rule, not taste: walking against
       * the belt must stay possible, because `LevelValidator` counts a
       * conveyor as ordinary footing and a strip nobody can cross would be
       * a wall the solver cannot see.
       */
      type: 'conveyor';
      id: string;
      col: number;
      /** Surface row — the player stands here. */
      row: number;
      width: number;
      /** px/s, positive drags right. */
      speed: number;
    }
  | {
      /**
       * A spike on a fixed-radius arm, rotating at constant angular speed
       * forever — never slowing or reversing, unlike `swinging-spike`
       * below. Continuously visible; the steady, never-pausing sweep is
       * its own honest telegraph (master-prompt §14's "predictable
       * movement"), same rule `moving-spike` already relies on.
       */
      type: 'orbit-spike';
      id: string;
      pivotCol: number;
      pivotRow: number;
      radiusTiles: number;
      periodMs: number;
      /** Default true. */
      clockwise?: boolean;
    }
  | {
      /**
       * A spike on a chain, swinging through a bounded arc and visibly
       * slowing to reverse at each extreme — the deceleration itself is
       * part of the read, unlike `orbit-spike`'s constant-speed sweep past
       * the same point forever.
       */
      type: 'swinging-spike';
      id: string;
      pivotCol: number;
      pivotRow: number;
      lengthTiles: number;
      maxAngleDeg: number;
      periodMs: number;
    }
  | {
      /**
       * A spike patrolling a closed circuit of 3+ waypoints in one
       * direction, never reversing — unlike `moving-spike`'s symmetric
       * ping-pong (which teaches "it'll come straight back the way it
       * came"), a one-way loop can bring it back around a different side
       * than the one it left on.
       */
      type: 'loop-spike';
      id: string;
      waypoints: Array<{ col: number; row: number }>;
      /** Duration of each leg between consecutive waypoints (last back to first included). */
      travelMs: number;
    };
