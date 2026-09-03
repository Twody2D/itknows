import type { DialogueLine } from './types';

/** master-prompt §17 "Long hesitation" — the player stood still for a long time at attempt start. */
export const LONG_HESITATION_LINES: DialogueLine[] = [
  { id: 'long_hesitation-01', ru: 'Ждёшь чего-то?', en: 'Were you waiting for something?' },
  { id: 'long_hesitation-02', ru: 'Ты можешь двигаться, знаешь ли.', en: 'You can move, you know.' },
  { id: 'long_hesitation-03', ru: 'Уровень сам себя не пройдёт.', en: "The level won't finish itself." },
  { id: 'long_hesitation-04', ru: 'Обдумываешь стратегию? Или просто застыл?', en: 'Strategizing? Or just frozen?' },
];
