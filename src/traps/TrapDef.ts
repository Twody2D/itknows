import type { TrapTiming } from './TrapTiming';

/**
 * Compact, tile-column/row placement data for the 12 dynamic trap types
 * (static spikes stay level-geometry, not a trap def — see LevelDef).
 * `id` must be unique within a level; `trigger` defs reference another
 * trap's `id` via `targetId`.
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
      respawnMs?: number;
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
      /** Default true (visible ground marker, same as every other trigger). False hides the marker for a true ambush — see `TriggerTrap`'s doc comment. */
      visible?: boolean;
    }
  | { type: 'pursuer'; id: string; col: number; row: number; speedFactor?: number }
  | { type: 'timing-gate'; id: string; col: number; topRow: number; bottomRow: number; timing?: TrapTiming }
  | { type: 'fake-exit'; id: string; col: number; row: number };
