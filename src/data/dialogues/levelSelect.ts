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

/**
 * WHAT EACH SECTOR IS ABOUT, said once, in the only place a player reads
 * before deciding to start it.
 *
 * Added 2026-09-19. The owner played the finished campaign and called the
 * finale «слишком лёгкий и непонятный» — and the second half of that was
 * the harder problem. Sector 10 is a retrospective: one level per sector, in
 * the order they were taught. That structure is real and it is in the level
 * data, and a player has no way whatever to perceive it, because by level
 * fifty-five everything is familiar and a citation you cannot name is just
 * another corridor.
 *
 * A sector's premise cannot be carried by its geometry alone — geometry
 * says what to do, never why this screen is different from the last fifty.
 * SYSTEM has been the game's voice for that since sector 01, so the fix is
 * to let it say the thing out loud, once, on the map, while the sector is
 * still untouched. After that the generic lines take over: a premise
 * repeated is a premise nobody reads.
 *
 * Authored, one per sector, never generated (CLAUDE.md #6), and in SYSTEM's
 * register — observing, not instructing. None of them tells the player what
 * to press.
 *
 * AND EVERY ONE IS SHORT ON PURPOSE. SYSTEM's column on the level map is
 * about 94 px wide and 86 px tall, which is six lines of 10 px type at the
 * narrowest supported width — roughly `PREMISE_MAX_CHARS` of uppercase
 * Russian. The first drafts of sectors 07 and 10 ran to 72 and 99 characters
 * and were measured live at 105 px and 150 px of text in an 90 px box: cut
 * off mid-sentence at 480, spilling past the panel at 620. A premise the
 * player reads half of is worse than no premise, because the half they get
 * is the setup. `tests/dialogue-packs.test.ts` holds the budget.
 */
/**
 * The character budget for a premise, derived from the column rather than
 * picked: ~94 px of width at 10 px uppercase is about 11 characters a line,
 * and the box holds six lines. See the note above for how the number was
 * found — by measuring two lines that did not fit.
 */
export const PREMISE_MAX_CHARS = 66;

export const SECTOR_PREMISE: Record<number, DialogueLine> = {
  1: {
    id: 'levels-premise-01',
    ru: 'Земля здесь не ждёт. Она срабатывает на тебя.',
    en: 'The ground here does not wait. It goes off at you.',
  },
  2: {
    id: 'levels-premise-02',
    ru: 'Стоять нельзя. Всё, на чём ты стоишь, ненадолго.',
    en: 'Standing is not an option. Nothing you stand on lasts.',
  },
  3: {
    id: 'levels-premise-03',
    ru: 'Всё по часам и не смотрит на тебя. Выбираешь только когда.',
    en: 'All on a clock, none of it looking at you. You choose only when.',
  },
  4: {
    id: 'levels-premise-04',
    ru: 'То, что выглядит как опора, ею не является.',
    en: 'What looks like footing is not footing.',
  },
  5: {
    id: 'levels-premise-05',
    ru: 'Теперь ожидание стоит денег. За тобой идут.',
    en: 'Waiting has a price now. Something is coming after you.',
  },
  6: {
    id: 'levels-premise-06',
    ru: 'Впервые механизм не мешает, а несёт. Но на нём надо постоять.',
    en: 'Here a machine carries you. But you have to stand on it.',
  },
  7: {
    id: 'levels-premise-07',
    ru: 'Катапульта выстрелит всё равно. Решаешь только, стоять ли.',
    en: 'The pad fires either way. You choose only whether to be on it.',
  },
  8: {
    id: 'levels-premise-08',
    ru: 'Пол — механизм. Он тянет всегда, даже когда ты стоишь.',
    en: 'The floor is machinery. It pulls even while you stand still.',
  },
  9: {
    id: 'levels-premise-09',
    ru: 'Пола больше нет. Всё, на чём ты стоишь, выбрано тобой.',
    en: 'There is no floor any more. Everything you stand on, you chose.',
  },
  10: {
    id: 'levels-premise-10',
    ru: 'Ничего нового. По вопросу от каждого сектора, потом все сразу.',
    en: 'Nothing new. One question from each sector, then all at once.',
  },
};

export function levelSelectComment(completed: number, total: number, sector?: number): string {
  // An untouched sector states what it is; everything after that is the
  // player's own progress, which is what they came back to the map to read.
  if (completed === 0 && sector !== undefined) {
    const premise = SECTOR_PREMISE[sector];
    if (premise) return premise[LocaleState.current];
  }

  const key =
    completed === 0 ? 'untouched' : completed >= total ? 'cleared' : completed >= total - 2 ? 'nearly' : 'started';
  return LINES[key][LocaleState.current];
}
