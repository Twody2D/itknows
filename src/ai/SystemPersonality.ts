import { sectorNumberOf } from '@/gameplay/sectors';

export type PersonalityTag = 'v1.0' | 'v1.4' | 'v2.0';

/**
 * master-prompt §70 — THE SYSTEM's displayed version quietly climbs as the
 * player advances through the campaign: v1.0 for the opening sectors, v1.4
 * partway through, v2.0 for the finale ("не раскрывать всё сразу" — the
 * point is a slow, background reveal, not an announced level-up). Derived
 * from the current level id rather than tracked as separate state, so it
 * can never drift out of sync with where the player actually is, and needs
 * no persistence beyond what `GameState`/`PlayerProfile` already have
 * (session-only — SaveService is Phase 6).
 */
export function personalityTag(levelId: string): PersonalityTag {
  const sector = sectorNumberOf(levelId);
  if (sector >= 5) return 'v2.0';
  if (sector >= 3) return 'v1.4';
  return 'v1.0';
}
