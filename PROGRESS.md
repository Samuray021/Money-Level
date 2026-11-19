# Money Level — журнал прогресса

**Состояние:** разработка начата.

**Текущее задание:** `ML-018`.
**Подтверждённо завершено:** `17 / 100` задач.
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
| ML-017 | DONE | PASS lint, format:check, typecheck, test (41), build | ML-017 | 2026-11-19. finance-core: проверка существования счетов и категории, валюты и типа категории. |

Задачи без записи имеют статус `TODO`; список и зависимости — в `docs/CLAUDE_ATOMIC_BACKLOG_v1_1.md`.

## Блокеры
Активных блокеров нет.

## Решения и вопросы
- Работа идёт в отдельной ветке по атомарному бэклогу.
- Опечатка в ТЗ, TC-FIN-004: при балансе 58 700 ₽ и резерве 3 000 ₽ доступно 55 700 ₽. При реализации сценария использовать формулу из раздела 05.2 и зафиксировать правку эталона.

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
