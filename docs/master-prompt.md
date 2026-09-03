# MASTER PROMPT — IT KNOWS

Исходное техническое задание проекта, сохранённое дословно как источник истины.
Все остальные документы в `docs/` и правила в `CLAUDE.md` — производные от этого
файла и от согласованных с владельцем проекта решений (см. `TODO.md`,
раздел «Вопросы на согласование» и историю коммитов).

---

## Production-ready mobile-first HTML5 game for Yandex Games

Ты работаешь как **Senior Game Developer + Game Designer + Technical Artist + UI/UX Designer + Audio Designer + QA Engineer + Performance Engineer + Release Engineer**.

Твоя задача — не написать демонстрационный прототип, а **полностью разработать, отполировать, протестировать и подготовить к публикации готовую HTML5-игру для Яндекс Игр**.

Рабочее название проекта:

# IT KNOWS

Главная идея:

> Это футуристический минималистичный pixel-art платформер, в котором игрок пытается пройти смертельно опасные уровни, а сама игра постепенно изучает поведение игрока и начинает использовать его привычки против него.

Главная эмоциональная формула:

> **«Игра пытается убить меня → я понимаю её правила → я адаптируюсь → игра адаптируется ко мне → я наконец побеждаю → хочу пройти ещё раз лучше».**

Игра должна вызывать эмоции:

* «ДА КАК?!»
* «Я ЗНАЛ, ЧТО ЭТО ЛОВУШКА!»
* «Она реально запомнила, что я делал».
* «Ещё одна попытка».
* «Теперь я точно пройду».
* «Чёрт, я умер буквально перед выходом».
* «Ладно. Ещё раз».

---

# 0. ГЛАВНОЕ ПРАВИЛО

Не создавай фальшивый прототип.

В результате должен существовать **реально запускаемый, играбельный, законченный продукт**, а не набор заглушек.

Если какой-либо компонент невозможно реализовать буквально так, как описано, выбери ближайшее качественное решение самостоятельно.

**Не останавливай разработку из-за мелких неопределённостей.**

Самостоятельно принимай технические и дизайнерские решения, если они не противоречат этому ТЗ.

Если видишь противоречие — выбирай решение, которое:

1. улучшает игровой опыт;
2. уменьшает размер билда;
3. повышает производительность;
4. упрощает поддержку;
5. соответствует требованиям Яндекс Игр.

Не добавляй функциональность только ради количества.

---

# 1. ЦЕЛЕВЫЕ ПЛАТФОРМЫ

Основная платформа:

* Яндекс Игры;
* мобильные браузеры;
* mobile-first;
* сенсорное управление;
* полноэкранный gameplay.

Дополнительно:

* desktop browser support;
* клавиатура для тестирования и комфортной игры на ПК.

Основная ориентация:

**landscape / горизонтальная.**

На мобильном устройстве интерфейс должен корректно работать с изменением размеров viewport.

Не допускай:

* горизонтального overflow;
* появления системного контекстного меню внутри игрового поля;
* случайного выделения текста;
* стандартных drag-and-drop браузера;
* скролла страницы во время gameplay;
* нарушения touch input.

Предусмотреть корректную обработку:

* touch;
* pointer;
* mouse;
* keyboard.

---

# 2. ТЕХНОЛОГИЧЕСКИЙ СТЕК

Используй максимально лёгкий и подходящий для HTML5 стек.

Предпочтительный вариант:

* TypeScript;
* Phaser 3;
* Vite;
* современный JavaScript/TypeScript build pipeline.

Не добавляй тяжёлые библиотеки без реальной необходимости.

Не используй Unity WebGL.

Не используй React для gameplay.

React/другой UI-framework не нужен, если интерфейс можно качественно реализовать средствами Phaser + HTML/CSS/Canvas.

Архитектура должна быть модульной.

---

# 3. ЖЁСТКАЯ ЦЕЛЬ ПО РАЗМЕРУ

Главная performance-цель:

> **production build должен быть максимально маленьким; целевой диапазон — примерно 10–20 MB или меньше.**

Это не повод ухудшать игру, но каждый тяжёлый ресурс должен иметь обоснование.

Проводить анализ итогового размера production build.

После каждого крупного этапа проверять размер.

Не добавлять:

* большие PNG;
* большие JPG;
* видео;
* неиспользуемые шрифты;
* тяжёлые audio tracks;
* огромные sprite sheets;
* тяжёлые UI frameworks;
* ненужные npm dependencies;
* готовые asset packs;
* большие сторонние библиотеки.

Не использовать:

* Dependabot.

---

# 4. ВИЗУАЛЬНЫЙ СТИЛЬ

Название стиля:

# MODERN PIXEL CYBERPUNK

Это НЕ должна быть копия NES/SNES.

Необходимо сочетать:

* 8-bit / 16-bit pixel-art эстетику;
* современную композицию;
* минимализм;
* неоновое освещение;
* плавные анимации;
* современные частицы;
* современный UI;
* аккуратные glow/glitch эффекты.

Визуальная цель:

> Игрок должен подумать «это pixel-art игра», но одновременно ощущать, что это современный продукт, а не попытка сделать игру в стиле 1980-х.

---

# 5. ВИЗУАЛЬНАЯ ПАЛИТРА

Основной мир:

* почти чёрный;
* очень тёмный графит;
* тёмный сине-фиолетовый.

Акцентные цвета:

* cyan — интерактивные элементы;
* red/orange — опасность;
* purple — SYSTEM / AI;
* white — игрок и важные элементы;
* yellow — награды.

Не использовать множество цветов одновременно.

Принцип:

> 90% тёмная спокойная сцена + 10% ярких акцентов.

Не превращать игру в кислотный cyberpunk.

---

# 6. ASSETS — НЕ ДЕЛАТЬ NEUROSLOP

Не использовать:

* случайные AI-generated картинки;
* готовые стикеры;
* чужие icon packs;
* случайные ассеты из интернета;
* узнаваемые элементы чужих игр;
* чужие логотипы;
* copyrighted assets.

Весь визуальный стиль должен выглядеть как единая авторская система.

## Предпочтительный подход

Большинство игровых элементов создавать:

* процедурно;
* средствами Phaser;
* Canvas;
* SVG;
* простыми геометрическими primitives;
* pixel-art shapes.

UI-иконки и декоративные элементы:

**SVG.**

Не подключать большую библиотеку иконок.

Если нужен icon:

> создать минимальный собственный SVG.

---

# 7. PIXEL ART

Pixel-art должен быть намеренным и консистентным.

Использовать ограниченную виртуальную pixel resolution / grid, если это улучшает стиль.

Избегать:

* мыльных текстур;
* случайного смешивания pixel и smooth art;
* нечитаемых мелких деталей.

Игровой персонаж должен хорошо читаться даже на маленьком мобильном экране.

---

# 8. ГЛАВНЫЙ ПЕРСОНАЖ

Создать маленького кибернетического андроида/дрона.

Он должен быть:

* простым;
* запоминающимся;
* визуально уникальным;
* хорошо читаемым;
* дешёвым для рендеринга.

Не использовать сложную реалистичную модель.

Персонаж состоит из небольшого количества pixel-art элементов.

Основной визуальный элемент:

**светящийся visor / глаза.**

Состояния:

* idle;
* run;
* jump;
* fall;
* land;
* hurt;
* death;
* victory.

Эмоции передавать через:

* форму visor;
* положение корпуса;
* небольшие анимации;
* частицы.

---

# 9. ОСНОВНОЙ GAMEPLAY

Это одиночный платформер.

**Один игрок.**

Никакого multiplayer.

Игрок управляет одним персонажем.

Основная задача:

> пройти уровень и добраться до выхода.

Но уровень активно пытается убить игрока.

---

# 10. УПРАВЛЕНИЕ

Мобильное управление должно быть очень простым.

Базовая схема:

* LEFT;
* RIGHT;
* JUMP;
* DASH, если он нужен в конкретной версии механики.

Не перегружать экран.

Кнопки должны быть:

* крупными;
* удобными для большого пальца;
* полупрозрачными;
* визуально интегрированными в стиль.

Кнопки должны автоматически адаптироваться под разные aspect ratios.

Для desktop:

* A/D или стрелки;
* Space;
* Shift/X для dash, если dash используется.

Настройки позволяют увидеть управление.

---

# 11. CORE LOOP

Главный цикл:

```text
START
↓
PLAY
↓
OBSERVE
↓
MAKE DECISION
↓
TRAP
↓
SURVIVE / DIE
↓
DEATH COMMENT
↓
INSTANT RETRY
↓
LEARN
↓
ADAPT
↓
PASS LEVEL
↓
REWARD
↓
NEXT LEVEL / RETRY FOR BETTER SCORE
```

Очень важно:

## DEATH → RETRY должен занимать минимальное время.

Не заставлять пользователя проходить длинные меню.

После смерти:

1. короткий death animation;
2. комментарий SYSTEM;
3. кнопка TRY AGAIN;
4. моментальный рестарт.

---

# 12. ОСНОВНАЯ ФИШКА — ИГРА УЧИТСЯ

В игре есть AI/System.

Рабочее имя:

# THE SYSTEM

Это не настоящий ML.

Не использовать тяжёлую machine-learning систему.

Сделать **детерминированную систему анализа поведения игрока**.

Она собирает gameplay telemetry:

* частота прыжков;
* предпочитаемая сторона;
* время реакции;
* места смертей;
* повторяемые ошибки;
* длительность остановок;
* выбранные маршруты;
* количество повторных попыток;
* склонность к риску;
* скорость прохождения.

На основании этого система может выбирать заранее разработанные вариации уровня.

---

# 13. ВАЖНО: НИКАКОЙ НЕДОБРОСОВЕСТНОЙ СЛОЖНОСТИ

Игра должна быть сложной, но честной.

Запрещено:

* случайно убивать игрока без возможности понять причину;
* создавать физически невозможные ситуации;
* делать RNG, который невозможно предсказать;
* создавать softlock;
* создавать обязательную реакцию быстрее человеческой физиологии;
* использовать адаптацию только ради искусственного увеличения сложности.

Главное правило:

> **После смерти игрок должен понимать: «Я мог этого избежать».**

Игрок может ошибаться.

Игра может троллить.

Но игра не должна обманывать физику.

---

# 14. ТИПЫ ЛОВУШЕК

Создать систему reusable traps.

Минимальный набор:

### Static spikes

Обычные шипы.

### Moving spikes

Шипы с предсказуемым движением.

### Laser

Лазер с warning phase.

### Delayed laser

Лазер активируется через задержку.

### Fake platform

Платформа выглядит безопасной, но имеет понятный визуальный сигнал.

### Disappearing platform

Платформа исчезает после контакта.

### Falling platform

Платформа начинает падать.

### Moving platform

Платформа перемещается.

### Electric floor

Опасная поверхность.

### Trigger trap

Ловушка активируется при определённом действии.

### Pursuer

Небольшой объект преследует игрока.

### Timing gate

Проход требует правильного тайминга.

### Fake exit

Выход может оказаться не настоящим, но использовать это редко и честно.

---

# 15. ТРОЛЛИНГ

Троллинг — одна из ключевых особенностей.

Но он должен быть:

* умным;
* разнообразным;
* предсказуемым после смерти;
* редко повторяющимся;
* основанным на ожиданиях игрока.

Примеры:

Игрок привык прыгать через каждый gap.

→ один gap можно безопасно пройти без прыжка.

Игрок всегда выбирает левый путь.

→ иногда левый путь становится ловушкой.

Игрок ждёт ловушку.

→ её нет.

Игрок перестал ждать ловушку.

→ она появляется.

Игрок постоянно прыгает рано.

→ следующая ловушка наказывает именно ранний прыжок.

---

# 16. SYSTEM ДОЛЖЕН ИМЕТЬ ХАРАКТЕР

THE SYSTEM — не просто narrator.

Он:

* саркастичный;
* наблюдательный;
* иногда доброжелательный;
* иногда пугающе точный;
* иногда троллит;
* иногда неожиданно хвалит.

Никогда не превращать его в постоянно токсичного персонажа.

Он должен постепенно становиться отдельным персонажем игры.

---

# 17. DEATH COMMENTATOR

После каждой смерти выбирать комментарий, соответствующий контексту.

Не использовать одну случайную фразу из огромного массива.

Создать категории:

### Early death

Если игрок умер почти сразу:

* "Impressive."
* "That was fast."
* "We just started."

### Fall

* "Gravity wins again."
* "The floor was down there."
* "You had one job."

### Repeated mistake

После нескольких одинаковых смертей:

* "Again?"
* "You already tried that."
* "You knew this was coming."
* "Interesting strategy."

### Near exit

* "So close."
* "You could almost taste it."
* "That was painful."

### Long hesitation

* "Were you waiting for something?"
* "You can move, you know."

### Successful adaptation

После того как игрок несколько раз ошибался и наконец избегает ловушки:

* "Learning."
* "Better."
* "Finally."

### Multiple deaths

После определённого количества смертей:

* "Ten attempts."
* "Still here?"
* "I admire the persistence."

Не использовать оскорбления личности.

Юмор должен быть игровым.

---

# 18. SYSTEM НЕ ДОЛЖЕН ПОВТОРЯТЬСЯ СЛИШКОМ ЧАСТО

Добавить cooldown/repetition protection.

Не показывать одинаковую реплику два раза подряд.

Учитывать контекст.

Создать приоритеты комментариев:

```text
specific event
↓
repeated failure
↓
near miss
↓
general death
```

---

# 19. САМАЯ ВАЖНАЯ ЭМОЦИОНАЛЬНАЯ ФОРМУЛА

Игрок должен получать:

```text
challenge
↓
failure
↓
anger
↓
understanding
↓
hope
↓
near success
↓
victory
↓
desire to improve
```

Не делать игру постоянно злой.

Игрок должен периодически чувствовать:

> **«Я становлюсь лучше».**

---

# 20. НАДЕЖДА

Очень важно давать игроку ощущение, что победа рядом.

Уровни должны иметь:

* визуально понятный прогресс;
* хорошо читаемый exit;
* escalating music;
* более интенсивные эффекты ближе к концу;
* понятную кульминацию.

Иногда игрок должен умереть буквально рядом с выходом.

Но после этого:

> **TRY AGAIN**

и он уже знает весь маршрут.

---

# 21. LEVEL DESIGN

Не генерировать всё полностью случайно.

Использовать:

## HANDCRAFTED LEVELS

Основные уровни.

Они должны быть спроектированы вручную из reusable components.

## VARIATIONS

Каждый уровень может иметь несколько вариантов:

* trap timing;
* platform layout;
* route;
* safe/unsafe choices;
* enemy behavior;
* визуальные hints.

THE SYSTEM выбирает допустимые варианты на основе поведения игрока.

---

# 22. LEVEL VALIDATION

Каждый процедурный/вариативный уровень должен проходить validation.

Проверять:

* существует ли путь от старта до выхода;
* достижимы ли обязательные платформы;
* нет ли softlock;
* можно ли физически пройти уровень;
* не требуется ли невозможный input timing;
* не блокирует ли ловушка единственный путь навсегда.

Если генерация не проходит validation:

> discard variation → generate another.

---

# 23. ПРОГРЕССИЯ

Игра должна иметь понятную прогрессию.

Структура:

```text
SECTOR 01
  LEVEL 01
  LEVEL 02
  LEVEL 03
  ...
SECTOR 02
...
```

Каждый сектор добавляет новую механику.

Например:

### Sector 01 — SYSTEM BOOT

Базовое движение.

### Sector 02 — NEON GRID

Moving platforms.

### Sector 03 — INDUSTRIAL CORE

Lasers.

### Sector 04 — DATA DISTRICT

Timing traps.

### Sector 05 — SYSTEM CORE

Комбинирование механик.

---

# 24. ПЕРВЫЕ 10 МИНУТ

Первые минуты критически важны.

### Level 1

Очень простой.

Игрок должен понять:

* движение;
* прыжок;
* выход.

Не убивать игрока сразу.

### Level 2

Первая очевидная ловушка.

Игрок, скорее всего, погибает.

Первый death comment.

### Level 3

Игрок уже понимает базовую механику.

### Level 4

Первая неожиданность.

### Level 5

Первый серьёзный challenge.

### Level 6+

Начинается комбинация механик.

К 10-й минуте игрок должен уже понимать:

> **эта игра специально пытается меня переиграть.**

---

# 25. НЕОН + PIXEL EFFECTS

Создать собственную lightweight FX system.

Эффекты:

* pixel particles;
* glow;
* sparks;
* trails;
* impact;
* dash trail;
* jump dust;
* death explosion;
* warning pulse;
* laser activation;
* screen shake;
* subtle chromatic/glitch effect.

Не использовать тяжёлые видеоэффекты.

Использовать Canvas/WebGL возможности Phaser разумно.

---

# 26. DEATH EFFECT

Смерть должна стать одной из визуальных фишек.

При смерти:

1. персонаж останавливается;
2. короткий impact;
3. sprite распадается на pixel fragments;
4. fragments разлетаются;
5. короткая вспышка;
6. небольшой glitch;
7. экран очищается;
8. SYSTEM comment;
9. TRY AGAIN.

Не затягивать.

---

# 27. VICTORY EFFECT

Победа должна ощущаться приятно.

Использовать:

* bright pulse;
* частицы;
* короткий музыкальный resolution;
* изменение света;
* красивый exit animation;
* статистику.

Не использовать длинную заставку.

---

# 28. КАМЕРА

2D camera.

Плавное следование за игроком.

Без сильного camera lag.

При смерти:

очень короткий controlled zoom/impact, если это не ухудшает UX.

Screen shake использовать умеренно.

Добавить возможность отключить сильные visual effects в настройках, если это необходимо.

---

# 29. BACKGROUND

Минималистичный pixel cyberpunk.

Фон может быть процедурным:

* neon grid;
* distant buildings;
* pixel particles;
* digital rain;
* moving lights;
* silhouettes;
* holographic elements.

Не создавать тысячи изображений.

Использовать parallax layers.

Фон должен быть визуально красивым, но не отвлекать от gameplay.

---

# 30. АУДИО

Музыка должна быть очень лёгкой по размеру.

Не использовать много больших MP3/OGG файлов.

Предпочтительно:

* короткие loops;
* сжатые assets;
* повторное использование;
* pitch variation;
* procedural/simple sound generation, где это уместно.

Создать SFX для:

* jump;
* land;
* dash;
* button;
* laser;
* trap activation;
* hit;
* death;
* retry;
* level complete;
* reward;
* UI interaction.

---

# 31. ДИНАМИЧЕСКАЯ МУЗЫКА

Использовать несколько лёгких музыкальных слоёв/состояний:

### Calm

Обычный gameplay.

### Tension

Опасность.

### Critical

Игрок близко к кульминации.

### Victory

Победа.

Не загружать огромные треки.

---

# 32. AUDIO FOCUS

При потере focus:

**звук должен остановиться/поставиться на паузу корректно.**

При возврате:

возобновить состояние, если это уместно.

Добавить:

* mute;
* volume;
* music volume;
* SFX volume.

Сохранить настройки.

---

# 33. ГЛАВНОЕ МЕНЮ

Главное меню должно быть **красивым и современным**.

Не делать стандартное:

```text
PLAY
SETTINGS
EXIT
```

на пустом фоне.

Главный экран:

* dark pixel cyberpunk environment;
* персонаж;
* subtle animated background;
* neon lights;
* particles;
* SYSTEM terminal;
* аккуратные панели;
* animated logo.

Название:

# IT KNOWS

Под ним маленький статус:

> SYSTEM ONLINE

Главная кнопка:

# PLAY

Дополнительные:

* Continue;
* Settings;
* Leaderboard;
* How to Play.

Если какая-либо кнопка недоступна до определённого прогресса — она должна быть визуально disabled, а не заглушкой.

---

# 34. MENU ANIMATION

При открытии:

* background fade;
* logo появление;
* лёгкий glitch;
* UI panels slide/fade;
* subtle particle movement.

Не делать чрезмерные анимации.

60 FPS priority.

---

# 35. SETTINGS

Минимальный набор:

* Music ON/OFF;
* SFX ON/OFF;
* Master Volume;
* screen effects ON/OFF;
* controls/help;
* reset progress.

Reset progress должен требовать подтверждение.

---

# 36. HOW TO PLAY

Очень короткое интерактивное объяснение.

Не заставлять читать длинный текст.

Показывать:

```text
MOVE
JUMP
SURVIVE
```

и несколько визуальных примеров.

---

# 37. PAUSE

Во время gameplay:

* Resume;
* Restart;
* Settings;
* Main Menu.

Pause должен корректно останавливать:

* gameplay;
* timers;
* audio;
* particles/необязательные expensive systems.

---

# 38. RESULT SCREEN

После прохождения:

```text
SECTOR 01
LEVEL 07

TIME
00:42.71

DEATHS
03

BEST
00:38.42

RANK
#1842
```

Добавить:

* Retry;
* Next Level;
* Continue.

Если установлен новый рекорд:

> NEW BEST

Если игрок улучшил death count:

> CLEANER RUN

---

# 39. REPLAYABILITY

После прохождения уровня игрок должен иметь причину сыграть ещё раз.

Использовать:

* best time;
* death count;
* completion score;
* stars/grade;
* leaderboard;
* ghost;
* personal best.

---

# 40. GHOST SYSTEM

Добавить лёгкую систему ghost.

Игрок может видеть ghost своего лучшего забега.

Ghost:

* полупрозрачный;
* pixel styled;
* не мешает gameplay;
* отключаемый.

Ghost не должен сохранять огромные видео.

Сохранять только компактный набор input/state samples.

---

# 41. LEADERBOARDS

Интегрировать лидерборды через Yandex Games SDK там, где это возможно и корректно.

Не требовать авторизацию для начала игры.

Гостевой режим обязателен.

Если пользователь хочет leaderboard/cloud features, предложить авторизацию через Yandex ID только после осознанного действия.

Не блокировать gameplay авторизацией.

---

# 42. SAVE SYSTEM

Прогресс должен работать без регистрации.

Сохранять:

* unlocked sectors;
* unlocked levels;
* best time;
* best deaths;
* settings;
* completed challenges;
* player preferences;
* ghost data, если возможно.

Использовать local storage для guest progress.

Использовать Yandex Games SDK cloud storage при наличии авторизации/поддержки.

Обеспечить graceful fallback.

Никогда не терять прогресс из-за недоступности SDK.

---

# 43. YANDEX GAMES SDK

Интегрировать актуальный Yandex Games SDK согласно официальной документации.

Не копировать старые API patterns, если актуальная документация использует другой API.

Перед реализацией:

1. изучить актуальную документацию;
2. определить необходимые методы;
3. реализовать adapter layer.

Создать отдельный модуль:

```text
YandexGamesService
```

Он должен инкапсулировать:

* initialization;
* loading ready;
* gameplay start;
* gameplay stop;
* cloud saves;
* auth;
* leaderboard;
* ads;
* payments, если они понадобятся.

Gameplay код не должен напрямую зависеть от глобального `ysdk`.

---

# 44. SDK MUST BE FAIL-SAFE

Игра должна запускаться и играть локально даже если Yandex SDK:

* недоступен;
* не загрузился;
* находится в mock environment;
* заблокирован;
* работает с задержкой.

Нельзя делать SDK единственной точкой отказа.

---

# 45. GAME READY

Корректно вызвать Yandex Games loading ready API в момент, когда пользователь действительно может начать игру.

Не вызывать слишком рано.

Не вызывать слишком поздно.

---

# 46. GAMEPLAY EVENTS

Корректно обозначать:

* gameplay start;
* gameplay stop;
* pause;
* menu;
* active gameplay.

Не считать нахождение пользователя в меню полноценным gameplay.

---

# 47. РЕКЛАМА

Монетизация должна быть встроена аккуратно.

Не ставить рекламу:

* сразу после запуска;
* до первого gameplay;
* после каждой смерти;
* в середине напряжённого момента;
* так, чтобы игрок случайно нажимал рекламу.

Основной вариант:

### Rewarded Ad

Например:

> x2 reward

или

> optional revive / retry assistance

Но реклама должна быть **добровольной**.

Fullscreen ads использовать осторожно и только в местах, где это не разрушает UX и соответствует текущим правилам Яндекс Игр.

Не имитировать рекламные блоки.

Не создавать fake ad UI.

Если рекламная интеграция не готова или не нужна для текущего MVP, architecture должна позволять добавить её позже без переписывания gameplay.

---

# 48. MONETIZATION PRINCIPLE

Не продавать победу напрямую.

Не превращать игру в pay-to-win.

Основной потенциальный monetization:

* rewarded ads;
* cosmetic unlocks;
* optional boosts, если они не ломают competition;
* дополнительные визуальные эффекты.

Но сначала качество gameplay.

---

# 49. PERFORMANCE

Главный приоритет:

# LOW-END MOBILE FIRST

Оптимизировать:

* draw calls;
* texture memory;
* object creation;
* garbage collection;
* particle count;
* physics calculations;
* DOM operations;
* event listeners;
* audio decoding;
* bundle size.

Избегать:

* создания объектов каждый frame;
* большого количества allocations в update loop;
* ненужных closures;
* тяжёлых post-processing shaders;
* огромных particle systems;
* огромного DOM UI.

Использовать object pooling там, где это действительно помогает.

---

# 50. 60 FPS

Целевая производительность:

**stable 60 FPS на нормальных мобильных устройствах.**

На слабых устройствах:

* автоматически уменьшать particles;
* снижать expensive effects;
* отключать второстепенные background effects.

Gameplay physics и controls должны оставаться стабильными.

---

# 51. RESPONSIVE DESIGN

Проверить:

* 16:9;
* 18:9;
* 19.5:9;
* tall mobile;
* tablet;
* desktop.

Не допускать:

* обрезки UI;
* выхода кнопок за экран;
* перекрытия gameplay;
* слишком маленьких touch controls.

---

# 52. ACCESSIBILITY / COMFORT

Минимально предусмотреть:

* возможность отключить звук;
* возможность отключить часть screen effects;
* понятные controls;
* достаточный contrast;
* touch targets appropriate size.

---

# 53. GAME ARCHITECTURE

Предпочтительная структура:

```text
src/
  core/
    Game.ts
    GameState.ts
    EventBus.ts

  scenes/
    BootScene.ts
    LoadingScene.ts
    MainMenuScene.ts
    GameplayScene.ts
    PauseScene.ts
    ResultScene.ts
    SettingsScene.ts

  gameplay/
    Player.ts
    Level.ts
    LevelFactory.ts
    LevelValidator.ts
    CheckpointSystem.ts

  traps/
    Trap.ts
    LaserTrap.ts
    SpikeTrap.ts
    MovingTrap.ts
    FallingPlatform.ts
    TriggerTrap.ts

  ai/
    SystemAI.ts
    PlayerProfile.ts
    BehaviorTracker.ts
    DifficultyDirector.ts
    Commentator.ts

  audio/
    AudioManager.ts
    MusicManager.ts
    SFXManager.ts

  fx/
    ParticleManager.ts
    ScreenEffects.ts
    DeathFX.ts
    VictoryFX.ts

  ui/
    components/
    screens/

  services/
    YandexGamesService.ts
    SaveService.ts
    LeaderboardService.ts
    AdsService.ts

  data/
    levels/
    traps/
    dialogues/
    balance/

  utils/
    math/
    input/
    storage/

  config/
```

Адаптируй структуру, если есть более качественное решение.

---

# 54. DATA-DRIVEN DESIGN

Баланс не должен быть захардкожен в сотнях мест.

Создать конфиги для:

* player speed;
* jump force;
* gravity;
* dash;
* trap timings;
* difficulty;
* reward;
* commentary;
* level parameters.

Уровни хранить в компактном data-driven формате.

Не хранить каждый уровень как огромный JSON с повторяющимися данными.

Использовать reusable definitions.

---

# 55. NO DEAD CODE

После каждого этапа:

* удалять unused imports;
* удалять временные assets;
* удалять debug code;
* удалять экспериментальные зависимости;
* удалять неиспользуемые файлы.

Не оставлять:

```text
TODO: implement later
```

в местах, которые являются частью обязательного функционала.

---

# 56. DEBUG MODE

Создать dev-only debug tools.

Например:

* show hitboxes;
* skip level;
* kill player;
* reset level;
* show player behavior profile;
* show current difficulty;
* show selected trap variation;
* FPS;
* memory/debug stats.

Debug tools не должны попадать в production build, если это возможно.

---

# 57. TESTING

Обязательно тестировать:

### Gameplay

* движение;
* прыжок;
* collision;
* death;
* restart;
* victory;
* pause.

### Traps

Каждый тип ловушки отдельно.

### Save

* first launch;
* reload;
* corrupted save;
* empty save;
* guest save.

### SDK

* SDK available;
* SDK unavailable;
* delayed initialization;
* auth declined;
* leaderboard unavailable.

### UI

* mobile;
* desktop;
* resize;
* orientation.

### Audio

* focus loss;
* mute;
* volume;
* pause.

---

# 58. AUTOMATED CHECKS

Добавить минимальные automated tests там, где они реально полезны.

Особенно:

* level validation;
* save/load serialization;
* difficulty calculations;
* behavior tracking;
* score calculation.

Не писать бессмысленные тесты ради покрытия.

---

# 59. BUILD CHECK

Создать production build.

Проверить:

* build succeeds;
* no runtime errors;
* no console errors;
* no broken assets;
* no missing imports;
* no missing fonts;
* no 404;
* no oversized asset;
* correct HTML entry;
* correct static asset paths.

---

# 60. BUNDLE SIZE AUDIT

После production build выполнить анализ:

* total build size;
* JS size;
* CSS size;
* asset size;
* audio size;
* largest files.

Если размер превышает целевой диапазон:

1. найти причины;
2. удалить unnecessary assets;
3. compress;
4. tree-shake;
5. optimize audio;
6. optimize textures;
7. reduce dependencies;
8. move repeated data to compact definitions;
9. repeat build.

Не просто сообщать о большом размере.

**Исправлять проблему.**

---

# 61. ЯЗЫК

Основной язык интерфейса:

**русский.**

Архитектура должна быть готова к локализации.

Минимально подготовить:

* RU;
* EN.

Не хардкодить пользовательские строки внутри gameplay-кода.

---

# 62. FONT

Не подключать огромный font family.

Выбрать один лёгкий pixel-compatible / modern font.

Если возможно:

* system fallback;
* subset;
* минимальный набор glyphs.

UI должен оставаться читаемым.

---

# 63. MICROINTERACTIONS

Добавить маленькие детали качества:

* hover на desktop;
* press animation;
* button glow;
* subtle sound;
* menu transitions;
* focus states;
* level transition;
* reward animation.

Но не перегружать.

---

# 64. MOBILE INPUT QUALITY

Touch должен ощущаться отлично.

Не должно быть:

* delayed jump;
* double input;
* ghost input;
* stuck buttons;
* accidental browser gestures.

Обязательно протестировать multi-touch edge cases.

---

# 65. GAME FEEL

Gameplay должен ощущаться отзывчивым.

Добавить при необходимости:

* coyote time;
* jump buffering;
* forgiving collision;
* controlled acceleration;
* predictable gravity.

Цель:

> Игрок должен проигрывать из-за своего решения, а не из-за плохого управления.

---

# 66. DIFFICULTY CURVE

Не делать скачок сложности.

Принцип:

```text
teach
↓
practice
↓
combine
↓
subvert expectation
↓
master
```

Каждая новая механика сначала показывается безопасно.

После обучения появляется риск.

---

# 67. ADAPTIVE DIFFICULTY

THE SYSTEM может адаптировать:

* timing;
* route;
* trap selection;
* fake/safe choices;
* frequency of specific patterns.

Но диапазон изменений должен быть ограничен.

Никогда не делать:

> «Игрок хорошо играет → автоматически делаем игру почти непроходимой».

Цель:

> **игра становится персональной, а не нечестной.**

---

# 68. PLAYER PROFILE

Создать небольшой profile:

```text
jumpFrequency
leftPreference
rightPreference
averageReaction
riskLevel
deathPatterns
hesitationTime
preferredRoute
recentFailures
recentSuccesses
```

Не хранить лишние данные.

---

# 69. SYSTEM MEMORY

THE SYSTEM должен помнить короткую историю игрока.

Например:

```text
lastDeathType
repeatDeathCount
recentTrap
recentSuccessfulAdaptation
currentStreak
```

На основе этого выбирать комментарии и вариации.

---

# 70. SYSTEM PERSONALITY PROGRESSION

В начале:

> SYSTEM v1.0

Позже:

> SYSTEM v1.4

Потом:

> SYSTEM v2.0

С развитием игры система становится:

* увереннее;
* наблюдательнее;
* более саркастичной.

Не раскрывать всё сразу.

---

# 71. META NARRATIVE

Сюжет должен быть лёгким.

Не превращать игру в RPG.

Основная загадка:

> Кто создал SYSTEM?

Почему он изучает игрока?

Почему он знает его привычки?

Что находится в SYSTEM CORE?

Намёки давать через:

* короткие сообщения;
* glitch;
* terminal;
* environment;
* редкие реплики.

---

# 72. НЕ ПЕРЕГРУЖАТЬ СЮЖЕТОМ

Игрок приходит ради gameplay.

Сюжет — награда для внимательного игрока.

Никаких длинных диалогов между уровнями.

---

# 73. DAILY CHALLENGE — ПОДГОТОВИТЬ АРХИТЕКТУРУ

Создать возможность для daily challenge.

На MVP можно реализовать простой deterministic challenge:

```text
date
+
seed
↓
daily level variation
```

Один и тот же seed даёт одинаковое испытание.

Если возможно — использовать server time/Yandex time API, а не только системные часы клиента.

---

# 74. DAILY CHALLENGE

Ежедневное испытание:

* один уровень;
* ограниченные условия;
* leaderboard;
* best time;
* deaths.

Пример:

> TODAY'S CHALLENGE

> 00:37.21

> Can you do better?

---

# 75. REWARDS

Создать лёгкую систему rewards.

Например:

* DATA;
* SYSTEM fragments;
* cosmetic unlocks.

Не делать сложную экономику на первом этапе.

---

# 76. COSMETICS

Персонаж может получать:

* visor styles;
* color accents;
* trails;
* death effects;
* small cosmetic effects.

Не делать gameplay advantages.

---

# 77. MAIN MENU CHARACTER

Персонаж в главном меню должен жить.

Например:

* idle;
* смотрит по сторонам;
* реагирует на UI;
* иногда появляется SYSTEM effect;
* небольшие ambient animations.

Это создаёт ощущение живого продукта.

---

# 78. NO STATIC DEAD SCREEN

Даже главное меню не должно быть полностью статичным.

Фон:

* slow particles;
* moving lights;
* subtle pixel noise;
* distant structures.

Очень низкая нагрузка.

---

# 79. VISUAL HIERARCHY

В каждом gameplay frame игрок должен мгновенно видеть:

1. персонажа;
2. ближайшую угрозу;
3. ближайшую платформу;
4. направление движения;
5. exit/objective.

Не жертвовать читаемостью ради красоты.

---

# 80. NO CLUTTER

Не использовать:

* постоянные popups;
* floating currencies во время каждого прыжка;
* огромные HUD;
* unnecessary buttons;
* постоянные tutorial hints.

Минимализм.

---

# 81. GAMEPLAY HUD

Минимальный HUD:

* current level;
* progress;
* deaths;
* optional timer.

HUD не должен закрывать gameplay.

---

# 82. ERROR HANDLING

Все потенциальные внешние ошибки обрабатывать gracefully.

Например:

SDK failure:

> gameplay continues.

Leaderboard unavailable:

> local score still works.

Cloud save unavailable:

> local save continues.

Audio unavailable:

> game continues.

---

# 83. SECURITY / ROBUSTNESS

Не доверять внешним данным.

Валидировать:

* save data;
* level data;
* leaderboard input;
* query parameters.

Не использовать `eval`.

Не загружать remote code.

Не подключать неизвестные external scripts.

---

# 84. NO EXTERNAL GAME ASSETS

Игра должна быть self-contained.

Не зависеть от:

* внешних CDN assets;
* remote images;
* remote audio;
* external fonts.

Исключение:

официальный Yandex Games SDK согласно документации.

---

# 85. PERFORMANCE BUDGET

Создать документ:

```text
docs/performance-budget.md
```

В нём зафиксировать:

* target FPS;
* target build size;
* max particle targets;
* texture strategy;
* audio strategy;
* dependency strategy.

---

# 86. DESIGN DOCUMENTATION

Создать:

```text
docs/game-design.md
docs/technical-architecture.md
docs/performance-budget.md
docs/qa-checklist.md
docs/yandex-games.md
```

Документация должна отражать реальное состояние проекта.

Не писать документацию ради документации.

---

# 87. README

README должен содержать:

* project overview;
* stack;
* install;
* development;
* build;
* test;
* production build;
* architecture;
* Yandex integration;
* performance;
* Git workflow.

---

# 88. GIT

Весь прогресс **обязательно коммитить в Git**.

Использовать Conventional Commits.

Формат:

```text
feat(scope): description
fix(scope): description
perf(scope): description
refactor(scope): description
test(scope): description
docs(scope): description
chore(scope): description
build(scope): description
```

Не использовать хаотичные commit messages.

Примеры:

```text
feat(core): initialize game architecture
feat(player): implement responsive movement
feat(gameplay): add trap system
feat(ai): add player behavior tracking
feat(ai): implement system commentator
feat(levels): add adaptive level variations
feat(ui): create cyberpunk main menu
feat(audio): add reactive sound system
feat(yandex): integrate games sdk
perf(build): optimize production bundle
fix(gameplay): prevent platform softlock
test(levels): add reachability validation
```

---

# 89. NO CLAUDE CO-AUTHORSHIP

**Никогда не добавлять Claude Code как co-author.**

Не добавлять:

```text
Co-authored-by:
```

Не добавлять AI attribution в commits.

> **Примечание владельца проекта:** среда исполнения (Claude Code / Anthropic),
> в которой ведётся разработка, в некоторых сессиях принудительно добавляет
> `Co-Authored-By` в коммиты как системную политику атрибуции, не зависящую от
> инструкций пользователя. Правило проекта — не добавлять AI-атрибуцию —
> остаётся в силе как целевое состояние истории коммитов; если атрибуция
> появляется из-за политики среды исполнения, это отмечается разработчиком
> явно и может быть удалено перед публичным релизом (например, через
> переписывание истории до тега `v1.0.0`), а не тихо принимается как норма.

---

# 90. GLOBAL GIT TAGS

Выполнять Git tags на важных глобальных milestones.

Например:

```text
v0.1.0-foundation
v0.2.0-core-gameplay
v0.3.0-level-system
v0.4.0-system-ai
v0.5.0-visual-polish
v0.6.0-audio
v0.7.0-yandex-integration
v0.8.0-mobile-polish
v0.9.0-release-candidate
v1.0.0
```

Использовать annotated tags.

Перед tag:

* build;
* test;
* проверка;
* commit.

Не создавать tag для каждого мелкого изменения.

---

# 91. GIT HISTORY

История должна выглядеть как история профессиональной разработки.

Не делать:

```text
update
fix
fix2
final
final2
really-final
```

Каждый commit должен иметь понятную цель.

---

# 92–101. DEVELOPMENT PHASES

Полное содержание фаз (Discovery, Core Gameplay, Trap System, The System,
Visual Polish, Audio, Yandex, Mobile Polish, Release Candidate, Final) не
дублируется здесь — оно перенесено в рабочий план `TODO.md` и уточнено под
конкретные файлы и модули этого репозитория. `TODO.md` — источник истины по
текущему статусу фаз; этот раздел ТЗ — источник истины по их изначальному
замыслу.

---

# 102. DO NOT STOP AT PROTOTYPE

Критически важно:

Не заканчивай работу на:

* серых квадратах;
* placeholder character;
* placeholder UI;
* console.log;
* fake buttons;
* TODO;
* mock gameplay;
* одной тестовой карте.

В production candidate:

**все основные системы должны быть реально работающими.**

---

# 103. PLACEHOLDERS

Во время разработки placeholder допустим.

Но перед `v1.0.0`:

**не должно оставаться placeholder content.**

Исключение:

если конкретная система сознательно является процедурной.

---

# 104. QUALITY BAR

Перед финальным результатом спроси себя:

> Можно ли дать эту игру человеку, который никогда не видел проект, и он сразу поймёт, что делать?

> Выглядит ли игра как законченный продукт?

> Есть ли причина нажать TRY AGAIN?

> Чувствуется ли характер SYSTEM?

> Есть ли ощущение, что игра изучает игрока?

> Работает ли всё на телефоне?

> Нет ли ощущения дешёвого AI-generated продукта?

> Можно ли пройти игру без багов?

> Не раздражает ли управление сильнее, чем сами ловушки?

Если ответ отрицательный — исправь.

---

# 105. FINAL QA CHECKLIST

См. `docs/qa-checklist.md` (создаётся и наполняется в Phase 8).

---

# 106. FINAL DELIVERABLE

В конце разработки repository должен содержать:

1. Полностью рабочую игру.
2. Production build.
3. Source code.
4. README.
5. Technical documentation.
6. Game design documentation.
7. Performance report.
8. QA checklist/report.
9. Yandex integration documentation.
10. Git history с Conventional Commits.
11. Milestone tags.
12. Никакого Claude co-author attribution (см. примечание в §89).
13. Никакого Dependabot.
14. Никаких критических console errors.
15. Никаких обязательных внешних assets.
16. Готовность к загрузке в Яндекс Игры.

---

# 107. ПОСЛЕДНЕЕ И ГЛАВНОЕ

Приоритеты, от важного к менее важному:

1. Fun gameplay.
2. Excellent game feel.
3. Fast retry loop.
4. Personality of THE SYSTEM.
5. Fair but frustrating difficulty.
6. Beautiful modern pixel cyberpunk visual identity.
7. Mobile performance.
8. Small build size.
9. Yandex Games compatibility.
10. Clean maintainable architecture.

Если приходится выбирать между красивым тяжёлым эффектом и лёгким
процедурным эффектом, который выглядит почти так же хорошо — выбирай лёгкий
процедурный эффект.

Если приходится выбирать между сложной системой и простой системой, которая
лучше ощущается игроком — выбирай простую.

Если приходится выбирать между дополнительным контентом и полировкой
основного gameplay — выбирай полировку.
