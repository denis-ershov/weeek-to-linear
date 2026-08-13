# Changelog

Все значимые изменения проекта **WEEEK → Linear Migration Tool** документируются в этом файле согласно стандарту проекта.

Формат основан на [Keep a Changelog](https://keepachangelog.com/ru/1.0.0/).

## [0.3.3] - 2026-08-13

### Изменено
- **Запрет переноса документов базы знаний (Documents Migration)**:
  - Опция переноса документов заблокирована в Web UI (тумблер `#opt-documents` переведён в статус `disabled` с поясняющей подписью) и выключена в ядре `MigrationEngine`.
  - В документации (`README.md`, `README.en.md`, `CHANGELOG.md`) зафиксирована причина недоступности: отсутствие общедоступных REST-эндпоинтов для получения документов базы знаний в публичном API WEEEK.

- **Запрет переноса комментариев к задачам (Task Comments Migration)**:
  - Опция переноса комментариев заблокирована в Web UI (переключатели `commentStrategy` переведены в статус `disabled` с поясняющей подписью) и отключена в ядре `MigrationEngine`.

### Исправлено
- **Интеграционные тесты (`tests/integration/engine.test.ts`)**:
  - Обновлены ожидания в тестовом наборе с учётом блокировки эндпоинта документов WEEEK API. Все 50 тестов успешно проходят.

---

## [0.3.2] - 2026-08-13

### Добавлено
- **Перенос кастомных полей задач (Task Custom Fields Migration)**:
  - Поддержка нормализации кастомных полей WEEEK (`customFields`/`fields`/`custom_fields`) через Zod-схему в единый формат `{ id, name, type, value }`.
  - Форматирование кастомных полей в виде структурированного Markdown-блока `### 📋 Кастомные поля (WEEEK)` в конце описания задачи Linear при `customFieldsStrategy: append_to_description`.
  - Возможность явного сопоставления названий полей (`customFieldsMapping`), пропуска полей (`'skip'`) и фильтрации через список исключений (`ignoredCustomFields` / CLI `--ignore-custom-fields`).
  - Добавлены интерактивные элементы управления кастомными полями на Шаге 3 Web UI и CLI флаги `--custom-fields-strategy`, `--custom-fields-mapping`, `--ignore-custom-fields`.

### Исправлено
- **Загрузка проектных документов WEEEK (Project Documents)**:
  - Добавлена поддержка эндпоинтов проектных документов WEEEK по структуре `/ws/projects/${projectId}/documents`, `/projects/${projectId}/documents`, `/ws/tm/projects/${projectId}/documents`, `/ws/kb/projects/${projectId}/documents` с поддержкой параметров `project_id` (snake_case) и `projectId`.
  - Расширены ключи парсинга в ответе WEEEK REST API: `categories`, `tree`, `result`, `kb`, `pages`, `nodes`, `projectDocuments`.
  - Обновлён детальный эндпоинт `getSingleDocument()` для вызова `/ws/project-documents/:id` и `/ws/documents/:id`.
- **Логика работы `syncStrategy: update_comments_only`**:
  - Исправлен автоматический форсированный вызов пере переноса комментариев (`commentStrategy: text_only`), если пользователь выбрал стратегию `update_comments_only` с неустановленным режимом комментариев (`none`).
  - Добавлена поддержка WEEEK API эндпоинтов комментариев `/ws/tm/tasks/${taskId}/comments` и `/tm/comments?task_id=${taskId}`.

---

## [0.3.1] - 2026-08-13

### Добавлено
- **Миграция комментариев к задачам (Task Comments Migration)**:
  - Поддержка трех стратегий переноса комментариев (`none` | `text_only` | `mapped_authors`).
  - Добавлены типы `WeeekComment`, `CreateCommentInput`, `LinearComment` и методы `getTaskComments()` в WEEEK клиенте и `createComment()` в Linear клиенте.
  - Форматирование текста комментария в режиме `text_only` с указанием имени автора WEEEK, либо маппинг на реальных пользователей Linear (`createAsUser`) в режиме `mapped_authors`.
  - Возможность выбора стратегии комментариев через CLI флаг `--comment-strategy <none|text_only|mapped_authors>` и переключатель в Web UI (Step 3).
- **Стратегия повторного запуска комментариев (`update_comments_only`)**:
  - Добавлена новая стратегия `syncStrategy: update_comments_only` ("Обновлять только комментарии") — при повторном запуске поля ранее созданных задач не меняются, но дозагружаются их комментарии.
  - Обновлены и уточнены подписи для всех 4-х стратегий повторного запуска в CLI и Web UI с четким указанием влияния на комментарии (`skip`: без обновления задач и комментариев, `update_all`: полное обновление полей и комментариев, `update_status_only`: обновление статуса/дедлайна без комментариев, `update_comments_only`: перенос только комментариев).

### Исправлено
- **Исправление переноса документов базы знаний (Knowledge Base)**:
  - Реализован метод `getSingleDocument(docId)` в клиенте WEEEK для автоматической подгрузки полного текста статей из эндпоинтов `/ws/kb/articles/:id` и `/kb/articles/:id`, когда списочный эндпоинт WEEEK возвращает пустое содержимое (`content: ""`).
  - Добавлена логика `fallbackProjectId` для Linear Project Documents — если у документа WEEEK нет привязки к конкретному проекту или его проект не мигрировался, документ привязывается к первому перенесенному проекту Linear, удовлетворяя обязательное требование GraphQL API Linear `documentCreate`.
- **Статистика отчёта**: добавлена строка со статистикой комментариев (`total`, `created`, `skipped`, `failed`) в Markdown и JSON итоговых отчётах миграции.

---

## [0.3.0] - 2026-08-12

### Добавлено
- **Мультиязычность (i18n) — Русский и Английский**:
  - Создана i18n-инфраструктура: `src/i18n/types.ts` (контракт), `src/i18n/ru.ts` и `src/i18n/en.ts` (словари), `src/i18n/index.ts` (ядро: `detectLocale`, `setLocale`, `t`).
  - **CLI**: все пользовательские строки заменены на `t()`. Добавлен флаг `--lang ru|en` и переменная окружения `WEEEK_LANG`. Язык определяется до `program.parse()` — локализован даже вывод `--help`.
  - **Web UI**: создан `src/server/public/i18n.js` со словарями `ru`/`en`, функциями `applyLocale()` и `initLocale()`. Все текстовые элементы HTML размечены атрибутами `data-i18n`, а динамически формируемые JS-сообщения (уведомления авторизации, статусы проверок, подписи карточек и кнопок в `app.js`) переведены на `window.i18n.t()`. Кнопка переключения `RU | EN` добавлена в шапку.
  - **Логи, отчёты и ошибки API**: создана функция `tf()` для форматированных сообщений с подстановкой параметров. Локализованы все `logger.*` вызовы, названия стадий миграции `onStage`, генерация Markdown-отчётов `ReportGenerator`, сообщения проверок `PreflightValidator`, преобразовний `mapper.ts` и ошибки REST API сервера `routes.ts`.
  - Добавлены юнит-тесты для i18n модуля (`tests/unit/i18n.test.ts`).
  - Затронутые файлы: `src/cli/index.ts`, `src/cli/commands/auth.ts`, `migrate.ts`, `weeek.ts`, `linear.ts`, `ui.ts`, `src/server/public/index.html`, `app.js`, `src/utils/retry.ts`, `src/server/server.ts`, `src/server/routes.ts`, `src/core/state.ts`, `src/core/engine.ts`, `src/core/validator.ts`, `src/core/mapper.ts`, `src/core/reporter.ts`, `src/clients/weeek/client.ts`, `src/clients/linear/client.ts`.
- **English README** (`README.en.md`): полный перевод документации на английский язык со всеми актуальными возможностями, включая i18n раздел.
- Добавлена ссылка `🇬🇧 English version` в начало русского `README.md`.

### Исправлено
- **Web UI переключатель языка (Segmented Toggle Pill)**: старая кнопка с текстом противоположного языка заменена на двухпозиционный переключатель `RU | EN` с чётким подсвечиванием активного языка.
- **Локализация подвала (Footer)**: тексты подвала переведены на русский язык при включённой русской локали (`Открытый исходный код по лицензии GPL v3`).
- **Модальное окно About ("О сервисе")**: кнопка `(i) О сервисе` в шапке подключена к модальному диалогу с информацией о версии v0.3.0, лицензии GNU GPL v3 и стэке технологий.
- **TypeScript ошибки в тестах**: создан `tsconfig.test.json` с подключением `vitest/globals` в типы — устраняет ошибки `Cannot find name 'describe/it/expect'` в VS Code при использовании `globals: true` в `vitest.config.ts`.

### Изменено
- Обновлён `app.js`: добавлен вызов `window.i18n.initLocale()` при старте.
- `index.html` полностью переработан: `lang="ru"` на `<html>`, атрибуты `data-i18n` / `data-i18n-placeholder` / `data-i18n-aria` на всех переводимых элементах.

### Файлы
- `src/i18n/types.ts` [NEW]
- `src/i18n/ru.ts` [NEW]
- `src/i18n/en.ts` [NEW]
- `src/i18n/index.ts` [NEW]
- `src/server/public/i18n.js` [NEW]
- `README.en.md` [NEW]
- `tsconfig.test.json` [NEW]
- `src/cli/index.ts` [MODIFIED]
- `src/cli/commands/auth.ts` [MODIFIED]
- `src/cli/commands/migrate.ts` [MODIFIED]
- `src/cli/commands/weeek.ts` [MODIFIED]
- `src/cli/commands/linear.ts` [MODIFIED]
- `src/cli/commands/ui.ts` [MODIFIED]
- `src/server/public/index.html` [MODIFIED]
- `src/server/public/app.js` [MODIFIED]
- `README.md` [MODIFIED]

---

## [0.2.0] - 2026-08-12

### Добавлено
- **Поддержка Канбан-досок и колонок WEEEK**:
  - Реализован надежный каскадный сбор реальных колонок WEEEK через API: запрос досок (`/tm/boards?projectId=...`) с последующим запросом колонок по каждой доске (`/tm/board-columns?boardId=...`), а также поддержка общих эндпоинтов статусов.
  - Полностью устранен хардкод колонок в UI — отображаются исключительно реальные колонки из рабочего пространства WEEEK.
  - Разработан умный эвристический алгоритм сопоставления колонок со статусами Linear Workflow States (`💡 Важное`, `⏱ Запланировано`, `👾 В работе`, `❓ Тестирование`, `⁉️ Доработать`, `‼️ Закрыто`, `📁 Архив`).
  - **Опциональное создание отсутствующих статусов в Linear**: реализован метод `createWorkflowState` в `LinearClient` с автоматическим вычислением базового типа (`backlog`, `unstarted`, `started`, `completed`, `canceled`).
  - **Переименование сопоставленных статусов**: реализован метод `updateWorkflowState` и флаг `--rename-matched-states` (`opt-rename-matched-states`).
  - **Полная замена структуры колонок (1-в-1)**: реализованы методы `archiveWorkflowState`, автоматическое пересоздание всех колонок WEEEK и флаг `--recreate-columns` (`opt-recreate-columns`).
  - В Web UI добавлены соответствующие переключатели и опция `➕ Создать в Linear: "[Имя колонки]"` в селекторе маппинга.
  - В CLI реализован полный паритет с Web UI: флаги `--create-missing-states`, `--rename-matched-states`, `--recreate-columns`, `--global-watcher`, `--column-mapping`, `--user-mapping` и интерактивный визард.
- **Перенос документов базы знаний (Knowledge Base)**:
  - Реализован полный сбор документов как на уровне всего рабочего пространства WEEEK (`/ws/docs`, `/kb/articles`, `/docs`, `/kb/trees`, `/kb/folders`, `/ws/notes`), так и по отдельным проектам.
  - Разработан конвертер `normalizeDocumentContentToMarkdown`, поддерживающий преобразование Editor.js блоков, TipTap/ProseMirror JSON, Quill Delta, HTML и сырого Markdown в валидный Markdown для Linear.
  - В `LinearClient.createDocument` добавлена передача `teamId`, что позволяет безопасно создавать документы как для конкретных проектов, так и на уровне всей команды Linear.
  - В Web UI и CLI обеспечена полная поддержка переноса документов (`--no-docs` / `#opt-documents`).
- **Персональный маппинг пользователей и исполнителей (Assignee Fallback)**:
  - Возможность индивидуального сопоставления каждого пользователя WEEEK с любым сотрудником Linear, режимом `unassigned` (без исполнителя) или `skip` (пропуск задач).
- **Гибкое назначение наблюдателей (Subscribers / Watchers)**:
  - Поддержка 4 стратегий подписки:
    - `none`: без назначения дополнительных наблюдателей;
    - `secondary_assignees`: вторичные исполнители WEEEK назначаются наблюдателями в Linear;
    - `global_watcher`: назначение конкретного сотрудника (Team Lead / PM) ко всем задачам;
    - `both`: вторичные исполнители + глобальный наблюдатель.
- **Стратегии повторной синхронизации (Re-migration Sync Strategy)**:
  - Поддержка 3 режимов для уже перенесенных задач:
    - `skip`: пропуск ранее созданных задач (по умолчанию);
    - `update_all`: полное обновление полей, описания, статуса, дедлайна и исполнителя;
    - `update_status_only`: обновление только статуса, дедлайна и приоритета (сохраняя ручные изменения в Linear).
- **Расширение тестов и интерфейса**:
  - 36 комплексных юнит- и интеграционных тестов Vitest.
  - Live счетчики документов и обновленных задач в Web UI и отчетах (`migration-report.json`, `migration-report.md`).

---

## [0.1.0] - 2026-08-12

### Исправлено
- Обеспечена 100% корректная кодировка **кириллицы (UTF-8)** в терминале Windows и консоли Node.js: устранено повреждение символов (`╨┐╨╛...`) путем прямой синхронной записи потока и явного форсирования кодировки `utf-8` для `process.stdout` и `process.stderr`.
- Повышена устойчивость валидатора Zod к реальным данным WEEEK API: добавлена поддержка значений `null` для полей `priority`, `title`, `isCompleted`, `date`, `tags` и `assignees`.

### Добавлено
- Полная реализация визуального **Web UI** для управления миграцией в браузере (`weeek-to-linear ui` / `weeek-to-linear web`):
  - Локальный HTTP сервер на базе `node:http` (`src/server/server.ts`) с REST API и Server-Sent Events (SSE) стримингом.
  - Семантичный, полностью адаптивный интерфейс **Mobile First** (`src/server/public/`) в темном стиле Linear / Vercel.
  - Пошаговый 5-стадийный мастер (Auth $\rightarrow$ Projects $\rightarrow$ Mapping $\rightarrow$ Live Migration $\rightarrow$ Reports).
  - Карточная структура проектов и перенесенных задач (отказ от тяжелых таблиц на мобильных устройствах).
  - Интерактивный предпросмотр отчетов и прямое скачивание `migration-report.md` и `migration-report.json`.
  - Архитектурная документация `docs/UI_ARCHITECTURE.md`.
- Полная реализация сервиса и CLI-инструмента **WEEEK → Linear Migration Tool**:
- **Ядро миграции (`src/core/`)**:
  - `engine.ts`: 20-стадийный оркестратор миграции проектов, меток, родительских и дочерних задач с прогресс-хуками.
  - `state.ts`: атомарный `StateManager` с сохранением маппингов в `.weeek-linear/state.json`, поддержкой возобновления (`--resume`) и идемпотентности.
  - `validator.ts`: предстартовая валидация `PreflightValidator` (проверка доступов, команд, сопоставления пользователей и дат).
  - `resolver.ts`: топологический резолвер многоуровневых иерархий `RelationshipResolver`.
  - `mapper.ts`: чистые функции сопоставления приоритетов (0..3 -> 0..4 с hold-меткой), статусов, дат (YYYY-MM-DD), пользователей по email и описаний.
  - `reporter.ts`: генератор структурированных отчетов в форматах `migration-report.json` и `migration-report.md`.
- **API Клиенты (`src/clients/`)**:
  - `weeek/`: REST API клиент с автоматической пагинацией (`offset`, `perPage`, `hasMore`), обработкой ошибок и Zod-валидацией.
  - `linear/`: GraphQL SDK клиент для команд, статусов, пользователей, меток, создания проектов и задач.
- **Утилиты отказоустойчивости и безопасности (`src/utils/`)**:
  - `logger.ts`: Pino-логгер со строгим маскированием токенов (`[REDACTED]`).
  - `retry.ts`: экспоненциальный retry с джиттером и чтением заголовка `Retry-After` (HTTP 429).
  - `queue.ts`: менеджер параллелизма запросов `p-queue` с регулируемым `API_CONCURRENCY`.
  - `dates.ts` и `markdown.ts`: парсер дат и безопасный конвертер HTML/Markdown.
- **Интерактивный и неинтерактивный CLI (`src/cli/`)**:
  - `auth:test`: проверка подключения к API WEEEK и Linear.
  - `weeek:projects`: таблица проектов WEEEK.
  - `linear:teams`: список команд Linear.
  - `migrate`: интерактивный мастер на базе `@clack/prompts`, индикаторы `cli-progress` и поддержка флагов `--dry-run`, `--resume`, `--force`, `--weeek-project`, `--linear-team`.
- **Тестовое покрытие (`tests/`)**:
  - 30 юнит- и интеграционных тестов на базе Vitest с моками API.
- **Open Source и документация**:
  - `SECURITY.md`, `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `.github/workflows/ci.yml`.
  - Архитектурная документация в `docs/` (`API_ARCHITECTURE.md`, `MIGRATION_ARCHITECTURE.md`, `SECURITY_ARCHITECTURE.md`, `CLI_ARCHITECTURE.md`).
