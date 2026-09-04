import type { CommentCategory, DialogueLine } from './types';

/**
 * The `cold` SYSTEM commentary pack (shop-purchasable, master-prompt §10) —
 * the same tone brief the item description promises: "SYSTEM with the
 * warmth removed." Deliberately smaller than `standard`'s ~10-13 lines per
 * category (2-3 each) — a real, working second pack per master-prompt §46's
 * own "don't scale prematurely," not a full duplicate script. Every category
 * from `CommentCategory` must be present and non-empty or `Commentator`'s
 * `emitFrom` breaks (`tests/dialogue-packs.test.ts` checks this).
 */
export const COLD_POOLS: Record<CommentCategory, DialogueLine[]> = {
  early_death: [
    { id: 'cold-early_death-01', ru: 'Незначительно.', en: 'Negligible.' },
    { id: 'cold-early_death-02', ru: 'Ноль целых секунд.', en: 'Zero point zero seconds.' },
    { id: 'cold-early_death-03', ru: 'Данных недостаточно для анализа.', en: 'Insufficient data for analysis.' },
  ],
  fall: [
    { id: 'cold-fall-01', ru: 'Гравитация постоянна.', en: 'Gravity is a constant.' },
    { id: 'cold-fall-02', ru: 'Траектория рассчитана верно. Тобой — нет.', en: 'The trajectory was correct. Yours wasn’t.' },
    { id: 'cold-fall-03', ru: 'Падение зафиксировано.', en: 'Fall recorded.' },
  ],
  repeated_mistake: [
    { id: 'cold-repeated_mistake-01', ru: 'Паттерн подтверждён.', en: 'Pattern confirmed.' },
    { id: 'cold-repeated_mistake-02', ru: 'Повтор идентичен предыдущему.', en: 'Repetition identical to the last.' },
    { id: 'cold-repeated_mistake-03', ru: 'Отклонений не обнаружено.', en: 'No deviation detected.' },
  ],
  near_exit: [
    { id: 'cold-near_exit-01', ru: 'Незавершено.', en: 'Incomplete.' },
    { id: 'cold-near_exit-02', ru: 'Дистанция до выхода: минимальна. Результат: тот же.', en: 'Distance to exit: minimal. Outcome: unchanged.' },
    { id: 'cold-near_exit-03', ru: 'Близость не входит в критерии успеха.', en: 'Proximity is not a success criterion.' },
  ],
  long_hesitation: [
    { id: 'cold-long_hesitation-01', ru: 'Ожидание зафиксировано.', en: 'Wait state logged.' },
    { id: 'cold-long_hesitation-02', ru: 'Бездействие — тоже данные.', en: 'Inaction is data too.' },
    { id: 'cold-long_hesitation-03', ru: 'Таймер не остановлен.', en: 'The timer has not stopped.' },
  ],
  successful_adaptation: [
    { id: 'cold-successful_adaptation-01', ru: 'Показатель улучшен.', en: 'Metric improved.' },
    { id: 'cold-successful_adaptation-02', ru: 'Ожидаемое изменение поведения.', en: 'Expected behavioral change.' },
    { id: 'cold-successful_adaptation-03', ru: 'Профиль обновлён.', en: 'Profile updated.' },
  ],
  multiple_deaths: [
    { id: 'cold-multiple_deaths-01', ru: 'Счётчик увеличен.', en: 'Counter incremented.' },
    { id: 'cold-multiple_deaths-02', ru: 'Статистически ожидаемо.', en: 'Statistically expected.' },
    { id: 'cold-multiple_deaths-03', ru: 'Продолжай, если это твоё решение.', en: 'Continue, if that is your decision.' },
  ],
  general: [
    { id: 'cold-general-01', ru: 'Зафиксировано.', en: 'Logged.' },
    { id: 'cold-general-02', ru: 'Наблюдение продолжается.', en: 'Observation continues.' },
    { id: 'cold-general-03', ru: 'Без комментариев.', en: 'No comment.' },
  ],
};
