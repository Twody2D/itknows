import { PALETTE } from '@/config/palette';
import type { PlayerColors } from '@/art/drawPlayer';

/**
 * PALETTE-only color pairs (CLAUDE.md #3 — no new hex literals) for every
 * purchasable skin. Deliberately never reuses `PALETTE.danger`/`PALETTE.cyan`
 * as a skin's *base* visor color: `drawPlayerFrame` still forces `danger` on
 * hurt/death and `reward` on victory regardless of skin (see its doc
 * comment) — a skin whose normal-state visor already looked like the hurt
 * state would quietly undermine that telegraph, which the game's monetization
 * must never do.
 */
export const SKIN_VISUALS: Record<string, PlayerColors> = {
  void: { body: PALETTE.metalEdge, visor: PALETTE.system },
  signal: { body: PALETTE.white, visor: PALETTE.dangerAlt },
  error404: { body: PALETTE.metalDark, visor: PALETTE.reward },
};

/** `default` (and anything unrecognized) means "use `drawPlayerFrame`'s own built-in colors" — no lookup miss ever changes the base skin's look. */
export function skinColorsFor(skinId: string): PlayerColors | undefined {
  return SKIN_VISUALS[skinId];
}
