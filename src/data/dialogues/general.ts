import type { DialogueLine } from './types';

/** Fallback pool for the priority cascade's lowest tier (§18 "general death") — no more specific category matched. */
export const GENERAL_LINES: DialogueLine[] = [
  { id: 'general-01', ru: 'Зафиксировано.', en: 'Logged.' },
  { id: 'general-02', ru: 'Ещё одна попытка.', en: 'Another attempt.' },
  { id: 'general-03', ru: 'Данные обновлены.', en: 'Data updated.' },
  { id: 'general-04', ru: 'Наблюдаю.', en: 'Observing.' },
  { id: 'general-05', ru: 'Продолжай.', en: 'Keep going.' },
  { id: 'general-06', ru: 'Это тоже часть процесса.', en: "That's part of the process too." },
  { id: 'general-07', ru: 'Ещё одна точка данных.', en: 'Another data point.' },
  { id: 'general-08', ru: 'Всё под контролем. Моим.', en: "Everything's under control. Mine." },
  { id: 'general-09', ru: 'Интересный выбор.', en: 'Interesting choice.' },
  { id: 'general-10', ru: 'Записал. Проанализирую позже.', en: "Logged. I'll analyze it later." },
  { id: 'general-11', ru: 'Обычный день в SYSTEM CORE.', en: 'Just another day in SYSTEM CORE.' },
  { id: 'general-12', ru: 'Продолжаем.', en: 'Moving on.' },
];
