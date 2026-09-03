import type { TrapTiming } from './TrapTiming';

/**
 * Compact, tile-column/row placement data for the 12 dynamic trap types
 * (static spikes stay level-geometry, not a trap def — see LevelDef).
 * `id` must be unique within a level; `trigger` defs reference another
 * trap's `id` via `targetId`.
 */
export type TrapDef =
  | { type: 'moving-spike'; id: string; fromCol: number; fromRow: number; toCol: number; toRow: number; travelMs: number }
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
      shakeMs?: number;
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
  | { type: 'trigger'; id: string; col: number; row: number; width: number; height: number; targetId: string }
  | { type: 'pursuer'; id: string; col: number; row: number; speedFactor?: number }
  | { type: 'timing-gate'; id: string; col: number; topRow: number; bottomRow: number; timing?: TrapTiming }
  | { type: 'fake-exit'; id: string; col: number; row: number };
