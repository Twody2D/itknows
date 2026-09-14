# IT KNOWS

Мобильный (mobile-first) HTML5-платформер для Яндекс Игр в стиле modern pixel
cyberpunk. Игра наблюдает за поведением игрока и комментирует его —
детерминированно, без ML. Уровень при этом **всегда один и тот же**:
система адаптивных вариантов (`gentle`/`bold`/`troll`) удалена по решению
владельца 2026-09-14, наблюдение осталось, подстройка геометрии — нет.

Статус разработки, приоритеты и запреты — в [`CLAUDE.md`](./CLAUDE.md).
План работ по фазам — в [`TODO.md`](./TODO.md). Исходное ТЗ — в
[`docs/master-prompt.md`](./docs/master-prompt.md).

## Стек

TypeScript · Phaser 3 · Vite · Vitest · ESLint. Пакетный менеджер — pnpm.
Единственная runtime-зависимость — Phaser; все текстуры и весь звук
генерируются процедурно в рантайме. Бинарных ассетов в билде ровно один вид —
две self-hosted гарнитуры интерфейса (~300 КБ `.woff`/`.woff2`), осознанное
исключение, разрешённое владельцем и обоснованное в `src/ui/fonts.ts`.
Ни одного PNG/JPG/MP3/OGG и ни одного внешнего CDN-запроса.

## Установка

```bash
pnpm install
```

## Разработка

```bash
pnpm dev          # dev-сервер (http://localhost:5173)
pnpm typecheck    # tsc --noEmit
pnpm lint         # eslint
pnpm test         # vitest run
pnpm levels       # ASCII-раскладка всех 30 уровней + вердикт солвера
```

В dev-сборке доступен оверлей отладки: **F3** — FPS, текущий тир авто-
деградации качества, хитбоксы игрока и опасностей, триггеры и зоны выхода
(`src/dev/DebugOverlay.ts`, в прод-бандл не попадает).

## Сборка

```bash
pnpm build        # production build в dist/
pnpm preview      # локальный просмотр production build
pnpm size         # отчёт по размеру dist/ (бюджет — docs/performance-budget.md)
pnpm package      # проверить сборку и упаковать zip для консоли Яндекс Игр
```

`pnpm package` не просто архивирует: он отказывается паковать сборку, в
которой есть запрещённый формат ассета, отладочный след (`console.log`,
dev-оверлей) или абсолютный путь в `index.html` — последний сломался бы
внутри iframe Яндекса.

## Архитектура

Подробности — в [`docs/technical-architecture.md`](./docs/technical-architecture.md).
Кратко: модульная структура `core / scenes / gameplay / traps / ai / audio / fx
/ ui / services / data / utils / config`, виртуальное разрешение с фиксированной
высотой и плавающей шириной, единый `InputState` для клавиатуры и тача, весь
визуал — процедурная генерация на canvas.

## Yandex Games

Интеграция SDK — [`docs/yandex-games.md`](./docs/yandex-games.md): что
реализовано, что проверено и что осознанно отложено. Игра обязана полностью
работать при отсутствующем, сломанном или медленном SDK — это архитектурное
требование, а не факультативная опция, и оно закреплено 21 тестом в
`tests/sdk-scenarios.test.ts`.

## Проверка перед выкладкой

Ручной чек-лист (экраны, соотношения сторон, мультитач, сценарии SDK,
честность ловушек) — [`docs/qa-checklist.md`](./docs/qa-checklist.md).
Что за игра и почему она устроена именно так —
[`docs/game-design.md`](./docs/game-design.md).

## Производительность

Текущие метрики и бюджет — [`docs/performance-budget.md`](./docs/performance-budget.md).

## Git

Conventional Commits (`feat`, `fix`, `perf`, `refactor`, `test`, `docs`,
`chore`, `build`). Аннотированные теги на глобальных вехах — список в
`TODO.md`. Без AI-атрибуции в коммитах — см. `CLAUDE.md` и примечание в
`docs/master-prompt.md` §89.
