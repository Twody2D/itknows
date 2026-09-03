import type { DialogueLine } from './types';

/** master-prompt §17 "Multiple deaths" — a round-number death-count milestone for the session. */
export const MULTIPLE_DEATHS_LINES: DialogueLine[] = [
  { id: 'multiple_deaths-01', ru: 'Десять попыток.', en: 'Ten attempts.' },
  { id: 'multiple_deaths-02', ru: 'Всё ещё здесь?', en: 'Still here?' },
  { id: 'multiple_deaths-03', ru: 'Уважаю упорство.', en: 'I admire the persistence.' },
  { id: 'multiple_deaths-04', ru: 'Счётчик смертей уже двузначный.', en: 'The death counter has two digits now.' },
  { id: 'multiple_deaths-05', ru: 'Двадцать. Круглое число.', en: 'Twenty. A round number.' },
  { id: 'multiple_deaths-06', ru: 'Счётчик уже не помещается на одну строку.', en: 'The counter barely fits on one line anymore.' },
  { id: 'multiple_deaths-07', ru: 'Ты бьёшь свой же рекорд. Не в ту сторону.', en: "You're beating your own record. Wrong direction." },
  {
    id: 'multiple_deaths-08',
    ru: 'Я веду подробную статистику. Она тебе не понравится.',
    en: "I keep detailed statistics. You wouldn't like them.",
  },
  { id: 'multiple_deaths-09', ru: 'Ещё один десяток. Обычное дело.', en: 'Another ten. Business as usual.' },
  { id: 'multiple_deaths-10', ru: 'Настойчивость я записал отдельным полем.', en: 'I logged the persistence as its own field.' },
];
