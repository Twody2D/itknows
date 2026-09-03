# IT KNOWS

Мобильный (mobile-first) HTML5-платформер для Яндекс Игр в стиле modern pixel
cyberpunk. Игра наблюдает за поведением игрока и подбирает под него заранее
подготовленные вариации уровней — детерминированно, без ML.

Статус разработки, приоритеты и запреты — в [`CLAUDE.md`](./CLAUDE.md).
План работ по фазам — в [`TODO.md`](./TODO.md). Исходное ТЗ — в
[`docs/master-prompt.md`](./docs/master-prompt.md).

## Стек

TypeScript · Phaser 3 · Vite · Vitest · ESLint. Пакетный менеджер — pnpm.
Единственная runtime-зависимость — Phaser; все текстуры и (в будущем) звук
генерируются процедурно в рантайме, ни одного бинарного ассета в билде.

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
```

## Сборка

```bash
pnpm build        # production build в dist/
pnpm preview      # локальный просмотр production build
pnpm size         # отчёт по размеру dist/ (бюджет — docs/performance-budget.md)
```

## Архитектура

Подробности — в [`docs/technical-architecture.md`](./docs/technical-architecture.md).
Кратко: модульная структура `core / scenes / gameplay / traps / ai / audio / fx
/ ui / services / data / utils / config`, виртуальное разрешение с фиксированной
высотой и плавающей шириной, единый `InputState` для клавиатуры и тача, весь
визуал — процедурная генерация на canvas.

## Yandex Games

Интеграция SDK и связанная документация — Phase 6 (`docs/yandex-games.md`
появится по мере реализации). Игра обязана работать локально даже при
недоступном SDK — это архитектурное требование, а не факультативная опция.

## Производительность

Текущие метрики и бюджет — [`docs/performance-budget.md`](./docs/performance-budget.md).

## Git

Conventional Commits (`feat`, `fix`, `perf`, `refactor`, `test`, `docs`,
`chore`, `build`). Аннотированные теги на глобальных вехах — список в
`TODO.md`. Без AI-атрибуции в коммитах — см. `CLAUDE.md` и примечание в
`docs/master-prompt.md` §89.
