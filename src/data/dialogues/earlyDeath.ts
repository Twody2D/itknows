import type { DialogueLine } from './types';

/** master-prompt §17 "Early death" — died almost immediately after the attempt started. */
export const EARLY_DEATH_LINES: DialogueLine[] = [
  { id: 'early_death-01', ru: 'Впечатляет.', en: 'Impressive.' },
  { id: 'early_death-02', ru: 'Быстро.', en: 'That was fast.' },
  { id: 'early_death-03', ru: 'Мы только начали.', en: 'We just started.' },
  { id: 'early_death-04', ru: 'Рекорд скорости. Не тот.', en: 'A speed record. Wrong kind.' },
  { id: 'early_death-05', ru: 'Даже разогреться не успел.', en: "Didn't even warm up." },
  { id: 'early_death-06', ru: 'Ноль секунд на раздумья.', en: 'Zero seconds of hesitation.' },
  { id: 'early_death-07', ru: 'Смело. Опрометчиво, но смело.', en: 'Bold. Reckless, but bold.' },
  { id: 'early_death-08', ru: 'Это было даже не разминкой.', en: "That wasn't even a warm-up." },
  { id: 'early_death-09', ru: 'Уровень тебя толком не заметил.', en: 'The level barely registered you.' },
  {
    id: 'early_death-10',
    ru: 'Такими темпами отчёт допишу раньше тебя.',
    en: "At this rate, I'll finish my report before you finish this.",
  },
  { id: 'early_death-11', ru: 'Полсекунды. Личный рекорд.', en: 'Half a second. Personal best.' },
  { id: 'early_death-12', ru: 'Кнопки работают, я проверил.', en: 'The buttons work, I checked.' },
  { id: 'early_death-13', ru: 'Смерть до титров.', en: 'Dead before the intro finished.' },
  // Deliberately vague about *what* got them — this category fires for any
  // fast death (static or dynamic hazard alike), so a line naming a specific
  // mechanism would sometimes be flatly wrong. "Didn't look" is true either
  // way.
  { id: 'early_death-14', ru: 'Ты вообще смотрел на экран?', en: 'Were you even looking at the screen?' },
  { id: 'early_death-15', ru: 'Первый шаг. И последний.', en: 'First step. Also the last.' },
];
