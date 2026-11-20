# Money Level — журнал прогресса

**Состояние:** локальные проверки MVP пройдены. Проверка на реальных устройствах ожидается.

**Текущее задание:** `ML-090`.
**Подтверждённо завершено:** `89 / 100` задач.
**Рабочая ветка:** `work/money-level`.
**Коммиты задач:** `git log --oneline --grep="^ML-"` в рабочей ветке.

## Обязательные правила обновления
- Отмечать `DONE` только после выполнения критериев приёмки и доступных проверок.
- Для каждого `DONE` записывать дату, изменённые файлы, команды тестирования и результаты, commit SHA (если доступен).
- Если тесты не запускались, писать `NOT RUN` и причину, а не `PASS`.
- При блокировке фиксировать описание и не отмечать задачу завершённой.
- После каждой новой сессии сверять этот файл с фактическим Git и состоянием тестов.

## Журнал задач

| ID | Статус | Проверки | Коммит | Примечание |
|---|---|---|---|---|
| ML-001 | DONE | PASS install, frozen install, workspace list, check:boundaries; NOT RUN lint/typecheck/test/build (ещё отсутствуют) | `99445f4` | 2026-11-19. Корневые манифесты, apps/web, 10 доменных и инфраструктурных пакетов, tools/check-workspace.mjs. На Codex store перенесён в /tmp. |
| ML-002 | DONE | PASS typecheck, check:boundaries; NOT RUN lint/test/build (ещё отсутствуют) | `f211f2d` | 2026-11-19. Общий strict-конфиг, раздельные доменные и браузерные проверки, точки входа пакетов. |
| ML-003 | DONE | PASS lint, format:check, typecheck; NOT RUN test/build (ещё отсутствуют) | `009ebc7` | 2026-11-19. ESLint, Prettier, запрет обхода package exports относительными импортами, команды для CI. |
| ML-004 | DONE | PASS test (1), lint, format:check, typecheck; NOT RUN build (ещё отсутствует) | `f35c26b` | 2026-11-19. vitest.config.mts и пакетный тест без браузерных глобальных объектов. |
| ML-005 | DONE | PASS lint, format:check, typecheck, test (1), build, Chromium (корневой маршрут, без ошибок) | `a40210b` | 2026-11-19. Vite/React Router, HTML, точка входа и пустой главный маршрут приложения. |
| ML-006 | DONE | PASS lint, format:check, typecheck, test (5), build | `d98a864` | 2026-11-19. Контракты и DTO-валидаторы Zod, тесты целых сумм, календаря, UUID и перечислений. |
| ML-007 | DONE | PASS lint, format:check, typecheck, test (7), build | `254d4ad` | 2026-11-19. Контракты Clock и RandomSource, Mulberry32 и проверки воспроизводимости. |
| ML-008 | DONE | PASS frozen install, lint, format:check, typecheck, test (7), build; ожидаемый FAIL у контрольного теста; GitHub Actions NOT RUN локально | `27022a1` | 2026-11-19. Workflow push/PR, проверка команд локально и проверка возврата ненулевого кода от Vitest. |
| ML-009 | DONE | PASS lint, format:check, typecheck, test (7), build | `fbb6fb7` | 2026-11-19. docs/DECISIONS.md, DATA_MODEL.md, ACCEPTANCE.md и CHANGELOG.md. |
| ML-010 | DONE | PASS lint, format:check, typecheck, test (24), build | `1a2116d` | 2026-11-19. finance-core: строгий парсер, 17 проверок ввода, ограничение 2⁶³−1 копеек. Обновлён CHANGELOG. |
| ML-011 | DONE | PASS lint, format:check, typecheck, test (26), build | `39accc3` | 2026-11-19. finance-core: операции сложения, вычитания и сравнения, проверки точности и невалидного ввода. |
| ML-012 | DONE | PASS lint, format:check, typecheck, test (28), build | `3153543` | 2026-11-19. finance-core: формат валют, отрицательные дроби, крупные суммы и скрытие. |
| ML-013 | DONE | PASS lint, format:check, typecheck, test (29), build | `72c256f` | 2026-11-19. finance-core: модель счёта, валидация входных данных, тесты. |
| ML-014 | DONE | PASS lint, format:check, typecheck, test (32), build | `f739165` | 2026-11-19. finance-core: отдельная запись opening с положительным, нулевым и отрицательным начальным остатком. |
| ML-015 | DONE | PASS lint, format:check, typecheck, test (35), build | `dde4350` | 2026-11-19. finance-core: модель категории, проверка типа и регрессионные тесты архивации и имён. |
| ML-016 | DONE | PASS lint, format:check, typecheck, test (38), build | `c741cd4` | 2026-11-19. finance-core: различимые типы opening/income/expense/transfer/adjustment, схемы и регрессии. |
| ML-017 | DONE | PASS lint, format:check, typecheck, test (41), build | `f0f7ca0` | 2026-11-19. finance-core: проверка существования счетов и категории, валюты и типа категории. |
| ML-018 | DONE | PASS lint, format:check, typecheck, test (43), build | `6bbbe49` | 2026-11-19. finance-core: применение проводок по счёту, проверка знаков и исключения удалённых операций. |
| ML-019 | DONE | PASS lint, format:check, typecheck, test (45), build | `9dec78d` | 2026-11-19. finance-core: перевод одной записью, две стороны без расхода, совпадение UUID независимо от регистра. |
| ML-020 | DONE | PASS lint, format:check, typecheck, test (48), build | `263f5fd` | 2026-11-19. finance-core: селекторы баланса и сверка финансовых итогов TC-FIN-001/002; резервы по ML-054. |
| ML-021 | DONE | PASS lint, format:check, typecheck, test (48), build | `9b85d4b` | 2026-11-19. application: контракты чтения и записи журнала без DOM, React или IndexedDB. |
| ML-022 | DONE | PASS lint, format:check, typecheck, test (50), build | `24f7a68` | 2026-11-19. storage-indexeddb: Dexie, локальная схема v1, проверка повторного открытия и атомарного отката. |
| ML-023 | DONE | PASS lint, format:check, typecheck, test (52), build | `68c40ba` | 2026-11-19. application и storage-indexeddb: запись операции с outbox, проверка отката при сбое второго сохранения. |
| ML-024 | DONE | PASS lint, format:check, typecheck, test (54), build | `c1f612a` | 2026-11-19. application и IndexedDB: команда дохода; два параллельных запроса создают одну запись и одно событие. Устранён преждевременный commit привязкой таблиц к транзакции. |
| ML-025 | DONE | PASS lint, format:check, typecheck, test (55), build | `0e74bb3` | 2026-11-19. application: команда расхода по общему пути сохранения, тест повторного ключа и конфликта видов операций. |
| ML-026 | DONE | PASS lint, format:check, typecheck, test (56), build | `a7f81c2` | 2026-11-19. application: ввод перевода, атомарная проверка назначения и валюты, неизменный общий баланс. |
| ML-027 | DONE | PASS lint, format:check, typecheck, test (58), build | `96152aa` | 2026-11-19. application: PATCH с проверкой вида и ссылок, мягкое удаление, пересчёт и защита от дублей. |
| ML-028 | DONE | PASS lint, format:check, typecheck, test (59), build | `d8e8b55` | 2026-11-19. application: 10-секундная отмена, проверка повторов, срока и устаревшей отметки удаления. |
| ML-029 | DONE | PASS lint, format:check, typecheck, test (61), build | `7540652` | 2026-11-19. storage-indexeddb и DATA_MODEL: схема v4, переход с v1, повторное открытие и проверяемое восстановление при сбое. |
| ML-030 | DONE | PASS lint, format:check, typecheck, test (107), build | `c321ae6` | 2026-11-19. Полная матрица TC-FIN-001–007 и 010 в docs/ACCEPTANCE.md, сверка отчёта по фактическим операциям, резервов и XP. |
| ML-031 | DONE | PASS lint, format:check, typecheck, test (64), build | `b74e856` | 2026-11-19. web и ui-kit: темы, типографика и кнопки; Chromium 320/390/428 px, обе цветовые схемы, контраст, фокус, hover и busy. |
| ML-032 | DONE | PASS lint, format:check, typecheck, test (64), build | `01819d1` | 2026-11-19. web: общий макет, пять маршрутов, активный пункт и нижняя панель; Chromium подтвердил переходы и зазор для ввода на 320 px. |
| ML-033 | DONE | PASS lint, format:check, typecheck, test (66), build | `69141aa` | 2026-11-19. web, contracts, application и IndexedDB v5: первый счёт, защита входа на главную, конкурентные запросы и перезапуск в Chromium. |
| ML-034 | DONE | PASS lint, format:check, typecheck, test (68), build | `b30cc8b` | 2026-11-19. web/finance-core/application: возобновляемая настройка, разбор валютного остатка, атомарное завершение, повторное открытие браузера и одна запись opening. |
| ML-046 | DONE | PASS lint, format:check, typecheck, test (70), build | `cee6a76` | 2026-11-19. analytics: календарный селектор доходов и расходов, границы периода и TC-FIN-006. Выполнено до ML-035, поскольку главная использует эти итоги. |
| ML-053 | DONE | PASS lint, format:check, typecheck, test (72), build | `77e6223` | 2026-11-19. goals: цель и знаковые дельты отдельного журнала, валидация суммы и даты. Требуется для ML-035. |
| ML-054 | DONE | PASS lint, format:check, typecheck, test (74), build | `17f3334` | 2026-11-19. goals, application и IndexedDB v6: атомарные резервы, ограничения, TC-FIN-001/004, правка арифметики ТЗ. Зависимость ML-035. |
| ML-055 | DONE | PASS lint, format:check, typecheck, test (75), build | `ec77abf` | 2026-11-19. goals и application: единый селектор остатка, тест оверрезерва и проверка архивации. Зависимость ML-035. |
| ML-035 | DONE | PASS lint, format:check, typecheck, test (76), build | `6f53202` | 2026-11-19. web и application: общий баланс, доходы, расходы и резервы из снимка базы. Chromium 320 px подтвердил сохранённый баланс и нулевой доход после opening. |
| ML-036 | DONE | PASS lint, format:check, typecheck, test (76), build | `e50b748` | 2026-11-19. web/contracts/application: скрытие виджетов без сырых сумм в DOM, переключатель с фокусом, сохранение и синхронизация между вкладками Chromium. |
| ML-037 | DONE | PASS lint, format:check, typecheck, test (76), build | `96dbf79` | 2026-11-19. web/application: доход за три основных действия, проверка суммы, безопасный повтор, стартовые категории; Chromium и обновление во второй вкладке. |
| ML-038 | DONE | PASS lint, format:check, typecheck, test (76), build | `8eae2b8` | 2026-11-19. web: общий ввод дохода и расхода, категория «Другое» и проверка трёх действий Chromium 320 px. |
| ML-039 | DONE | PASS lint, format:check, typecheck, test (76), build | `85828cc` | 2026-11-19. web/application: общий ввод и выбор разных счетов; Chromium проверил смену счёта, проводку и неизменный общий баланс. |
| ML-040 | DONE | PASS lint, format:check, typecheck, test (77), build | `b4fccbc` | 2026-11-19. web и application: группы, дневные итоги, стабильная сортировка и карточка. Chromium подтвердил ввод, историю, деталь и скрытие суммы. |
| ML-041 | DONE | PASS lint, format:check, typecheck, test (78), build | `0f6fb67` | 2026-11-19. web/application: комбинированная фильтрация и пустые состояния, Chromium проверил возврат в отфильтрованную историю без заметок в URL. |
| ML-042 | DONE | PASS lint, format:check, typecheck, test (79), build | `bf41b79` | 2026-11-19. web/finance-core: редактирование, проверка приватности, подтверждение и отмена удаления; пересчёт проверен в Chromium. |
| ML-043 | DONE | PASS lint, format:check, typecheck, test (79), build | `f811a52` | 2026-11-19. web/application: создание, редактирование, значки, цвет и архивация категорий. Chromium проверил связку с историей и исключение из ввода. |
| ML-044 | DONE | PASS lint, format:check, typecheck, test (79), build | `d08cafa` | 2026-11-19. web/application: счета, начальные остатки, переименование и архив. Chromium проверил добавление, перевод и сохранённую сумму в архиве. |
| ML-086 | DONE | PASS lint, format:check, typecheck, test (79), build | `7421f75` | 2026-11-19. web: манифест, standalone, цвет темы и PNG. Chromium обычного профиля проверил установку и размеры иконок. Зависимость офлайн-сценария ML-045. |
| ML-087 | DONE | PASS lint, format:check, typecheck, test (79), build | `9b66d51` | 2026-11-19. web: Workbox, только статический кэш, статус офлайна и ленивые маршруты. Chromium подтвердил открытие, запись и прямой маршрут без сети. Зависимость ML-045. |
| ML-045 | DONE | PASS lint, format:check, typecheck, test (79), build | `272050d` | 2026-11-19. Chromium Pixel 7: онбординг, доход, расход, правка, загрузка без сети и запись в офлайне. Добавлены E2E-команда и шаги GitHub Actions. |
| ML-047 | DONE | PASS lint, format:check, typecheck, test (80), build | `557f4b8` | 2026-11-19. analytics: суммы по категориям, детерминированная сортировка и сверка с расходами периода. |
| ML-048 | DONE | PASS lint, format:check, typecheck, test (82), build | `c5f14d3` | 2026-11-19. analytics: дневные и месячные интервалы, неполные месяцы, високосный день и переход года. |
| ML-049 | DONE | PASS lint, format:check, typecheck, test (82), build | `dfea236` | 2026-11-19. web/application: отчёт и выбор месяца, итоги, топ категорий, график и таблица, пустой месяц. Chromium 320 px подтвердил цифры. |
| ML-050 | DONE | PASS lint, format:check, typecheck, test (83), build | `c6cde24` | 2026-11-19. budgets: строгое описание месячного бюджета, отдельный лимит категории или всех расходов, проверка суммы. |
| ML-051 | DONE | PASS lint, format:check, typecheck, test (85), build | `5ba534e` | 2026-11-19. budgets: точные расходы/остаток, пороги 80/100/превышение, учёт предыдущих уведомлений и месяца. |
| ML-052 | DONE | PASS lint, format:check, typecheck, test (85), build | `10e7251` | 2026-11-19. web, application, IndexedDB v7: лимиты, карточки, настройки уведомлений и дедупликация. Chromium подтвердил предупреждения и сохранение расхода сверх лимита. |
| ML-056 | DONE | PASS lint, format:check, typecheck, test (85), build | `988e2f5` | 2026-11-19. web/application: создание цели, прогресс, резерв и снятие; Chromium 320 px проверил TC-FIN-001/004 без изменения баланса. |
| ML-079 | DONE | PASS lint, format:check, typecheck, test (86), build | `6c468ec` | 2026-11-19. application: строгая JSON-схема, дата, версия и SHA-256. Зависимость сценария импорта ML-057. |
| ML-080 | DONE | PASS lint, format:check, typecheck, test (87), build | `841d6cd` | 2026-11-19. application/storage: JSON-снимок всех записей, реальный SHA-256, точный баланс после сериализации. |
| ML-081 | DONE | PASS lint, format:check, typecheck, test (88), build | `1cea322` | 2026-11-19. application: CSV UTF-8 BOM, стабильные поля, ISO-даты, точный формат валюты и экранирование заметок. |
| ML-082 | DONE | PASS lint, format:check, typecheck, test (89), build | `3bfaa91` | 2026-11-19. application/storage: read-only проверка схемы, контрольной суммы, связности и дублей; повреждённые файлы оставляют снимок исходной базы равным. |
| ML-083 | DONE | PASS lint, format:check, typecheck, test (90), build | `247dabe` | 2026-11-19. application и IndexedDB v8: подтверждение, снимок и транзакционная замена; сбой после очистки проверен на исходной базе. |
| ML-084 | DONE | PASS lint, format:check, typecheck, test (91), build | `9091e20` | 2026-11-19. application/storage: дедупликация UUID, проверка объединённого состояния и TC-FIN-007 на повторном открытии базы; местные записи сохраняют приоритет. |
| ML-057 | DONE | PASS lint, format:check, typecheck, test (92), build | `4551164` | 2026-11-19. интеграционные тесты IndexedDB: проверка редактирования, мягкого удаления, merge и replace через реальные команды и JSON. |
| ML-058 | DONE | PASS lint, format:check, typecheck, test (93), build | `0f574bb` | 2026-11-19. contracts/application/storage: минимальный типизированный payload, проверка отката и чтения только после commit. |
| ML-059 | DONE | PASS lint, format:check, typecheck, test (94), build | `3999753` | 2026-11-19. contracts/application/storage v9: атомарные квитанции, повтор после сбоя, параллельная обработка и backup. |
| ML-060 | DONE | PASS lint, format:check, typecheck, test (95), build | `118a088` | 2026-11-19. meme-engine: JSON Schema, метаданные, ограничения текста и ключей, отбраковка повреждённых паков. |
| ML-061 | DONE | PASS lint, format:check, typecheck, test (96), build | `405b081` | 2026-11-19. meme-engine: фильтрация события и настроек, веса и фиксируемый seed; проверка порогов и повторяемости. |
| ML-062 | DONE | PASS lint, format:check, typecheck, test (97), build | `c60f873` | 2026-11-19. meme-engine: задержки между показами и повторами правила, редкая частота, фиктивные часы. |
| ML-063 | DONE | PASS lint, format:check, typecheck, test (98), build | `257ca74` | 2026-11-19. meme-engine: граница 1%, одна сцена за сессию, сохранение обычного выбора и cooldown. |
| ML-064 | DONE | PASS lint, format:check, typecheck, test (99), build | `a333951` | 2026-11-19. meme-engine: 28 собственных реплик, типы событий, режимы, теги, редкие сцены и нейтральные fallback. |
| ML-065 | DONE | PASS lint, format:check, typecheck, test (99), build | `c77f6c8` | 2026-11-19. web: отдельный UI компаньона, шесть эмоций, fallback текста и формы. Chromium 320 px проверил отсутствующий ассет. |
| ML-066 | DONE | PASS lint, format:check, typecheck, test (99), build | `c5ed655` | 2026-11-19. meme-engine/UI и IndexedDB v10: реакции после commit, история показа, редкий вариант и закрытие; Chromium проверил повторный ввод. |
| ML-067 | DONE | PASS lint, format:check, typecheck, test (99), build | `042d8d2` | 2026-11-19. web/application: контроль компаньона, режима, частоты, мата и тихого режима. Chromium проверил сохранение и штатный ввод при выключении. |
| ML-068 | DONE | PASS lint, format:check, typecheck, test (99), build | `9d2c25b` | 2026-11-19. web/application: системная и ручная настройка движения, короткий локальный звук по согласию. Chromium проверил длительность 0s и воспроизведение. |
| ML-069 | DONE | PASS lint, format:check, typecheck, test (101), build | `b313991` | 2026-11-19. meme-engine: 3–4 карточки при наличии данных, исходные суммы и объяснения, пустой период и нулевая база сравнения. |
| ML-070 | DONE | PASS lint, format:check, typecheck, test (101), build | `6a2dd15` | 2026-11-19. web/application: разбор, выбор периода, повтор, объяснения и приватность. Chromium проверил пустой и заполненный отчёты. |
| ML-071 | DONE | PASS lint, format:check, typecheck, test (103), build | `4102e18` | 2026-11-19. интеграционные тесты IndexedDB: TC-FIN-008, повреждённый пак, дубли, параллельная обработка и сохранность журнала. |
| ML-072 | DONE | PASS lint, format:check, typecheck, test (104), build | `5745780` | 2026-11-19. gamification: достижения и XP, строгая валидация grant, уникальность вида и источника при подсчёте. |
| ML-073 | DONE | PASS lint, format:check, typecheck, test (105), build | `8501ba2` | 2026-11-19. gamification: десять уровней, границы диапазонов, последний уровень и проверка невалидного XP. |
| ML-074 | DONE | PASS lint, format:check, typecheck, test (107), build | `b0f011f` | 2026-11-19. application/storage v11: достижения за первую запись, неделю, цель и ручной backup; TC-FIN-005/007, повтор событий и отсутствие XP за сумму расхода. |
| ML-075 | DONE | PASS lint, format:check, typecheck, test (107), build | `0323d80` | 2026-11-19. web: пустое состояние, уровень, XP и реальные достижения. Chromium проверил первое начисление и перезапуск. |
| ML-076 | DONE | PASS lint, format:check, typecheck, test (107), build | `33d2aa2` | 2026-11-19. web: безопасный предпросмотр и PNG 1080×1080; Chromium подтвердил загрузку файла и изменение изображения только по согласию. |
| ML-077 | DONE | PASS lint, format:check, typecheck, test (107), build | `c8d4b86` | 2026-11-19. web: системный share с активным жестом, fallback save и отмена. Chromium проверил все три ветви. |
| ML-078 | DONE | PASS lint, format:check, typecheck, test (107), build | `61a427c` | 2026-11-19. Playwright 2/2. Включённое скрытие заменяет явный opt-in; проверены HTML/ARIA, PNG, системный share и повторное открытие. |
| ML-085 | DONE | PASS lint, format:check, typecheck, test (107), build | `213724e` | 2026-11-19. web/application: JSON и CSV, проверка, merge, replace со скачиваемым снимком, два подтверждения очистки, восстановление из онбординга. Chromium проверил операции на синтетическом журнале. |
| ML-088 | DONE | PASS lint, format:check, typecheck, test (107), build | `e03cafb` | 2026-11-19. Playwright 3/3. Две настоящие сборки на одном origin, активация нового worker, офлайн-перезапуск, прежняя версия БД, остаток и операция сохранены. |
| ML-089 | DONE | PASS lint, format:check, typecheck, test (107), build | `9263e8d` | 2026-11-20. Playwright 4/4. Настройка, доход, расход, отчёт, повреждённая копия, merge без дублей, очистка и восстановление офлайн. Разбор учитывает отключение шуток. |
| ML-090 | BLOCKED | PASS lint, format:check, typecheck, test (107), build, Chromium 6/6, WebKit 6/6, axe-core (11 экранов). NOT RUN физические iPhone и Android | ML-090 | 2026-11-20. История по 50 операций, приватность при редактировании бюджета, доступное имя ссылки и проверка офлайна при обрыве соединения. Измерения и чек-лист устройств в docs/ACCEPTANCE.md. |

Задачи без записи имеют статус `TODO`; список и зависимости — в `docs/CLAUDE_ATOMIC_BACKLOG_v1_1.md`.

## Исправления по аудиту MVP

| ID | Этап | Статус | Доказательства |
| --- | --- | --- | --- |
| AUD-001 | A · единые настройки юмора, звука и движения | DONE | lint, формат, типы, 108 Vitest, сборка, 3 E2E в Chromium |
| AUD-002 | B · типизированные события и производители | DONE | lint, формат, типы, 111 Vitest, сборка, 4 E2E в Chromium |
| AUD-003 | C · аналитика по счетам | DONE | lint, формат, типы, 112 Vitest, сборка, 3 E2E в Chromium |
| AUD-004 | D1 · отрицательные остатки и фильтр счетов | DONE | lint, формат, типы, 12 целевых Vitest, сборка, E2E в Chromium |
| AUD-005 | D2 · расчёт перед объединением JSON | DONE | lint, формат, типы, 13 целевых Vitest, сборка, E2E в Chromium |
| AUD-006 | D3 · аварийное восстановление без удаления базы | DONE | lint, формат, типы, 115 Vitest, сборка, 4 E2E в Chromium |
| AUD-007 | E · уведомления целей и копий, значки, метрики разбора | DONE | lint, формат, типы, 115 Vitest, сборка, 4 E2E в Chromium |

## Блокеры
- ML-090 требует проверки установки PWA, офлайн-запуска и времени сохранения на физических устройствах iOS и Android по F6-04. В этой среде доступны браузерные эмуляции. ML-091 зависит от этой проверки.

## Решения и вопросы
- AUD-006. Тест более новой схемы обнаружил повторное открытие Dexie без номера версии. Перед открытием добавлена нативная проверка версии, исходные записи и версия БД сверяются в E2E.
- AUD-004. `dashboard.test.ts` сравнивал точный состав ответа до появления обязательного предупреждения §05.3. Новый флаг добавлен в ожидание, все эталонные суммы сохраняются.
- ML-046, ML-053–055 выполнены перед ML-035, главная использует их селекторы.
- Работа идёт в отдельной ветке по атомарному бэклогу.
- Опечатка в ТЗ, TC-FIN-004: при балансе 58 700 ₽ и резерве 3 000 ₽ доступно 55 700 ₽. Эталон исправлен и проверен в ML-054.

## Шаблон записи о выполнении

```text
### YYYY-MM-DD — ML-XXX — DONE / BLOCKED
Изменённые файлы:
Критерии приёмки:
Проверки: команда -> PASS / FAIL / NOT RUN
Git: ветка / SHA
Замечания и риски:
Следующая задача:
```
