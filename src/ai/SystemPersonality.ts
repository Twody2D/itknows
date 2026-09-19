import { SECTOR_COUNT, sectorNumberOf } from '@/gameplay/sectors';

export type PersonalityTag = 'v1.0' | 'v1.4' | 'v2.0' | 'v2.6' | 'v3.0';

/**
 * master-prompt §70 — THE SYSTEM's displayed version quietly climbs as the
 * player advances through the campaign ("не раскрывать всё сразу" — the
 * point is a slow, background reveal, not an announced level-up). Derived
 * from the current level id rather than tracked as separate state, so it can
 * never drift out of sync with where the player actually is.
 *
 * FIVE STEPS, NOT THREE, and the reason is the campaign doubling. The
 * ladder stopped at v2.0 from sector 5 onward, which was right while five
 * sectors was the whole game and became wrong the moment there were ten:
 * SIX of them — the entire second half, every sector the player meets after
 * the original campaign — would have shown the same version, so the number
 * would have stopped meaning anything exactly where it had the most to say.
 * Two more steps, at 7 and at 9, keep the reveal moving to the end.
 *
 * Bumped in pairs so the tag never changes inside a sector, which
 * `SectorCompleteScene` relies on: it compares the tag of the level just
 * finished with the tag of the next one, and shows the climb as a moment.
 */
export function personalityTag(levelId: string): PersonalityTag {
  const sector = sectorNumberOf(levelId);
  if (sector >= 9) return 'v3.0';
  if (sector >= 7) return 'v2.6';
  if (sector >= 5) return 'v2.0';
  if (sector >= 3) return 'v1.4';
  return 'v1.0';
}

/** The tag the campaign ends on — used by the tests to keep the ladder reaching the last sector. */
export const FINAL_PERSONALITY_TAG: PersonalityTag = personalityTag(`sector-${String(SECTOR_COUNT).padStart(2, '0')}-level-01`);
