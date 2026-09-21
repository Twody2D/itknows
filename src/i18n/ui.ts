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
  // Карта уровней (мокап 4e). Чипов в игре нет, поэтому вместо счётчика
  // чипов карточка показывает то, что действительно сохраняется: отметку
  // прохождения и личное лучшее время.
  levelsNext: { ru: 'ДАЛЬШЕ', en: 'NEXT' },
  levelsPlay: { ru: 'ИГРАТЬ', en: 'PLAY' },
  levelsAgain: { ru: 'ЗАНОВО', en: 'AGAIN' },
  levelsNew: { ru: 'НОВЫЙ', en: 'NEW' },
  levelsDone: { ru: 'ПРОЙДЕН', en: 'CLEARED' },
  levelsSectorBest: { ru: 'ЛУЧШЕЕ ПО СЕКТОРУ', en: 'SECTOR BEST' },
  levelsSectorStars: { ru: 'ЗВЁЗДЫ СЕКТОРА', en: 'SECTOR STARS' },
  levelsNoBest: { ru: 'ЕЩЁ НЕ ПРОЙДЕН ЦЕЛИКОМ', en: 'NOT CLEARED YET' },
  levelsChallengeReset: { ru: 'ДО СБРОСА', en: 'RESETS IN' },
  /** For the daily card on a squeezed map, where the full phrase cannot be shrunk into the title row and stay readable. */
  levelsChallengeShort: { ru: 'ИСПЫТАНИЕ', en: 'CHALLENGE' },
  levelsUnit: { ru: 'ЮНИТ', en: 'UNIT' },
  levelSelectLevel: { ru: 'Уровень', en: 'Level' },
  dailyChallenge: { ru: 'Испытание дня', en: 'Daily challenge' },

  pauseTitle: { ru: 'Пауза', en: 'Paused' },
  resume: { ru: 'Продолжить', en: 'Resume' },
  restart: { ru: 'Заново', en: 'Restart' },
  mainMenu: { ru: 'Главное меню', en: 'Main menu' },
  pauseAttemptTime: { ru: 'Время попытки', en: 'Attempt time' },
  pauseAttempts: { ru: 'Попытки', en: 'Attempts' },
  /** Short form of `levelsSectorBest`, for the pause card's half-width stat box. */
  pauseBestShort: { ru: 'Лучшее', en: 'Best' },
  /** Short form of `screenShake` — the pause toggle sits in a ~93px box at 480. */
  pauseShakeShort: { ru: 'Тряска', en: 'Shake' },
  /** Short form of `htpDeathNote`, which is 70 characters and cannot fit the restart button at any width. */
  pauseRestartNote: { ru: 'Кредиты не теряются', en: 'Credits are kept' },
  pauseSystemLine: { ru: 'Пауза. Я всё равно считаю.', en: 'Paused. I am still counting.' },
  pauseSystemLineShort: { ru: 'Пауза. Я считаю.', en: 'Paused. Still counting.' },

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
  // Настройки (мокап 4g). Разделы называются так же, как в макете, но строки
  // внутри перечисляют только реально существующие переключатели: раздельных
  // громкостей музыки и эффектов в проекте нет — звук синтезируется одним
  // движком и гасится одним флагом, поэтому вместо двух ползунков один
  // тумблер с честной подписью.
  settingsSectionSound: { ru: 'ЗВУК', en: 'SOUND' },
  settingsSectionPicture: { ru: 'КАРТИНКА', en: 'PICTURE' },
  settingsSectionGame: { ru: 'ИГРА', en: 'GAME' },
  settingsSectionLanguage: { ru: 'ЯЗЫК', en: 'LANGUAGE' },
  settingsSectionAccount: { ru: 'АККАУНТ', en: 'ACCOUNT' },
  settingsSoundDesc: { ru: 'Музыка и эффекты вместе', en: 'Music and effects together' },
  settingsParticlesDesc: { ru: 'Искры, пыль, следы', en: 'Sparks, dust, trails' },
  settingsShakeDesc: { ru: 'Экран дрожит от удара', en: 'The screen shakes on impact' },
  settingsLangRu: { ru: 'РУССКИЙ', en: 'РУССКИЙ' },
  settingsLangEn: { ru: 'ENGLISH', en: 'ENGLISH' },
  settingsSignIn: { ru: 'ВОЙТИ', en: 'SIGN IN' },

  // «Как играть» (мокап 4f). Пять карточек-картинок; подписи короткие, потому
  // что рисунок над ними уже показывает то же самое.
  htpSubtitle: { ru: '30 СЕКУНД И ТЫ ГОТОВ', en: '30 SECONDS AND YOU ARE READY' },
  htpStepMove: { ru: 'ИДТИ', en: 'MOVE' },
  htpStepJump: { ru: 'ПРЫГАТЬ', en: 'JUMP' },
  htpStepChips: { ru: 'СОБИРАТЬ ЧИПЫ', en: 'COLLECT CHIPS' },
  htpStepTrap: { ru: 'ЛОВУШКА ПРЕДУПРЕЖДАЕТ', en: 'A TRAP WARNS YOU' },
  htpStepDeath: { ru: 'СМЕРТЬ — ЭТО НОРМАЛЬНО', en: 'DYING IS FINE' },
  htpOr: { ru: 'ИЛИ', en: 'OR' },
  htpTap: { ru: 'ТАП', en: 'TAP' },
  htpChipsNote: { ru: 'Чипы открывают облик в магазине', en: 'Chips unlock skins in the shop' },
  htpTrapNote: { ru: 'Оранжевая вспышка = будет опасно', en: 'An orange flash means danger is coming' },
  htpDeathNote: {
    ru: 'Рестарт быстрый, кредиты не теряются. SYSTEM просто посчитает попытку.',
    en: 'Restarts are quick and credits stay. SYSTEM just counts the attempt.',
  },

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
  resultLeaderboardEmpty: { ru: 'Пока пусто', en: 'No times yet' },
  resultSignIn: { ru: 'Войти', en: 'Sign in' },
  resultMenu: { ru: 'Меню', en: 'Menu' },

  // Daily Challenge (master-prompt §74). A run is the same level under
  // different rules — a fixed number of lives on one clock — so these name
  // the run, never the campaign.
  dailyResultCleared: { ru: 'Испытание пройдено', en: 'Challenge cleared' },
  dailyResultFailed: { ru: 'Забег окончен', en: 'Run over' },
  dailyLives: { ru: 'Жизни', en: 'Lives' },
  dailyBestToday: { ru: 'Лучшее сегодня', en: "Today's best" },
  dailyNoResultYet: { ru: 'Ещё не пройдено', en: 'Not cleared yet' },
  dailyNextIn: { ru: 'Новое испытание через', en: 'Next challenge in' },
  dailyRetry: { ru: 'Ещё раз', en: 'Run again' },
  dailyContinue: { ru: 'Продолжить', en: 'Continue' },
  // No longer "for an ad": Yandex Games 4.5.2 says a rewarded-video reward
  // «не должна влиять на возможность продолжить игровой процесс», and a
  // continue is exactly that. The one-per-day allowance stays; the ad in
  // front of it is gone.
  dailyContinueHint: { ru: 'Один раз в день', en: 'Once per day' },
  dailyContinueSpent: { ru: 'Продолжение уже использовано', en: 'Continue already used' },
  resultSectorLabel: { ru: 'Сектор', en: 'Sector' },
  resultToMenu: { ru: 'В меню', en: 'To menu' },
  resultAllDoneShort: { ru: 'Всё пройдено', en: 'All complete' },
  // Shown on the sector-complete screen when the NEXT sector is behind a
  // star gate (`gameplay/stars.ts`). The number is composed from
  // `starGateFor` rather than written here — a gate that moves with the
  // campaign must not have its size typed into a translation.
  resultLockedSector: { ru: 'Сектор закрыт', en: 'Sector locked' },
  resultNeedStars: { ru: 'Нужно звёзд:', en: 'Stars needed:' },
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
  shopLockedName: { ru: '???', en: '???' },
  // Units only — the number in front comes from the rule that enforces it
  // (`SECTOR_COUNT`, `COLLECTOR_SKIN_STARS`). It used to read "5 СЕКТОРОВ"
  // whole, which was a campaign size typed into a translation: correct until
  // a sector was added, and wrong silently ever after.
  shopLockedSectors: { ru: 'СЕКТОРОВ', en: 'SECTORS' },
  shopLockedStars: { ru: 'ЗВЁЗД', en: 'STARS' },
  shopOneTimePurchase: { ru: 'РАЗОВАЯ ПОКУПКА', en: 'ONE-TIME PURCHASE' },
  shopTrialRun: { ru: 'ПРОБНЫЙ ЗАБЕГ', en: 'TEST RUN' },
  shopDeathPreview: { ru: 'ПРЕВЬЮ', en: 'PREVIEW' },
  shopSystemSample: { ru: '3 РЕПЛИКИ', en: '3 LINES' },
  // Offer copy is written against what the build actually does: interstitials
  // only ever fire at a sector break (`AdsService`), and the credits gift is a
  // real one-time grant in `PurchaseManager`. Nothing here promises a faster
  // respawn — the death-to-retry budget is the same for everyone (CLAUDE.md #5).
  shopNoAdsForever: { ru: 'БЕЗ РЕКЛАМЫ НАВСЕГДА', en: 'NO ADS FOREVER' },
  shopNoAdsFeature1: { ru: 'Никаких роликов между секторами', en: 'No video ads between sectors' },
  shopNoAdsFeature2: { ru: 'Подарок: 500 монет сразу', en: 'A gift: 500 credits right away' },
  shopNoAdsFeature3: { ru: 'Разовая покупка, не подписка', en: 'One-time purchase, not a subscription' },
  shopNoAdsNote: { ru: 'Уровни и облик от этого не меняются.', en: 'Levels and looks stay exactly the same.' },
  shopBundleFeature: { ru: 'Всё из «БЕЗ РЕКЛАМЫ», плюс:', en: 'Everything in NO ADS, plus:' },
  // Deliberately terse: these sit inside a 134x36 showroom button next to an
  // icon, where "Экипировать"/"Экипировано" ran the full width and read as a
  // sentence rather than a control (showroom redesign, 2026-09-06).
  shopBuy: { ru: 'Купить', en: 'Buy' },
  shopEquip: { ru: 'Надеть', en: 'Equip' },
  shopEquipped: { ru: 'Надет', en: 'Worn' },
  shopOwned: { ru: 'Есть', en: 'Owned' },
  shopWorn: { ru: 'НАДЕТО', en: 'WORN' },
  shopNotEnough: { ru: 'НЕ ХВАТАЕТ', en: 'NOT ENOUGH' },
  shopNotEnoughShort: { ru: 'НУЖНО', en: 'NEED' },
  shopReplay: { ru: 'ЕЩЁ РАЗ', en: 'AGAIN' },
  shopSignalShort: { ru: 'Сигнал', en: 'Signal' },
  shopRarityCommon: { ru: 'БАЗА', en: 'BASE' },
  shopRarityRare: { ru: 'РЕДКИЙ', en: 'RARE' },
  shopRarityPremium: { ru: 'ТОП', en: 'TOP' },
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

  // «Получить кредиты» (мокап 4d). Бесплатная половина перечисляет только
  // те источники, которые реально начисляют кредиты сегодня — ежедневного
  // входа и заданий в игре нет, поэтому и карточек под них здесь нет.
  creditsTitle: { ru: 'КРЕДИТЫ', en: 'CREDITS' },
  creditsSubtitle: { ru: 'ВАЛЮТА ДЛЯ ОБЛИКА И ТРЕЙЛОВ', en: 'CURRENCY FOR SKINS AND TRAILS' },
  creditsFreeBand: { ru: 'БЕСПЛАТНО — ЗА ИГРУ', en: 'FREE — FOR PLAYING' },
  creditsPaidBand: { ru: 'ЗА РЕАЛЬНЫЕ ДЕНЬГИ', en: 'FOR REAL MONEY' },
  creditsCosmeticOnly: { ru: 'ТОЛЬКО ВНЕШНИЙ ВИД', en: 'COSMETICS ONLY' },
  creditsAdCard: { ru: 'РОЛИК', en: 'AD' },
  creditsAdDesc: { ru: 'Полминуты рекламы.', en: 'Half a minute of ads.' },
  creditsAdReady: { ru: 'МОЖНО СЕЙЧАС', en: 'READY NOW' },
  creditsLevelCard: { ru: 'УРОВЕНЬ', en: 'LEVEL' },
  creditsLevelDesc: { ru: 'За каждый уровень.', en: 'Per level.' },
  creditsNoDeaths: { ru: 'БЕЗ СМЕРТЕЙ', en: 'NO DEATHS' },
  creditsSectorCard: { ru: 'СЕКТОР', en: 'SECTOR' },
  creditsSectorDesc: { ru: 'Сектор целиком.', en: 'A whole sector.' },
  creditsUnits: { ru: 'КРЕДИТОВ', en: 'CREDITS' },
  creditsBonus: { ru: 'БОНУС', en: 'BONUS' },
  creditsBestValue: { ru: 'ВЫГОДНО', en: 'BEST VALUE' },
  creditsNoPrice: { ru: 'НЕТ ЦЕНЫ', en: 'NO PRICE' },
  resultCreditsEarned: { ru: 'Получено', en: 'Earned' },

  shopSkinDefault: { ru: 'DEFAULT', en: 'DEFAULT' },
  shopSkinDefaultDesc: { ru: 'Базовый корпус android.', en: 'The android’s stock chassis.' },
  shopSkinVoid: { ru: 'VOID', en: 'VOID' },
  shopSkinVoidDesc: { ru: 'Тёмный корпус, лиловый визор.', en: 'A darkened chassis, a violet visor.' },
  shopSkinSignal: { ru: 'SIGNAL', en: 'SIGNAL' },
  shopSkinSignalDesc: { ru: 'Тот же корпус, сигнальный визор.', en: 'The stock chassis, a signal visor.' },
  shopSkinError404: { ru: 'ERROR 404', en: 'ERROR 404' },
  shopSkinError404Desc: { ru: 'Тебе не должно быть это доступно.', en: 'You should not have access to this.' },
  // The fitting-room legend is a fixed 126x22 slot (two 9px lines, ~44
  // characters) — descriptions are written to that budget instead of being
  // clipped mid-word with an ellipsis.
  shopSkinPatrol: { ru: 'ПАТРУЛЬ', en: 'PATROL' },
  shopSkinPatrolDesc: {
    ru: 'Обход ночной смены. Камеры смотрят на него.',
    en: 'The night shift round. Cameras watch him now.',
  },
  shopSkinEcho: { ru: 'ЭХО', en: 'ECHO' },
  shopSkinEchoDesc: {
    ru: 'Сигнал, который SYSTEM забыла. Он вернулся.',
    en: 'A signal SYSTEM forgot about. It came back.',
  },
  shopSkinReference: { ru: 'ЭТАЛОН', en: 'REFERENCE' },
  shopSkinReferenceDesc: { ru: 'Теперь сравнивают с тобой.', en: 'Now you are the benchmark.' },
  shopSkinCore: { ru: 'ЯДРО', en: 'CORE' },
  // Deliberately names no sector number: `core` unlocks on the WHOLE
  // campaign, which was five sectors when this line was written and will not
  // stay five. A description that counts is a description that goes stale.
  shopSkinCoreDesc: { ru: 'То, что остаётся, когда пройдено всё.', en: 'What is left when everything is cleared.' },

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
    ru: 'След из данных остаётся прямо за спиной.',
    en: 'A trail of data stays right behind you.',
  },
  shopTrailLaunch: { ru: 'ЗАПУСК', en: 'LAUNCH' },
  shopTrailLaunchDesc: {
    ru: 'Сопла в пятках. Просто чтобы было красиво.',
    en: 'Thrusters in the heels. Purely for the look.',
  },
  shopTrailInterference: { ru: 'ПОМЕХА', en: 'INTERFERENCE' },
  shopTrailInterferenceDesc: {
    ru: 'На скорости картинка рассыпается на строчки.',
    en: 'At speed the picture breaks into scan lines.',
  },
  shopTrailBeep7: { ru: 'БИП-7', en: 'BEEP-7' },
  shopTrailBeep7Desc: {
    ru: 'Дрону поручили следить. Он привязался.',
    en: 'A drone was told to watch you. It got attached.',
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
