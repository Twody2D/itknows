/**
 * Structural metadata for a level's shape (master-prompt "level length &
 * sectors" §23-24: intro → challenge → variation → combination → system →
 * final). Optional and additive — nothing in `Level.ts`/`GameplayScene`
 * reads this to change geometry or timing; it's a data-level description of
 * what a level is already built as, checked for internal consistency, and
 * available for THE SYSTEM/analytics/future tooling to reason about which
 * part of a level a player struggles with, without re-deriving it from raw
 * tile positions every time.
 */
export type LevelSectionType = 'intro' | 'challenge' | 'variation' | 'combination' | 'system' | 'final';

export interface LevelSectionConfig {
  id: string;
  type: LevelSectionType;
  /** Tile column where this section starts (inclusive). */
  fromCol: number;
  /** Tile column where this section ends (inclusive). The next section (if any) must start at `toCol + 1`. */
  toCol: number;
  /** Whether crossing this section's end is a good place for a checkpoint (informational — `LevelDef.checkpoints` is still what actually places one). */
  checkpointAfter?: boolean;
  /** Mechanics this section exercises, free-form (e.g. `'gap-jump'`, `'laser'`) — for readability/analytics, not machine-checked against `traps`. */
  requiredMechanics?: string[];
  /** True if this section offers a safe, always-available route alongside a riskier one. */
  optionalRoute?: boolean;
}

export interface SectionValidationResult {
  valid: boolean;
  reason?: string;
}

/**
 * Checks that `sections` (if present) are listed in order and cover the
 * level's full width with no gap and no overlap — the one thing worth
 * machine-checking about hand-authored metadata like this, since a silent
 * gap or overlap would make the description actively misleading rather
 * than just incomplete.
 */
export function validateSections(width: number, sections: LevelSectionConfig[] | undefined): SectionValidationResult {
  if (!sections || sections.length === 0) return { valid: true };

  let expectedStart = 0;
  for (const section of sections) {
    if (section.toCol < section.fromCol) {
      return { valid: false, reason: `section "${section.id}" has toCol (${section.toCol}) < fromCol (${section.fromCol})` };
    }
    if (section.fromCol !== expectedStart) {
      return {
        valid: false,
        reason: `section "${section.id}" starts at column ${section.fromCol}, expected ${expectedStart} (gap or overlap with the previous section)`,
      };
    }
    expectedStart = section.toCol + 1;
  }

  if (expectedStart !== width) {
    return {
      valid: false,
      reason: `sections cover columns 0-${expectedStart - 1}, but the level is ${width} tiles wide (0-${width - 1})`,
    };
  }

  return { valid: true };
}
