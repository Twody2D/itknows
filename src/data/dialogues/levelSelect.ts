import type { DialogueLine } from './types';
import { LocaleState } from '@/i18n/Locale';

/**
 * SYSTEM's line on the level map (Claude Design mockup 4e keeps its column
 * there too). Chosen from the player's own position in the sector rather
 * than at random: the panel is read while deciding what to play next, so a
 * line that changes under a fixed selection reads as noise. Same authored-
 * content rule as the rest of `data/dialogues` — nothing here is generated,
 * and nothing claims progress the save does not have.
 */
const LINES: Record<'untouched' | 'started' | 'nearly' | 'cleared', DialogueLine> = {
  untouched: {
    id: 'levels-untouched',
    ru: 'Сектор нетронут. Мне интересно, с чего ты начнёшь.',
    en: 'The sector is untouched. I am curious where you start.',
  },
  started: {
    id: 'levels-started',
    ru: 'Ты уже был здесь. Недолго.',
    en: 'You have been here before. Briefly.',
  },
  nearly: {
    id: 'levels-nearly',
    ru: 'Почти весь сектор. Осталось самое неудобное.',
    en: 'Almost the whole sector. The awkward part is left.',
  },
  cleared: {
    id: 'levels-cleared',
    ru: 'Сектор закрыт. Время можно улучшить.',
    en: 'Sector closed. The time can still improve.',
  },
};

export function levelSelectComment(completed: number, total: number): string {
  const key =
    completed === 0 ? 'untouched' : completed >= total ? 'cleared' : completed >= total - 2 ? 'nearly' : 'started';
  return LINES[key][LocaleState.current];
}
