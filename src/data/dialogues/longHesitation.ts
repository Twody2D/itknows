import type { DialogueLine } from './types';

/** master-prompt §17 "Long hesitation" — the player stood still for a long time at attempt start. */
export const LONG_HESITATION_LINES: DialogueLine[] = [
  { id: 'long_hesitation-01', ru: 'Ждёшь чего-то?', en: 'Were you waiting for something?' },
  { id: 'long_hesitation-02', ru: 'Ты можешь двигаться, знаешь ли.', en: 'You can move, you know.' },
  { id: 'long_hesitation-03', ru: 'Уровень сам себя не пройдёт.', en: "The level won't finish itself." },
  { id: 'long_hesitation-04', ru: 'Обдумываешь стратегию? Или просто застыл?', en: 'Strategizing? Or just frozen?' },
  { id: 'long_hesitation-05', ru: 'Я тоже умею ждать.', en: 'I can wait too.' },
  { id: 'long_hesitation-06', ru: 'Часы идут. У меня их много.', en: "The clock's running. I have plenty." },
  {
    id: 'long_hesitation-07',
    ru: 'Level design не меняется от того, что ты стоишь.',
    en: "The level design doesn't change while you stand there.",
  },
  { id: 'long_hesitation-08', ru: 'Это молчание становится подозрительным.', en: "This silence is starting to feel deliberate." },
  { id: 'long_hesitation-09', ru: 'Тайм-аут я не предусмотрел. Пока что.', en: "I didn't build in a timeout. Yet." },
  { id: 'long_hesitation-10', ru: 'Кнопки не кусаются.', en: "The buttons don't bite." },
];
