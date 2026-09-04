/** One SYSTEM line in both supported languages — dialogue text never lives in gameplay code (CLAUDE.md #6/#7). */
export interface DialogueLine {
  id: string;
  ru: string;
  en: string;
}

/**
 * The 7 comment categories from master-prompt §17. `general` is an 8th,
 * implicit fallback pool for the priority cascade's lowest tier ("general
 * death", §18) — every death that doesn't match a more specific category
 * still needs *some* line.
 */
export type CommentCategory =
  | 'early_death'
  | 'fall'
  | 'repeated_mistake'
  | 'near_exit'
  | 'long_hesitation'
  | 'successful_adaptation'
  | 'multiple_deaths'
  | 'general';

/** SYSTEM commentary packs (shop `system` category) — an alternate line set for the same categories/cascade, never a new category (`Commentator`'s tested cascade logic is untouched). */
export type SystemPackId = 'standard' | 'cold';
