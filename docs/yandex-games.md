# Yandex Games SDK — сверено с документацией

Сверено: 2026-09-04, по `https://yandex.com/dev/games/doc/en/sdk/*`. Этот файл
фиксирует реальный API SDK и то, что из него реализовано в
`src/services/YandexGamesService.ts` — источник истины по прогрессу Phase 6
в этой части остаётся `TODO.md`.

## Подключение

Единственный внешний CDN-скрипт, разрешённый проектом (`CLAUDE.md` #1):

```html
<script src="https://yandex.ru/games/sdk/v2"></script>
```

После загрузки `YaGames` — глобальный объект:

```js
const ysdk = await YaGames.init();
```

`YandexGamesService` создаёт `<script>` тег динамически (не в `index.html`
статически), чтобы полное отсутствие/блокировку сети/сам факт запуска не
из Yandex Games (локальная разработка, тесты) можно было тихо проглотить в
одном месте — `try/catch` вокруг создания тега и `YaGames.init()`, без
дублирования этой проверки по всей игре.

## Что реализовано в этой правке

- `init()` — грузит скрипт, вызывает `YaGames.init()`, сохраняет `ysdk`.
  Вызывается один раз из `main.ts` в самом начале, не блокируя создание
  `Phaser.Game` (сеть может быть медленнее, чем загрузка текстур в
  `BootScene`).
- `isAvailable()` — `true` только после реально успешного `init()`. Пока SDK
  не доехал (или никогда не доедет) — `false`, и весь остальной код уже
  единообразно на это рассчитан (`AdsService.requestInterstitial`,
  `requestRewarded`).
- `notifyLoadingReady()` → `ysdk.features.LoadingAPI?.ready()`. Момент вызова
  — конец `MainMenuScene.create()` (меню реально интерактивно, `CLAUDE.md`
  #8). Идемпотентно на уровне сервиса: повторные визиты в меню не шлют
  повторный `ready()`. **Важный порядок**: если SDK ещё не успел
  инициализироваться к моменту, когда меню уже готово (обычный случай — сеть
  медленнее рендера), вызов не теряется, а откладывается и реально уходит в
  SDK по факту завершения `init()` — иначе честный "SDK был просто чуть
  медленнее" превратился бы в "ready() не вызван никогда".
- `notifyGameplayStart()` / `notifyGameplayStop()` →
  `ysdk.features.GameplayAPI?.start()/stop()`. Точки вызова в
  `GameplayScene.ts`: `start()` — в `create()` (новая попытка/рестарт после
  смерти — тот же цикл, что уже перезапускает `MusicSequencer`) и на
  `RESUME` (возврат из паузы); `stop()` — в `SHUTDOWN` (выход на другую
  сцену) и явно перед `scene.pause()` при открытии `PauseScene`. Меню,
  Settings, How To Play, Sector Complete — геймплеем не считаются
  (`CLAUDE.md` #8), там `GameplayAPI` не трогается вовсе.
  **Осознанно не покрыто в этой правке**: `OrientationGate`
  (переворот экрана не так, `game.pause()`) — это уже отдельный,
  общедвижковый паузный механизм, не сцена; добавление под него отдельной
  пары start/stop — следующий инкремент, а не часть этого прохода.
- `showInterstitial()` / `showRewarded()` — переведены с заглушки на
  реальные `ysdk.adv.showFullscreenAdv()` / `showRewardedVideo()`.
  `AdsService` (готов раньше, Phase 2) уже был единственной точкой входа для
  обоих — здесь поменялась только реализация под капотом, не публичный API,
  так что `AdsService` и вызывающий его код (`Sector Complete`) не менялись.

## Найденный вживую баг: SDK вне iframe

Реальный SDK (`https://yandex.ru/games/sdk/v2`) без всякого мока действительно
доступен по сети из этого окружения — и `YaGames.init()` реально успешно
резолвится, даже когда страница открыта напрямую, не во фрейме настоящего
Yandex Games. Но дальше отдельные методы (в частности `GameplayAPI`) кидают
необработанные промис-реджекшены `"No parent to post message"` — SDK
рассчитан на postMessage-обмен с родительским фреймом, которого в такой
конфигурации просто нет. Это подтверждено самой официальной документацией
(«Launch from local server»): для локальной разработки без реального фрейма
Yandex прямо рекомендует отдельный dev-прокси-пакет с моками, а не голый
`YaGames.init()`.

Заводить отдельный dev-инструмент — самостоятельная задача, вне охвата этой
правки (меняет workflow `pnpm dev`, требует дополнительный пакет). Вместо
этого `YandexGamesService.loadAndInit()` проверяет `window.self ===
window.top` **до** загрузки скрипта: если страница не во фрейме — SDK
считается недоступным сразу, без попытки достучаться до него вообще. Это не
костыль, а честное чтение ситуации: реальный SDK не бывает полезен без
настоящего родительского фрейма, а именно так игра всегда и будет
хоститься на самой платформе. Подтверждено headless-браузером: без этой
проверки — 20 необработанных ошибок в консоли на обычный playthrough
(меню → уровень → прыжок → пауза → резюм → смерть); с проверкой — ноль.

## Auth + player data — реализовано

`YandexGamesService.getPlayerData`/`setPlayerData` оборачивают
`ysdk.getPlayer({ scopes: false })` (без диалога разрешений — имя/аватар не
нужны) + `player.isAuthorized()`/`getData()`/`setData()`. **Важно**:
`getData`/`setData` реально сохраняют что-либо только для авторизованных
игроков — гость на Yandex Games не получает серверного хранилища вообще
(подтверждено поиском по документации и стороннему опыту интеграций), так
что для гостя `SaveService` тихо остаётся localStorage-only, ровно как
`CLAUDE.md` #8 и требует по умолчанию, а не только в отсутствие SDK.
`SaveService.syncWithCloud()` использует это как sync-слой поверх
localStorage — подробности мёржа в `TODO.md` Phase 6 и докстринге
`mergeSaves` в `src/services/SaveService.ts`. `player.setData` ограничен
200 КБ/игрока и 100 запросов/5 минут — укладывается с большим запасом (наш
`itknows.save.v1` — единицы КБ, пуш только на каждое завершение/начало
уровня).

## Payments — реализовано (клиентский режим)

Сверено против `yandex.com/dev/games/doc/en/sdk/sdk-purchases`:

```js
const payments = await ysdk.getPayments({ signed: false });
const catalog = await payments.getCatalog();           // IProduct[]
const purchase = await payments.purchase({ id });       // IPurchase (unsigned)
const purchases = await payments.getPurchases();        // IPurchase[]
await payments.consumePurchase(purchaseToken);
```

`IProduct`: `id`, `title`, `description`, `imageURI`, `price` (`"<цена> <валюта>"`),
`priceValue`, `priceCurrencyCode`. `IPurchase` (unsigned): `productID`,
`purchaseToken`, `developerPayload`. **Важно, из документации**: перед
`consumePurchase` игра обязана сначала сохранить факт начисления через
`player.setData`/`setStats`/`incrementStats` — иначе можно потерять
покупку, если приложение закроется между consume и сохранением.
`PurchaseManager` (`src/services/PurchaseManager.ts`) соблюдает этот порядок
(сначала `SaveService`, потом `consumePurchase`).

`YandexGamesService.getCatalog/purchase/getPurchases/consumePurchase` —
такая же деградация до пустого результата/`null`/no-op вне реального
Yandex-фрейма, как и весь остальной фасад; `getPayments({ signed: false })`
кэшируется один раз, как `getPlayer()`.

**Сознательно не реализовано**: `signed: true` (серверная проверка подписи
HMAC-SHA256) — это отдельная серверная инфраструктура, вне охвата текущего
среза магазина. Задокументировано как реальный пробел в `docs/SHOP.md`, а не
скрыто.

## Leaderboards + auth — реализовано

`ysdk.leaderboards.setScore/getEntries/getPlayerEntry` и
`ysdk.auth.openAuthDialog` добавлены в `YandexGamesService.ts` тем же
деградирующим паттерном, что и весь остальной фасад (пустой список/`null`/
no-op вне реального SDK или для гостя, никогда не бросает).

- `requestAuthorization()` — **единственная** дверь в авторизацию во всей
  игре, обёртка над `ysdk.auth.openAuthDialog()`. Вызывается только по
  осознанному действию — кнопка «Yandex ID» в `SettingsScene`, показывается
  ТОЛЬКО когда `YandexGamesService.isAvailable()` (иначе это была бы кнопка,
  которая никогда ничего не может сделать вне реального хостинга). Обратного
  пути (sign-out) нет — у самого SDK его нет, так что после входа строка
  становится статус-индикатором, а не кнопкой (master-prompt §41: гостевой
  режим обязателен, авторизация — только по явному действию, не блокирует
  геймплей).
- `submitScore`/`getLeaderboardEntries`/`getPlayerLeaderboardEntry` —
  `setScore`/`getPlayerEntry` реально требуют авторизованного игрока
  (сверено с документацией), `getEntries` — не требует, гость может читать
  таблицу без входа.
- **`LeaderboardService`** (`src/services/LeaderboardService.ts`) — тонкая
  обёртка поверх фасада с игровым правилом: `submitLevelScore` реально
  отправляет счёт только для каноничной (`'standard'`) вариации уровня —
  `gentle`/`bold`/`troll` подбираются под конкретного игрока и не сравнимы
  между игроками (утверждено раньше, TODO.md «Решённые вопросы» #4). Имя
  таблицы — `level-${levelId}`, по одной на уровень.
  **Реальный, документированный пробел**: сами таблицы с этими именами
  должны быть заранее созданы в консоли разработчика Yandex Games (по
  возрастанию — меньшее время побеждает) — из клиентского кода их создать
  нельзя, это не автоматизируется.
- **`LeaderboardSubmission.ts`** — тот же паттерн самоподключающегося модуля
  по событию, что и `shop/EconomyRewards.ts`: подписывается на
  `level:completed`, передаёт `GameState.currentVariantId` в
  `LeaderboardService.submitLevelScore` без дублирования проверки варианта.
  Импортируется один раз из `main.ts` ради побочного эффекта.
- **Подтверждено вживую** headless-браузером: вне реального фрейма (обычный
  `pnpm dev`) — `isAvailable()` false, строка «Yandex ID» в Settings не
  рендерится вообще, `level:completed` для каноничного варианта не кидает ни
  одной ошибки в консоль (тихий no-op). Отдельно — с фейковым `YaGames`
  внутри настоящего вложенного iframe (тот же приём, что раньше для
  `AdsService`/`PurchaseManager`): гость не отправляет счёт; реальный клик по
  кнопке «Yandex ID» реально вызывает `openAuthDialog` и обновляет подпись
  гость→вошли; после входа завершение каноничного варианта отправляет
  округлённое до целой мс время под именем `level-<id>`; завершение того же
  уровня в варианте `bold` счёт не отправляет; чтение чужой записи и
  собственной через фейковые `getEntries`/`getPlayerEntry` возвращает
  ожидаемые данные. Ноль ошибок консоли на всех путях.

## Что сверено, но не реализовано (следующие инкременты Phase 6)

- **Ghost-система** — отдельный пункт, не завязан на SDK напрямую.
- **Daily Challenge** — использует то же `LeaderboardService`
  (`leaderboardNameFor` пока покрывает только обычные уровни кампании;
  отдельное имя таблицы для Daily Challenge — часть самой задачи Daily
  Challenge, а не этой правки).

## Формальные лимиты API (на случай будущих багов из-за квот)

| Метод | Лимит |
|---|---|
| `player.setData` | 100 запросов / 5 минут, 200 КБ/игрока |
| `player.getData` | 100 запросов / 5 минут |
| `player.setStats`/`incrementStats` | 60 запросов / 1 минуту, 10 КБ/игрока |
| `leaderboards.setScore` | 1 запрос / секунду |
| `leaderboards.getPlayerEntry` | 60 запросов / 5 минут |
| `leaderboards.getEntries` | 20 запросов / 5 минут |

## Источники

- [SDK methods](https://yandex.com/dev/games/doc/en/requirements/1/19)
- [Game loading and gameplay markup](https://yandex.com/dev/games/doc/en/sdk/sdk-game-events)
- [Player data](https://yandex.com/dev/games/doc/en/sdk/sdk-player)
- [Leaderboards](https://yandex.com/dev/games/doc/en/sdk/sdk-leaderboard)
- [Advertising](https://yandex.com/dev/games/doc/en/sdk/sdk-adv)
- [Install and use the SDK](https://yandex.com/dev/games/doc/en/sdk/sdk-about)
