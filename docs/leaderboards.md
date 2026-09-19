# Таблицы лидербордов — что создать в консоли Яндекс Игр


Из клиентского кода таблицы не создаются: SDK умеет только писать и читать
счёт в **уже существующую** таблицу. Пока таблицы нет, игра ведёт себя
честно — экран результата показывает «ЛИДЕРБОРД НЕДОСТУПЕН», ничего не
падает, — но и таблицы нет. Это единственный пункт релиза, который целиком
делается руками в консоли разработчика.

Имена берутся из `src/services/LeaderboardService.ts`
(`level-${levelId}` и `sector-${sectorId}`) и **должны совпадать посимвольно**:
промах в одном символе — это молчаливая «таблица недоступна», без ошибки.
Этот файл сверяется с кодом тестом `tests/leaderboard-tables.test.ts`, так
что список не разъедется с игрой.

## Настройки, одинаковые для всех 70 таблиц

| Поле | Значение | Почему |
|---|---|---|
| Тип счёта | целое число (`numeric`) | отправляется `Math.round(timeMs)` — миллисекунды |
| Порядок сортировки | **по возрастанию** | это время: меньшее значение лучше |
| Инвертировать | да, если консоль называет это «меньшее значение выше» | то же самое другими словами |
| Десятичные знаки | 0 | миллисекунды уже целые |

Публичное название таблицы игрой нигде не читается — на экранах рисуются
собственные заголовки из `i18n`. Важно только техническое имя.

## 60 таблиц уровней

| # | Техническое имя | Уровень |
|---|---|---|
| 1 | `level-sector-01-level-01` | sector-01 / 01 · BOOT |
| 2 | `level-sector-01-level-02` | sector-01 / 02 · DROP |
| 3 | `level-sector-01-level-03` | sector-01 / 03 · PATROL |
| 4 | `level-sector-01-level-04` | sector-01 / 04 · SHIFT |
| 5 | `level-sector-01-level-05` | sector-01 / 05 · ASCENT |
| 6 | `level-sector-01-level-06` | sector-01 / 06 · BOOT COMPLETE |
| 7 | `level-sector-02-level-01` | sector-02 / 01 · CRUMBLE |
| 8 | `level-sector-02-level-02` | sector-02 / 02 · PENDULUM |
| 9 | `level-sector-02-level-03` | sector-02 / 03 · ORBIT |
| 10 | `level-sector-02-level-04` | sector-02 / 04 · FREEFALL |
| 11 | `level-sector-02-level-05` | sector-02 / 05 · BRIDGE |
| 12 | `level-sector-02-level-06` | sector-02 / 06 · GRID CORE |
| 13 | `level-sector-03-level-01` | sector-03 / 01 · BEAM |
| 14 | `level-sector-03-level-02` | sector-03 / 02 · OFFSET |
| 15 | `level-sector-03-level-03` | sector-03 / 03 · GATE |
| 16 | `level-sector-03-level-04` | sector-03 / 04 · PISTON ROW |
| 17 | `level-sector-03-level-05` | sector-03 / 05 · SQUEEZE |
| 18 | `level-sector-03-level-06` | sector-03 / 06 · CORE |
| 19 | `level-sector-04-level-01` | sector-04 / 01 · GHOST FLOOR |
| 20 | `level-sector-04-level-02` | sector-04 / 02 · CURRENT |
| 21 | `level-sector-04-level-03` | sector-04 / 03 · CIRCUIT |
| 22 | `level-sector-04-level-04` | sector-04 / 04 · AMBUSH |
| 23 | `level-sector-04-level-05` | sector-04 / 05 · PRESS |
| 24 | `level-sector-04-level-06` | sector-04 / 06 · DISTRICT |
| 25 | `level-sector-05-level-01` | sector-05 / 01 · HUNTED |
| 26 | `level-sector-05-level-02` | sector-05 / 02 · CHASE |
| 27 | `level-sector-05-level-03` | sector-05 / 03 · MIRROR |
| 28 | `level-sector-05-level-04` | sector-05 / 04 · GAUNTLET |
| 29 | `level-sector-05-level-05` | sector-05 / 05 · PRESSURE |
| 30 | `level-sector-05-level-06` | sector-05 / 06 · SYSTEM CORE |
| 31 | `level-sector-06-level-01` | sector-06 / 01 · LIFT-OFF |
| 32 | `level-sector-06-level-02` | sector-06 / 02 · WINDOW |
| 33 | `level-sector-06-level-03` | sector-06 / 03 · CHAIN |
| 34 | `level-sector-06-level-04` | sector-06 / 04 · CROSSING |
| 35 | `level-sector-06-level-05` | sector-06 / 05 · HOLD |
| 36 | `level-sector-06-level-06` | sector-06 / 06 · OVERCLOCK |
| 37 | `level-sector-07-level-01` | sector-07 / 01 · HOLD FIRE |
| 38 | `level-sector-07-level-02` | sector-07 / 02 · OFFBEAT |
| 39 | `level-sector-07-level-03` | sector-07 / 03 · GATE |
| 40 | `level-sector-07-level-04` | sector-07 / 04 · THROUGH |
| 41 | `level-sector-07-level-05` | sector-07 / 05 · RELAY |
| 42 | `level-sector-07-level-06` | sector-07 / 06 · REDLINE |
| 43 | `level-sector-08-level-01` | sector-08 / 01 · DRIFT |
| 44 | `level-sector-08-level-02` | sector-08 / 02 · UPSTREAM |
| 45 | `level-sector-08-level-03` | sector-08 / 03 · SORTED |
| 46 | `level-sector-08-level-04` | sector-08 / 04 · FEED |
| 47 | `level-sector-08-level-05` | sector-08 / 05 · RELOAD |
| 48 | `level-sector-08-level-06` | sector-08 / 06 · SORTING FLOOR |
| 49 | `level-sector-09-level-01` | sector-09 / 01 · FIRST STEP |
| 50 | `level-sector-09-level-02` | sector-09 / 02 · NARROW |
| 51 | `level-sector-09-level-03` | sector-09 / 03 · CRUMBLE |
| 52 | `level-sector-09-level-04` | sector-09 / 04 · CONVEY |
| 53 | `level-sector-09-level-05` | sector-09 / 05 · THROW |
| 54 | `level-sector-09-level-06` | sector-09 / 06 · SCAFFOLD |
| 55 | `level-sector-10-level-01` | sector-10 / 01 · RECALL |
| 56 | `level-sector-10-level-02` | sector-10 / 02 · PATIENCE |
| 57 | `level-sector-10-level-03` | sector-10 / 03 · MIRAGE |
| 58 | `level-sector-10-level-04` | sector-10 / 04 · MACHINE |
| 59 | `level-sector-10-level-05` | sector-10 / 05 · VOID |
| 60 | `level-sector-10-level-06` | sector-10 / 06 · TERMINAL |

## 10 таблиц секторов

Заполняются экраном «СЕКТОР ПРОЙДЕН» — сумма времени по сектору.

| # | Техническое имя | Сектор |
|---|---|---|
| 1 | `sector-sector-01` | сектор 01 |
| 2 | `sector-sector-02` | сектор 02 |
| 3 | `sector-sector-03` | сектор 03 |
| 4 | `sector-sector-04` | сектор 04 |
| 5 | `sector-sector-05` | сектор 05 |
| 6 | `sector-sector-06` | сектор 06 |
| 7 | `sector-sector-07` | сектор 07 |
| 8 | `sector-sector-08` | сектор 08 |
| 9 | `sector-sector-09` | сектор 09 |
| 10 | `sector-sector-10` | сектор 10 |

Двойное `sector-` не опечатка: имя строится как `sector-${sectorId}`, а сам
`sectorId` уже выглядит как `sector-07` (`gameplay/sectors.ts`, `sectorIdOf`).

## Голый список для копирования

```

level-sector-01-level-01
level-sector-01-level-02
level-sector-01-level-03
level-sector-01-level-04
level-sector-01-level-05
level-sector-01-level-06
level-sector-02-level-01
level-sector-02-level-02
level-sector-02-level-03
level-sector-02-level-04
level-sector-02-level-05
level-sector-02-level-06
level-sector-03-level-01
level-sector-03-level-02
level-sector-03-level-03
level-sector-03-level-04
level-sector-03-level-05
level-sector-03-level-06
level-sector-04-level-01
level-sector-04-level-02
level-sector-04-level-03
level-sector-04-level-04
level-sector-04-level-05
level-sector-04-level-06
level-sector-05-level-01
level-sector-05-level-02
level-sector-05-level-03
level-sector-05-level-04
level-sector-05-level-05
level-sector-05-level-06
level-sector-06-level-01
level-sector-06-level-02
level-sector-06-level-03
level-sector-06-level-04
level-sector-06-level-05
level-sector-06-level-06
level-sector-07-level-01
level-sector-07-level-02
level-sector-07-level-03
level-sector-07-level-04
level-sector-07-level-05
level-sector-07-level-06
level-sector-08-level-01
level-sector-08-level-02
level-sector-08-level-03
level-sector-08-level-04
level-sector-08-level-05
level-sector-08-level-06
level-sector-09-level-01
level-sector-09-level-02
level-sector-09-level-03
level-sector-09-level-04
level-sector-09-level-05
level-sector-09-level-06
level-sector-10-level-01
level-sector-10-level-02
level-sector-10-level-03
level-sector-10-level-04
level-sector-10-level-05
level-sector-10-level-06
sector-sector-01
sector-sector-02
sector-sector-03
sector-sector-04
sector-sector-05
sector-sector-06
sector-sector-07
sector-sector-08
sector-sector-09
sector-sector-10
```
