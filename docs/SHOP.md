# SHOP — SYSTEM ARCHIVE

Реализация магазина/монетизации, вертикальный срез (master-prompt
«MONETIZATION, SHOP & PREMIUM SYSTEM», §46 «не масштабируй систему
преждевременно»). Этот документ описывает, что реально сделано, как это
работает и что осознанно отложено.

## Экономика

Валюта — **CREDITS**, хранится как `credits: number` в `SaveService` (v2
схема), доступ только через `CurrencyService`
(`src/services/CurrencyService.ts`): `getBalance/earnCredits/spendCredits/
canAfford`. Баланс всегда неотрицательное целое, `NaN`/`Infinity` игнорируются.

Источники бесплатных CREDITS (`src/data/shop/economy.ts`):

| Событие | Сумма |
|---|---|
| Прохождение уровня | 10 |
| Прохождение уровня без единой смерти | +10 |
| Прохождение сектора | 25 |
| Просмотр rewarded-рекламы (добровольно) | 20 |

Отложено (нет инфраструктуры для честной реализации — не best-time
tracking, ни achievements, ни Daily Challenge пока не существуют):
new best, secret, achievement, Daily Challenge, perfect run.

## Категории и каталог (`src/data/shop/items.ts`)

- **CHARACTER**: `default` (бесплатный, экипирован по умолчанию), `void`
  (150 CREDITS), `signal` (150 CREDITS), `error404` (только в бандле
  SYSTEM ACCESS — не продаётся отдельно).
- **DEATH FX**: `static` (бесплатный), `glitch` (120 CREDITS), `data_wipe`
  (только в бандле).
- **SYSTEM**: `standard` (бесплатный), `cold` (150 CREDITS), `corrupted`
  (только в бандле).
- **PREMIUM**: `remove_ads` (реальный Yandex-продукт, non-consumable),
  `system_access` (реальный Yandex-продукт-бандл: remove_ads + `error404` +
  `data_wipe` + `corrupted`, выдаётся одной атомарной операцией).

Бандл-эксклюзивные предметы (`error404`/`data_wipe`/`corrupted`) никогда не
показываются в сетке магазина как покупаемые напрямую — только после того,
как реально получены через `system_access` (честность §28: не показывать
фальшивую покупку).

Consumable-паки кредитов (`src/data/shop/creditPacks.ts`):
`credits_100/550/1200/2500/6000` — без цены в коде; отображаемая цена всегда
берётся из `PurchaseManager.getCatalog()` (реальный каталог Yandex).

## Инвентарь

`InventoryService` (`src/services/InventoryService.ts`) хранит владение и
экипировку по трём слотам (`character`/`death_fx`/`system`) плюс владение
premium-продуктами — всё через `SaveService`, отдельного файла сохранения
нет. `equip()` отказывает, если предмет не куплен.

## Визуальные и игровые последствия косметики

- **Скины**: `drawPlayerFrame` принимает опциональный `{ body, visor }`
  (только цвета из `PALETTE`), `SpriteFactory` генерирует полный набор
  текстур/анимаций на каждый скин каталога один раз при загрузке
  (`BootScene`). `Player.ts` читает экипированный скин при спавне. Скин
  **никогда** не переопределяет цвет hurt/death/victory — это осталось
  честным телеграфированием состояния, а не косметикой.
- **Death FX**: `FxManager.deathBurst(x, y, variant)` — `static` не меняет
  существующий эффект, `glitch` добавляет два более широких прохода
  glitch-slice, тайминг не трогается.
- **SYSTEM-паки**: `DIALOGUE_POOLS` стал `PACKS[packId][category]`.
  `standard` — байт-в-байт прежний контент (эквивалентно отсутствию
  изменений для игрока, который не открывал магазин). `cold` — реальный,
  но меньший (2-3 реплики на категорию вместо ~10-13) альтернативный тон.
  Анти-повторный механизм `Commentator` не менялся.

## Покупки (Yandex Payments)

`YandexGamesService` получил facade
(`getCatalog/purchase/getPurchases/consumePurchase`), формы данных сверены
с `yandex.com/dev/games/doc/en/sdk/sdk-purchases` (см. `docs/yandex-games.md`).
Используется только клиентский (`signed: false`) режим.

`PurchaseManager` (`src/services/PurchaseManager.ts`) — единственная точка
входа для реальной покупки:

- `purchaseConsumable(productId)` / `purchaseEntitlement(productId)` —
  проверка по белому списку → `purchase()` → сохранение через
  `SaveService` (обязательно **до** `consumePurchase`, как того требует
  реальный API) → `consumePurchase` только для consumable.
- `restorePurchases()` — вызывается один раз при загрузке (после
  `YandexGamesService.init()` и `SaveService.syncWithCloud()`), находит и
  доигрывает любую покупку из `getPurchases()`, ещё не отмеченную как
  обработанную (`processedPurchaseTokens`) — покрывает «приложение закрылось
  во время покупки» и «покупка сделана на другом устройстве».
- Каждый `purchaseToken` обрабатывается ровно один раз — гарантия в
  `SaveService`, а не в памяти процесса.

`remove_ads`/`system_access` включают `AdsService.setAdsDisabled(true)`;
`PurchaseManager.init()` переигрывает уже имеющееся владение при каждой
загрузке, не только в момент покупки.

**Осознанный пробел**: серверная проверка подписи (`signed: true`,
HMAC-SHA256) не реализована — это отдельная серверная инфраструктура вне
охвата текущего среза. Доверие клиентской стороне здесь не отличается от
доверия, уже существующего для остальной игры (нет анти-чит системы вообще).

## UI — SYSTEM ARCHIVE (`src/scenes/ShopScene.ts`)

Оверлей-сцена (как `SettingsScene`/`LevelSelectScene`): панель, пейджинг по
4 категориям, сетка предметов с точкой-маркером владения, панель превью
(для персонажей — реальный спрайт экипированного скина), кнопка BUY/EQUIP,
подпанель «ПОЛУЧИТЬ КРЕДИТЫ» (паки + rewarded-реклама). Точки входа: кнопка
в углу главного меню, ссылка на экране Sector Complete.

Реплики SYSTEM в магазине (`src/data/dialogues/shop.ts`) — отдельный,
небольшой пул с защитой от повтора, **не** проходит через каскад приоритетов
`Commentator` (тот остаётся посвящён только комментариям к смерти).

## Dev-режим

`src/dev/ShopDevTools.ts` → `window.__shopDev`, подключается только через
`if (import.meta.env.DEV)` в `main.ts` (динамический `import()`), поэтому
полностью выпадает из прод-сборки — проверено grep'ом `dist/` на ноль
вхождений `ShopDevTools`/`shopDev`/`simulatePurchaseSuccess`.

Методы: `addCredits`, `unlock`, `resetInventory`, `simulatePurchaseSuccess`,
`simulatePurchaseFailure`, `simulateRestore`, `simulateNoAds`,
`isAdsDisabled`. Симуляции покупок временно подменяют
`YandexGamesService.purchase`/`getPurchases` только на время одного вызова —
проверяется настоящая логика `PurchaseManager`, а не её копия.

## Тесты

`tests/currency-service.test.ts`, `tests/inventory-service.test.ts`,
`tests/purchase-manager.test.ts` (идемпотентность, whitelist, restore-flow
на фейковом `YandexGamesService`), `tests/shop-items-sanity.test.ts`,
`tests/dialogue-packs.test.ts`, плюс расширенные `tests/save-service.test.ts`
(миграция v1→v2, merge не откатывает credits/инвентарь).

## Что осознанно отложено

- Secret/locked/hidden items UI (§28) — не показывается ни один
  fake-условный предмет.
- Дополнительные скины/Death FX/паки сверх текущих 3/2/2.
- Серверная проверка подписи покупок.
- Achievements / Daily Challenge как источники CREDITS.
