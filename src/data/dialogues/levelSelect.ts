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
 * to let it say the thing out loud, once, while the sector is still
 * untouched. After that the generic lines take over: a premise repeated is a
 * premise nobody reads.
 *
 * SAID IN TWO PLACES, because the first one turned out not to be a place the
 * player goes. Until 2026-09-21 this was printed only in SYSTEM's column on
 * the level map — and the campaign never opens the level map: PLAY resumes
 * into a level, a cleared level starts the next, and SECTOR COMPLETE goes
 * forward. The owner finished all sixty levels and was shown none of the
 * ten. `GameplayScene.announceSectorPremise` now says it in the HUD on the
 * way into an untouched sector, which is the path everybody takes; the map
 * still says it for anyone who goes there first.
 *
 * Authored, one per sector, never generated (CLAUDE.md #6), and in SYSTEM's
 * register — observing, not instructing. None of them tells the player what
 * to press.
 *
 * AND EVERY ONE IS SHORT ON PURPOSE. The first drafts of sectors 07 and 10
 * ran to 72 and 99 characters and were measured live at 105 px and 150 px of
 * text in an 86 px box: cut off mid-sentence at 480, spilling past the panel
 * at 620. A premise the player reads half of is worse than no premise,
 * because the half they get is the setup.
 * `tests/dialogue-packs.test.ts` holds the budget.
 */
/**
 * The character budget for a premise.
 *
 * MEASURED, NOT ESTIMATED, and it had to be re-measured: the first version of
 * this comment derived 66 from three numbers that were all wrong (a 94 px
 * column that is 80 px, 11 characters a line that are 13, six lines that are
 * five), and arrived at the right answer by having the errors cancel. The
 * derivation is now the binding constraint, which is the HUD line rather
 * than the map column, because that is where the campaign says it.
 *
 * The HUD line is `wordWrapWidth: width - 32`, so 448 px at the narrowest
 * supported width, and it carries a constant 13-character prefix
 * (`SYSTEM v3.0: `). Measured live on the longest premise in the game:
 * 75 characters render 423 px, i.e. 5.64 px each, so the line holds 79 and
 * the premise holds 66. The map column takes 65 by the same kind of
 * arithmetic, so neither place is the looser one by more than a character.
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

/**
 * A sector's premise in the current locale, or `null` for a number with none.
 *
 * Exported on its own because the premise has two places to be said and they
 * ask different questions. The map asks "has this sector been touched"; the
 * campaign asks "is this the way in". Both call this; neither owns it.
 */
export function sectorPremise(sector: number): string | null {
  const premise = SECTOR_PREMISE[sector];
  return premise ? premise[LocaleState.current] : null;
}

export function levelSelectComment(completed: number, total: number, sector?: number): string {
  // An untouched sector states what it is; everything after that is the
  // player's own progress, which is what they came back to the map to read.
  if (completed === 0 && sector !== undefined) {
    const premise = sectorPremise(sector);
    if (premise !== null) return premise;
  }

  const key =
    completed === 0 ? 'untouched' : completed >= total ? 'cleared' : completed >= total - 2 ? 'nearly' : 'started';
  return LINES[key][LocaleState.current];
}
