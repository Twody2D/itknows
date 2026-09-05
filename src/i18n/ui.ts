import { LocaleState } from './Locale';

/**
 * UI string dictionary — the rest of `LocaleState`'s job beyond SYSTEM
 * dialogue (`Commentator`/`data/dialogues`), deferred here until Phase 4
 * actually needed screens to put strings on (CLAUDE.md #7: no user-facing
 * string lives in gameplay/scene code, only keys through i18n).
 */
const UI_STRINGS = {
  play: { ru: 'Играть', en: 'Play' },
  levels: { ru: 'Уровни', en: 'Levels' },
  settings: { ru: 'Настройки', en: 'Settings' },
  howToPlay: { ru: 'Как играть', en: 'How to play' },
  back: { ru: 'Назад', en: 'Back' },

  // Main menu. The showcase panel names the android as a unit rather than a
  // character — the player is looking at SYSTEM's inventory, not a hero
  // select screen.
  menuUnit: { ru: 'ЮНИТ-07', en: 'UNIT-07' },
  menuChangeSkin: { ru: 'Сменить облик', en: 'Change skin' },
  menuItWatches: { ru: 'Оно смотрит', en: 'It watches' },

  levelSelectSector: { ru: 'СЕКТОР', en: 'SECTOR' },
  levelSelectLevel: { ru: 'Уровень', en: 'Level' },

  pauseTitle: { ru: 'Пауза', en: 'Paused' },
  resume: { ru: 'Продолжить', en: 'Resume' },
  restart: { ru: 'Заново', en: 'Restart' },
  mainMenu: { ru: 'Главное меню', en: 'Main menu' },

  settingsTitle: { ru: 'Настройки', en: 'Settings' },
  sound: { ru: 'Звук', en: 'Sound' },
  particles: { ru: 'Частицы', en: 'Particles' },
  screenShake: { ru: 'Тряска экрана', en: 'Screen shake' },
  language: { ru: 'Язык', en: 'Language' },
  on: { ru: 'Вкл', en: 'On' },
  off: { ru: 'Выкл', en: 'Off' },

  // "Yandex ID" is a product name, kept as-is in both locales (same
  // treatment as CREDITS/SYSTEM tokens, CLAUDE.md #7). Only shown when the
  // SDK is actually reachable (`YandexGamesService.isAvailable()`) — a
  // guest outside Yandex Games would otherwise see a sign-in button that
  // can never do anything.
  yandexIdGuest: { ru: 'Yandex ID: гость', en: 'Yandex ID: guest' },
  yandexIdSignedIn: { ru: 'Yandex ID: вошли', en: 'Yandex ID: signed in' },

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

  // SYSTEM ARCHIVE (shop) — master-prompt §18. Product/category names stay
  // in-world English tokens on purpose (CLAUDE.md #7 — technical SYSTEM
  // tokens are never translated), the same treatment "SYSTEM ONLINE"/
  // "SECTOR 01" already get; everything actionable around them is localized.
  shopTitle: { ru: 'СИСТЕМНЫЙ АРХИВ', en: 'SYSTEM ARCHIVE' },
  shop: { ru: 'Магазин', en: 'Shop' },
  shopCategoryCharacter: { ru: 'ПЕРСОНАЖ', en: 'CHARACTER' },
  shopCategoryDeathFx: { ru: 'ЭФФЕКТ СМЕРТИ', en: 'DEATH FX' },
  shopCategorySystem: { ru: 'SYSTEM', en: 'SYSTEM' },
  shopCategoryPremium: { ru: 'PREMIUM', en: 'PREMIUM' },
  shopBuy: { ru: 'Купить', en: 'Buy' },
  shopEquip: { ru: 'Экипировать', en: 'Equip' },
  shopEquipped: { ru: 'Экипировано', en: 'Equipped' },
  shopOwned: { ru: 'Уже получено', en: 'Owned' },
  shopInsufficientCredits: { ru: 'Недостаточно кредитов', en: 'Insufficient credits' },
  shopGetCredits: { ru: 'Получить кредиты', en: 'Get credits' },
  shopToArchive: { ru: 'В архив', en: 'To archive' },
  shopWatchAd: { ru: 'Смотреть сигнал', en: 'Watch signal' },
  shopPurchaseFailed: { ru: 'Покупка не удалась', en: 'Purchase failed' },
  shopTryAgain: { ru: 'Попробовать снова', en: 'Try again' },
  shopCatalogUnavailable: { ru: 'Каталог недоступен', en: 'Catalog unavailable' },
  shopRestoring: { ru: 'Восстановление покупок…', en: 'Restoring purchases…' },
  shopAdsDisabled: { ru: 'Реклама отключена', en: 'Ads disabled' },
  shopNoAdsOwned: { ru: 'РЕКЛАМА ОТКЛЮЧЕНА', en: 'ADS DISABLED' },
  resultCreditsEarned: { ru: 'Получено', en: 'Earned' },

  shopSkinDefault: { ru: 'DEFAULT', en: 'DEFAULT' },
  shopSkinDefaultDesc: { ru: 'Базовый корпус android.', en: 'The android’s stock chassis.' },
  shopSkinVoid: { ru: 'VOID', en: 'VOID' },
  shopSkinVoidDesc: { ru: 'Тёмный корпус, лиловый визор.', en: 'A darkened chassis, a violet visor.' },
  shopSkinSignal: { ru: 'SIGNAL', en: 'SIGNAL' },
  shopSkinSignalDesc: { ru: 'Тот же корпус, предупреждающий сигнальный визор.', en: 'The stock chassis, a warning-signal visor.' },
  shopSkinError404: { ru: 'ERROR 404', en: 'ERROR 404' },
  shopSkinError404Desc: { ru: 'Тебе не должно быть это доступно.', en: 'You should not have access to this.' },

  shopFxStatic: { ru: 'STATIC', en: 'STATIC' },
  shopFxStaticDesc: { ru: 'Стандартный эффект отключения.', en: 'The standard shutdown effect.' },
  shopFxGlitch: { ru: 'GLITCH', en: 'GLITCH' },
  shopFxGlitchDesc: { ru: 'Более резкий цифровой сбой.', en: 'A sharper digital breakdown.' },
  shopFxDataWipe: { ru: 'DATA WIPE', en: 'DATA WIPE' },
  shopFxDataWipeDesc: { ru: 'Полное стирание — эксклюзив SYSTEM ACCESS.', en: 'A full wipe — SYSTEM ACCESS exclusive.' },

  shopPackStandard: { ru: 'STANDARD', en: 'STANDARD' },
  shopPackStandardDesc: { ru: 'Обычный тон SYSTEM.', en: 'SYSTEM’s usual tone.' },
  shopPackCold: { ru: 'COLD', en: 'COLD' },
  shopPackColdDesc: { ru: 'SYSTEM без тёплых ноток.', en: 'SYSTEM with the warmth removed.' },
  shopPackCorrupted: { ru: 'CORRUPTED', en: 'CORRUPTED' },
  shopPackCorruptedDesc: { ru: 'Нестабильный тон — эксклюзив SYSTEM ACCESS.', en: 'An unstable tone — SYSTEM ACCESS exclusive.' },

  shopNoAds: { ru: 'NO ADS', en: 'NO ADS' },
  shopNoAdsDesc: { ru: 'Полностью отключает рекламу навсегда.', en: 'Disables advertising completely, forever.' },
  shopSystemAccess: { ru: 'SYSTEM ACCESS', en: 'SYSTEM ACCESS' },
  shopSystemAccessDesc: {
    ru: 'NO ADS + эксклюзивные персонаж, эффект смерти и тон SYSTEM.',
    en: 'NO ADS + an exclusive character, death FX and SYSTEM tone.',
  },
} as const;

export type UiStringKey = keyof typeof UI_STRINGS;

/** Test-only — lets a data-sanity test (e.g. `tests/shop-items-sanity.test.ts`) confirm a `UiStringKey` reference is real without importing this module's internal `UI_STRINGS`. */
export const UI_STRING_KEYS_FOR_TEST: readonly string[] = Object.keys(UI_STRINGS);

/** Looks up a UI string in the current locale — the only way scene/UI code should produce user-facing text (CLAUDE.md #7). */
export function t(key: UiStringKey): string {
  return UI_STRINGS[key][LocaleState.current];
}
