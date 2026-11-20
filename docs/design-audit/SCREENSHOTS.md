# Снимки Money Level

Мобильный аудит сборки `e066199` от 20 ноября 2026 года. Изображения сняты Playwright в Chromium из production-сборки Vite. Размеры файлов совпадают с размером видимой области в CSS px. Фиксированные панели, прокрутка и состояния компонентов принадлежат приложению.

| №   | Экран и состояние                                   | 390 × 844                                         | 320 × 720                                         |
| --- | --------------------------------------------------- | ------------------------------------------------- | ------------------------------------------------- |
| 01  | Главная с балансом, резервами и быстрыми действиями | [PNG](screenshots/390x844/01-dashboard.png)       | [PNG](screenshots/320x720/01-dashboard.png)       |
| 02  | История с доходом и расходами                       | [PNG](screenshots/390x844/02-history.png)         | [PNG](screenshots/320x720/02-history.png)         |
| 03  | Аналитика за ноябрь по всем счетам                  | [PNG](screenshots/390x844/03-analytics.png)       | [PNG](screenshots/320x720/03-analytics.png)       |
| 04  | Цели с текущим резервом и достигнутой целью         | [PNG](screenshots/390x844/04-goals.png)           | [PNG](screenshots/320x720/04-goals.png)           |
| 05  | Профиль и входы в настройки                         | [PNG](screenshots/390x844/05-profile.png)         | [PNG](screenshots/320x720/05-profile.png)         |
| 06  | Форма дохода перед сохранением                      | [PNG](screenshots/390x844/06-income.png)          | [PNG](screenshots/320x720/06-income.png)          |
| 07  | Форма расхода перед сохранением                     | [PNG](screenshots/390x844/07-expense.png)         | [PNG](screenshots/320x720/07-expense.png)         |
| 08  | Реакция компаньона после записи дохода              | [PNG](screenshots/390x844/08-reaction.png)        | [PNG](screenshots/320x720/08-reaction.png)        |
| 09  | Юмористический разбор расходов                      | [PNG](screenshots/390x844/09-roast.png)           | [PNG](screenshots/320x720/09-roast.png)           |
| 10  | Уровень, XP и полученные достижения                 | [PNG](screenshots/390x844/10-achievements.png)    | [PNG](screenshots/320x720/10-achievements.png)    |
| 11  | Настройки компаньона, юмора, звука и анимации       | [PNG](screenshots/390x844/11-humor.png)           | [PNG](screenshots/320x720/11-humor.png)           |
| 12  | Чистый первый запуск с предложением начать учёт     | [PNG](screenshots/390x844/12-first-launch.png)    | [PNG](screenshots/320x720/12-first-launch.png)    |
| 13  | Главная сразу после онбординга, до первой операции  | [PNG](screenshots/390x844/13-empty-dashboard.png) | [PNG](screenshots/320x720/13-empty-dashboard.png) |

Playwright открывал отдельный контекст для каждого размера. Через формы введены условные зарплата и подработка, покупки в нескольких категориях, три счёта и две цели. Достигнутая цель и первая запись дали реальные достижения приложения. Профили браузера с этими записями закрыты после проверки. В репозиторий попадают только снимки и документация.
