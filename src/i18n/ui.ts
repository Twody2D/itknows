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
  dailyChallenge: { ru: 'Испытание дня', en: 'Daily challenge' },

  pauseTitle: { ru: 'Пауза', en: 'Paused' },
  resume: { ru: 'Продолжить', en: 'Resume' },
  restart: { ru: 'Заново', en: 'Restart' },
  mainMenu: { ru: 'Главное меню', en: 'Main menu' },

  settingsTitle: { ru: 'Настройки', en: 'Settings' },
  sound: { ru: 'Звук', en: 'Sound' },
  particles: { ru: 'Частицы', en: 'Particles' },
  screenShake: { ru: 'Тряска экрана', en: 'Screen shake' },
  ghostReplay: { ru: 'Призрак', en: 'Ghost' },
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
  htpHazardLine1: { ru: 'Осторожно —', en: 'Careful —' },
  htpHazardLine2: { ru: 'повсюду ловушки', en: 'traps are everywhere' },
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
  resultNoDeaths: { ru: 'Без смертей', en: 'No deaths' },
  resultLeaderboardTitle: { ru: 'Лидерборд', en: 'Leaderboard' },
  resultYou: { ru: 'ТЫ', en: 'YOU' },
  resultLeaderboardOffline: { ru: 'Лидерборд недоступен', en: 'Leaderboard unavailable' },
  resultSignIn: { ru: 'Войти', en: 'Sign in' },
  resultMenu: { ru: 'Меню', en: 'Menu' },
  resultSectorLabel: { ru: 'Сектор', en: 'Sector' },
  resultToMenu: { ru: 'В меню', en: 'To menu' },
  resultAllDoneShort: { ru: 'Всё пройдено', en: 'All complete' },
  resultProgress: { ru: 'Прогресс', en: 'Progress' },
  next: { ru: 'Дальше', en: 'Next' },

  // SYSTEM ARCHIVE (shop) — master-prompt §18. Product/category names stay
  // in-world English tokens on purpose (CLAUDE.md #7 — technical SYSTEM
  // tokens are never translated), the same treatment "SYSTEM ONLINE"/
  // "SECTOR 01" already get; everything actionable around them is localized.
  shopTitle: { ru: 'СИСТЕМНЫЙ АРХИВ', en: 'SYSTEM ARCHIVE' },
  shop: { ru: 'Магазин', en: 'Shop' },
  // Short rail labels (shop showroom redesign, 2026-09-06) — a vertical
  // 64px-wide rail button has far less room than the old horizontal tab,
  // and a 7-year-old reads "ОБЛИК"/"ФИНАЛ" faster than "ПЕРСОНАЖ"/"ЭФФЕКТ
  // СМЕРТИ" wrapped onto two lines.
  shopCategoryCharacter: { ru: 'ОБЛИК', en: 'SKIN' },
  shopCategoryDeathFx: { ru: 'ФИНАЛ', en: 'FINALE' },
  shopCategorySystem: { ru: 'SYSTEM', en: 'SYSTEM' },
  shopCategoryTrail: { ru: 'ТРЕЙЛЫ', en: 'TRAILS' },
  shopCategoryPremium: { ru: 'БЕЗ РЕК.', en: 'NO ADS' },
  shopUnlockedSuffix: { ru: 'ОТКРЫТО', en: 'UNLOCKED' },
  shopOf: { ru: 'ИЗ', en: 'OF' },
  shopFittingRoom: { ru: 'ПРИМЕРКА', en: 'FITTING ROOM' },
  shopSystemSampleUnavailable: { ru: 'Тон ещё не настроен.', en: 'This tone isn’t wired up yet.' },
  shopCollection: { ru: 'СОБРАНО ОБЛИКОВ', en: 'SKINS COLLECTED' },
  shopWillRemain: { ru: 'ОСТАНЕТСЯ', en: 'LEFT' },
  shopLockedName: { ru: '???', en: '???' },
  shopLockedCondition: { ru: '5 СЕКТОРОВ', en: '5 SECTORS' },
  shopOneTimePurchase: { ru: 'РАЗОВАЯ ПОКУПКА', en: 'ONE-TIME PURCHASE' },
  shopTrialRun: { ru: 'ПРОБНЫЙ ЗАБЕГ', en: 'TEST RUN' },
  shopDeathPreview: { ru: 'ПРЕВЬЮ', en: 'PREVIEW' },
  shopSystemSample: { ru: 'ТРИ РЕПЛИКИ ПОДРЯД', en: 'THREE LINES IN A ROW' },
  shopNoAdsFeature1: { ru: 'Без ролика между секторами — навсегда', en: 'No ad between sectors — ever again' },
  shopNoAdsFeature2: { ru: 'Разовый платёж, не подписка', en: 'One-time payment, not a subscription' },
  shopNoAdsFeature3: { ru: 'Подарок: 500 монет сразу', en: 'A gift: 500 credits right away' },
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
  shopSkinPatrol: { ru: 'ПАТРУЛЬ', en: 'PATROL' },
  shopSkinPatrolDesc: {
    ru: 'Служебный корпус ночного обхода — раньше он проверял камеры, теперь камеры проверяют его.',
    en: 'A night-patrol service chassis — it used to check the cameras, now the cameras check it.',
  },
  shopSkinEcho: { ru: 'ЭХО', en: 'ECHO' },
  shopSkinEchoDesc: {
    ru: 'Копия сигнала, которую SYSTEM однажды отправила и забыла — она вернулась и решила остаться.',
    en: 'A copy of a signal SYSTEM once sent and forgot about — it came back and decided to stay.',
  },
  shopSkinCore: { ru: 'ЯДРО', en: 'CORE' },
  shopSkinCoreDesc: { ru: 'То, что остаётся после сектора 5.', en: 'What is left after sector 5.' },

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

  shopTrailDataTrail: { ru: 'СЛЕД ДАННЫХ', en: 'DATA TRAIL' },
  shopTrailDataTrailDesc: {
    ru: 'Каждый твой шаг записывается — буквально, прямо в воздух за спиной.',
    en: 'Every step you take gets logged — literally, right into the air behind you.',
  },
  shopTrailLaunch: { ru: 'ЗАПУСК', en: 'LAUNCH' },
  shopTrailLaunchDesc: {
    ru: 'Стартовые сопла в пятках — они не для полёта, а для того, чтобы было красиво.',
    en: 'Launch thrusters in the heels — not for flight, just to look good doing it.',
  },
  shopTrailInterference: { ru: 'ПОМЕХА', en: 'INTERFERENCE' },
  shopTrailInterferenceDesc: {
    ru: 'На большой скорости картинка тебя не догоняет и рассыпается на строчки.',
    en: 'At high speed the picture can\'t keep up and breaks into scan lines.',
  },
  shopTrailBeep7: { ru: 'БИП-7', en: 'BEEP-7' },
  shopTrailBeep7Desc: {
    ru: 'Дрон наблюдения, которому поручили следить за тобой — а он привязался.',
    en: 'A surveillance drone assigned to watch you — it got attached instead.',
  },

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
