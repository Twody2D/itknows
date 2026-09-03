# Техническая архитектура

Статус: **Phase 0 (фундамент) + начало Phase 1 (вертикальный срез ядра геймплея).**
Обновляется по мере прохождения фаз в `TODO.md`. Правила, которым код должен
соответствовать, — в `CLAUDE.md`.

## Стек

- TypeScript (strict, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`)
- Phaser 3.90 (Arcade Physics)
- Vite 6 (сборка и dev-сервер)
- Vitest (юнит-тесты логики)
- ESLint 9 (flat config, `typescript-eslint`)
- Пакетный менеджер: pnpm

Никаких других runtime-зависимостей. Никакого React/Unity.

## Структура каталогов

```
src/
  main.ts                 — точка входа, конфигурация Phaser.Game
  core/                    — EventBus, GameState, ScaleController
  config/                  — display.ts, physics.ts, palette.ts (числовые константы)
  scenes/                  — BootScene, MainMenuScene, GameplayScene (растёт по фазам)
  gameplay/                — Player, Level, LevelDef (геометрия и контроллер игрока)
  art/                     — процедурная генерация текстур (SpriteFactory, draw*.ts)
  ui/components/           — переиспользуемые UI-виджеты (TouchControls)
  utils/                   — InputState, blockBrowserGestures, color.ts
  data/levels/             — определения уровней (сектор → уровни)
  traps/ ai/ audio/ fx/ services/ i18n/  — каркас создан, наполняется по фазам
tests/                     — Vitest: GameState, hexToCss, sanity-проверки LevelDef
scripts/size-report.mjs    — аудит размера dist/ (используется `pnpm size`)
docs/                      — этот файл, master-prompt.md, performance-budget.md
```

## Рендеринг и разрешение экрана

Виртуальная высота зафиксирована (`VIRTUAL_HEIGHT = 270`), ширина плавает между
`MIN_VIRTUAL_WIDTH = 480` и `MAX_VIRTUAL_WIDTH = 620` (см. `src/config/display.ts`).

`ScaleController` (`src/core/ScaleController.ts`) на каждом resize:

1. считает целочисленный zoom = `floor(window.innerHeight / VIRTUAL_HEIGHT)`;
2. считает логическую ширину = `window.innerWidth / zoom`, зажатую в диапазон;
3. вызывает `game.scale.resize(width, VIRTUAL_HEIGHT)` и `game.scale.setZoom(zoom)`.

Это даёт честный пиксель-арт (без размытия и без чёрных полос по бокам —
на широких экранах игрок видит больше по горизонтали) без ручной реализации
леттербоксинга. `Scale.Mode.NONE` в конфиге Phaser — управление разрешением
полностью в руках `ScaleController`.

`TILE_SIZE = 10`. Высота уровня всегда 27 тайлов (`LEVEL_HEIGHT_TILES` в
`gameplay/LevelDef.ts`) — ровно `VIRTUAL_HEIGHT`, поэтому вертикальный скролл
не нужен, только горизонтальный по ширине уровня.

## Ассеты: без бинарных файлов

Все текстуры (персонаж, тайлы земли/шипов, выход) рисуются на offscreen
`<canvas>` кодом в `src/art/` и регистрируются в Phaser через
`scene.textures.addCanvas()` во время `BootScene`. Персонаж собран из
геометрических примитивов (тело, visor, ноги, антенна), а не из
битмап-таблиц — это проще поддерживать на этом этапе и не требует ручной
пиксельной раскладки. Анимации персонажа — обычные Phaser `anims`, где кадры
ссылаются на разные canvas-текстуры.

Уровень 1 (`LevelDef`) — компактное структурное описание (ширина, ряд земли,
диапазоны провалов, колонки шипов, платформы, стартовая колонка, колонка
выхода), а не построчная ASCII-карта и не покадровый JSON. `Level.ts`
интерпретирует это описание в статические Arcade-группы.

## Ввод

`InputState` (`src/utils/input/InputState.ts`) объединяет клавиатуру
(A/D/стрелки, Space/Up/W для прыжка, Shift/X для рывка) и тач-кнопки
(`TouchControls`) в единый источник состояния с детекцией "нажато в этом
кадре" для прыжка и рывка. Игровая логика (`Player.ts`) не знает, откуда
пришёл ввод.

`blockBrowserGestures()` (`src/utils/input/blockBrowserGestures.ts`)
подавляет контекстное меню, выделение текста, drag-and-drop, скролл при
тач-жестах и двойной тап-зум — вызывается один раз до старта Phaser.Game.

## Игровой цикл (Phase 1, вертикальный срез)

`GameplayScene`:

1. строит уровень (`buildLevel`) и игрока (`Player`) по `LevelDef`;
2. настраивает коллайдеры (земля/платформы) и оверлапы (шипы → смерть, зона
   выхода → победа), а также ручную проверку падения за нижнюю границу мира;
3. на смерть — короткая пауза (450 мс) и `scene.restart()` с тем же уровнем
   (счётчик смертей не сбрасывается, старт таймера — тоже, пока уровень тот
   же — см. `GameState`);
4. на победу — короткая пауза (600 мс) и переход на следующий уровень сектора
   либо в главное меню, если уровень был последним.

Полноценный экран результатов, пауза и комментарии SYSTEM — это Phase 3/4;
до тех пор рестарт полностью автоматический, что всё ещё укладывается в
требование «смерть → рестарт < 700 мс» (`CLAUDE.md` #5).

## Физика и game feel

Значения зафиксированы в `src/config/physics.ts` и не должны меняться
инлайн в коде: coyote time 100 мс, jump buffer 120 мс, variable jump height
(отпускание прыжка гасит вертикальную скорость), увеличенная гравитация на
падении. Хитбоксы шипов уже сейчас на несколько пикселей меньше видимого
спрайта (прощающая коллизия).

## Что дальше

Phase 2 (`traps/`, `LevelFactory`, `LevelValidator`) заменит текущий простой
`LevelDef`/`Level.ts` на полноценную data-driven систему с вариациями и
солвером достижимости — см. `TODO.md`.
