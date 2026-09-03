import type { DialogueLine } from './types';

/** master-prompt §17 "Multiple deaths" — a round-number death-count milestone for the session. */
export const MULTIPLE_DEATHS_LINES: DialogueLine[] = [
  { id: 'multiple_deaths-01', ru: 'Десять попыток.', en: 'Ten attempts.' },
  { id: 'multiple_deaths-02', ru: 'Всё ещё здесь?', en: 'Still here?' },
  { id: 'multiple_deaths-03', ru: 'Уважаю упорство.', en: 'I admire the persistence.' },
  { id: 'multiple_deaths-04', ru: 'Счётчик смертей уже двузначный.', en: 'The death counter has two digits now.' },
];
