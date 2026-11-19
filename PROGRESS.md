# Money Level — журнал прогресса

**Состояние:** разработка начата.

**Текущее задание:** `ML-050`.
**Подтверждённо завершено:** `53 / 100` задач.
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
| ML-030 | DEFERRED | PASS lint, format:check, typecheck, test (64), build; NOT RUN полный эталонный набор | `b2b4e22` | 2026-11-19. Сквозные сценарии в financial-scenarios.test.ts и матрица приёмки в docs/ACCEPTANCE.md. |
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
| ML-049 | DONE | PASS lint, format:check, typecheck, test (82), build | ML-049 | 2026-11-19. web/application: отчёт и выбор месяца, итоги, топ категорий, график и таблица, пустой месяц. Chromium 320 px подтвердил цифры. |

Задачи без записи имеют статус `TODO`; список и зависимости — в `docs/CLAUDE_ATOMIC_BACKLOG_v1_1.md`.

## Блокеры
- ML-030 требует TC-FIN-001–007 и 010. Для полного прогона ещё нужны обработчики достижений (ML-058–059 и ML-072–074) и импорт merge (ML-084). Эти задачи стоят позднее в атомарном порядке. После команды пользователя продолжить полная приёмка отложена до готовности зависимостей.

## Решения и вопросы
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
