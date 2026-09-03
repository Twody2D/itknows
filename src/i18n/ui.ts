import { LocaleState } from './Locale';

/**
 * UI string dictionary — the rest of `LocaleState`'s job beyond SYSTEM
 * dialogue (`Commentator`/`data/dialogues`), deferred here until Phase 4
 * actually needed screens to put strings on (CLAUDE.md #7: no user-facing
 * string lives in gameplay/scene code, only keys through i18n).
 */
const UI_STRINGS = {
  play: { ru: 'Играть', en: 'Play' },
  settings: { ru: 'Настройки', en: 'Settings' },
  howToPlay: { ru: 'Как играть', en: 'How to play' },
  back: { ru: 'Назад', en: 'Back' },

  pauseTitle: { ru: 'Пауза', en: 'Paused' },
  resume: { ru: 'Продолжить', en: 'Resume' },
  restart: { ru: 'Заново', en: 'Restart' },
  mainMenu: { ru: 'Главное меню', en: 'Main menu' },

  settingsTitle: { ru: 'Настройки', en: 'Settings' },
  particles: { ru: 'Частицы', en: 'Particles' },
  screenShake: { ru: 'Тряска экрана', en: 'Screen shake' },
  language: { ru: 'Язык', en: 'Language' },
  on: { ru: 'Вкл', en: 'On' },
  off: { ru: 'Выкл', en: 'Off' },

  // The keys themselves are drawn as keycaps (`ui/KeyCap.ts`), so these are
  // captions only — never a binding list that could go stale.
  hintMove: { ru: 'Движение', en: 'Move' },
  hintJump: { ru: 'Прыжок', en: 'Jump' },
  hintOr: { ru: 'или', en: 'or' },

  howToPlayTitle: { ru: 'Как играть', en: 'How to play' },
  htpMove: { ru: 'Движение', en: 'Move' },
  htpJump: { ru: 'Прыжок', en: 'Jump' },
  htpHazardLine1: { ru: 'Ловушки всегда', en: 'Hazards always' },
  htpHazardLine2: { ru: 'предупреждают заранее', en: 'warn before they kill' },
  htpSystemLine1: { ru: 'SYSTEM наблюдает', en: 'SYSTEM is watching' },
  htpSystemLine2: { ru: 'и комментирует попытки', en: 'and comments on attempts' },
  htpRetry: { ru: 'Смерть тоже часть процесса', en: 'Death is part of the process' },

  resultTitle: { ru: 'Сектор пройден', en: 'Sector cleared' },
  resultTime: { ru: 'Время', en: 'Time' },
  resultDeaths: { ru: 'Смерти', en: 'Deaths' },
  resultBest: { ru: 'Лучшее', en: 'Best' },
  resultNewBest: { ru: 'Новый рекорд', en: 'New best' },
  resultCleanerRun: { ru: 'Чище, чем в прошлый раз', en: 'Cleaner run than last time' },
  resultSystemUpdate: { ru: 'Обновление SYSTEM', en: 'SYSTEM update' },
  resultCampaignDone: { ru: 'SYSTEM изучил тебя полностью', en: 'SYSTEM has fully profiled you' },
  next: { ru: 'Дальше', en: 'Next' },
} as const;

export type UiStringKey = keyof typeof UI_STRINGS;

/** Looks up a UI string in the current locale — the only way scene/UI code should produce user-facing text (CLAUDE.md #7). */
export function t(key: UiStringKey): string {
  return UI_STRINGS[key][LocaleState.current];
}
