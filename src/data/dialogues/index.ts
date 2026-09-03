import type { CommentCategory, DialogueLine } from './types';
import { EARLY_DEATH_LINES } from './earlyDeath';
import { FALL_LINES } from './fall';
import { REPEATED_MISTAKE_LINES } from './repeatedMistake';
import { NEAR_EXIT_LINES } from './nearExit';
import { LONG_HESITATION_LINES } from './longHesitation';
import { SUCCESSFUL_ADAPTATION_LINES } from './successfulAdaptation';
import { MULTIPLE_DEATHS_LINES } from './multipleDeaths';
import { GENERAL_LINES } from './general';

export type { CommentCategory, DialogueLine };

export const DIALOGUE_POOLS: Record<CommentCategory, DialogueLine[]> = {
  early_death: EARLY_DEATH_LINES,
  fall: FALL_LINES,
  repeated_mistake: REPEATED_MISTAKE_LINES,
  near_exit: NEAR_EXIT_LINES,
  long_hesitation: LONG_HESITATION_LINES,
  successful_adaptation: SUCCESSFUL_ADAPTATION_LINES,
  multiple_deaths: MULTIPLE_DEATHS_LINES,
  general: GENERAL_LINES,
};
