# Changelog

Все значимые изменения проекта **WEEEK → Linear Migration Tool** документируются в этом файле согласно стандарту проекта.

Формат основан на [Keep a Changelog](https://keepachangelog.com/ru/1.0.0/).

## [0.4.0] - 2026-09-04

- **Устранение сбоя Linear API `createAsUser used without OAuth actor=app mode` при переносе комментариев**:
  - В соответствии со спецификацией Linear API (`https://linear.app/developers/oauth-actor-authorization`) Personal API Keys (`lin_api_*`) не поддерживают режим `OAuth actor=app` и атрибут `createAsUser`;
  - В [`src/clients/linear/client.ts`](file:///e:/DEV/Project/weeek-to-linear/src/clients/linear/client.ts) внедрено автоматическое определение типа токена: для Personal API Keys передача `createAsUser` блокируется, а при возникновении ошибки от Linear API срабатывает мгновенный безотказный fallback без потери автора;
  - В [`src/core/engine.ts`](file:///e:/DEV/Project/weeek-to-linear/src/core/engine.ts) обновлено формирование комментариев: при использовании Personal API Key имя сопоставленного автора и ссылка/привязка аккуратно оформляются в шапке Markdown-цитаты, а сопоставленный участник Linear автоматически подписывается на задачу через `subscribeUser`;
  - В [`src/utils/retry.ts`](file:///e:/DEV/Project/weeek-to-linear/src/utils/retry.ts) добавлен запрет бесполезных повторных запросов (retry) для фатальных ошибок несовместимости режимов авторизации (`actor=app`, `createAsUser`), устраняя 20-секундные задержки на каждый комментарий;
  - Добавлены модульные тесты для Personal API Key, OAuth и fallback в [`tests/unit/linear_client.test.ts`](file:///e:/DEV/Project/weeek-to-linear/tests/unit/linear_client.test.ts).
- **Исправление загрузки пользователей WEEEK и сопоставления авторов комментариев**:
  - В клиенте WEEEK [`src/clients/weeek/client.ts`](file:///e:/DEV/Project/weeek-to-linear/src/clients/weeek/client.ts) исправлен запрос получения участников рабочего пространства — внедрен актуальный эндпоинт WEEEK API `/ws/members` с дедупликацией и объединением с `getMe()`;
  - В схеме [`src/clients/weeek/schemas.ts`](file:///e:/DEV/Project/weeek-to-linear/src/clients/weeek/schemas.ts) и типах [`src/clients/weeek/types.ts`](file:///e:/DEV/Project/weeek-to-linear/src/clients/weeek/types.ts) реализована поддержка полей `firstName`, `lastName`, `logo`, `logoLink`, `roleType`, что обеспечивает корректное отображение полных имён участников («Денис Ершов», «Andrey Dobryy»), аватаров и бейджей ролей (Владелец / Администратор);
  - На сервере [`src/server/routes.ts`](file:///e:/DEV/Project/weeek-to-linear/src/server/routes.ts) роут `/api/weeek/users` дополнен автообнаружением авторов задач и комментариев по проектам (`projectIds`);
  - В Web UI [`src/server/public/index.html`](file:///e:/DEV/Project/weeek-to-linear/src/server/public/index.html) и [`src/server/public/app.js`](file:///e:/DEV/Project/weeek-to-linear/src/server/public/app.js) добавлены элементы управления дефолтным автором комментариев (`Fallback Comment Author` $\rightarrow$ `specific_user` / `use_name` / `bot_label`), выбор сотрудника Linear для несопоставленных комментариев и явные подсказки в блоке маппинга;
  - Добавлены модульные тесты в [`tests/unit/weeek_client.test.ts`](file:///e:/DEV/Project/weeek-to-linear/tests/unit/weeek_client.test.ts) для проверки `/ws/members` и нормализации профилей пользователей.
- **Фирменный стиль, векторный логотип и Favicon («Quantum Bridge — Neon Portal»)**:
  - Создан векторный знак высокой четкости [`src/server/public/favicon.svg`](file:///e:/DEV/Project/weeek-to-linear/src/server/public/favicon.svg) на базе калиброванной палитры «Neon Portal» (`#FF7A30` $\rightarrow$ `#FF3864` $\rightarrow$ `#7C3AED` $\rightarrow$ `#6366F1` / `#818CF8`);
  - Создан полноразмерный векторный горизонтальный логотип с гармоничной типографикой [`src/server/public/logo.svg`](file:///e:/DEV/Project/weeek-to-linear/src/server/public/logo.svg);
  - Подключен `<link rel="icon" type="image/svg+xml" href="favicon.svg">` в [`src/server/public/index.html`](file:///e:/DEV/Project/weeek-to-linear/src/server/public/index.html);
  - Обновлена шапка Web UI: заменена текстовая плашка на интерактивную SVG-эмблему `.brand-logo` с деликатным неоновым свечением при наведении и градиентным заголовком;
  - Добавлена мобильная адаптация шапки для компактных экранов ($\le 640$ px, iPhone SE 375px);
  - Настроен хук `onSuccess` в [`tsup.config.ts`](file:///e:/DEV/Project/weeek-to-linear/tsup.config.ts) для надежной автоматической репликации ассетов Web UI в `dist/server/public` при `pnpm build`;
  - Добавлены модульные тесты в [`tests/unit/server.test.ts`](file:///e:/DEV/Project/weeek-to-linear/tests/unit/server.test.ts) для валидации раздачи SVG-ассетов с `Content-Type: image/svg+xml`.
- **Многоуровневый гибкий движок маршрутизации (Flexible Routing Engine)**:
  - **Маршрутизация пользователей и ролей (User & Role Routing)**:
    - Стратегии дефолтного исполнителя (`fallbackAssignee`):
      - `unassigned` (по умолчанию): оставлять задачу без исполнителя;
      - `creator`: автоматически назначать задачу её автору из WEEEK (если сопоставлен в Linear);
      - `specific_user`: назначать выбранному сотруднику Linear (`fallbackAssigneeUserId`).
    - Атрибуция авторов задач (`creatorStrategy`):
      - `header`: цитатный блок в Markdown описании (`> 👤 **Создатель задачи (WEEEK):** ...`);
      - `subscriber`: автоматическое добавление автора задачи в подписчики (Subscribers) в Linear;
      - `both`: цитата в описании + добавление в подписчики;
      - `none`: отключение учета автора.
  - **Маршрутизация комментариев (Comment Routing Engine)**:
    - Автоподписка авторов комментариев (`subscribeCommentAuthors`): все сопоставленные авторы комментариев WEEEK подписываются на задачу в Linear через мутацию `subscribeUser`, чтобы получать уведомления при ответах;
    - Фильтрация системных автосообщений WEEEK (`commentFilterStrategy: exclude_system`): автоматическое отсечение технических записей изменений статуса, дедлайнов и исполнителей;
    - Стратегия резервного автора (`fallbackCommentAuthor`: `use_name` | `specific_user` | `bot_label`).
  - **Маршрутизация проектов в команды Linear (`projectTeamMapping`)**:
    - Индивидуальная привязка каждого проекта WEEEK к отдельной команде Linear в рамках единой миграции.
  - **Условные правила маршрутизации задач (Task Routing Rules)**:
    - Конструктор декларативных правил с условиями по полям `tag`, `column`, `priority`, `assignee` (операторы `equals`, `contains`);
    - Действия правил: `setAssigneeId`, `addSubscriberId`, `addLabelId`, `setPriority`, `targetTeamId`.
  - **Обновление Web UI и Mobile First UX**:
    - Новый блок «Маршрутизация пользователей и ролей» с динамическим показом выбора дефолтного сотрудника;
    - Чекбоксы автоподписки авторов комментариев и фильтрации системных комментариев;
    - Интерактивный конструктор правил маршрутизации с добавлением/удалением строк и сохранением в payload;
    - Адаптивная верстка (Mobile First) с сенсорными областями $\ge 44 \times 44$ px и адаптивным карточным представлением на мобильных экранах.
  - **Аудит UI/UX Pro Max и Design System (`/ui-ux-pro-max`, `/design`)**:
    - Сгенерирована и зафиксирована спецификация дизайн-системы [`design-system/weeek-to-linear-migration-tool/MASTER.md`](file:///e:/DEV/Project/weeek-to-linear/design-system/weeek-to-linear-migration-tool/MASTER.md);
    - Реализована полноценная поддержка доступности `:focus-visible` для навигации с клавиатуры на всех интерактивных элементах (кнопки, селекторы, радиокнопки, карточки);
    - Внедрена поддержка медиа-запроса `@media (prefers-reduced-motion: reduce)` (WCAG 2.1 Criterion 2.3.3);
    - Добавлены плавные скелетон-шиммеры (`.skeleton-card`, `.skeleton-line`) для состояний ожидания данных;
    - Улучшена доступность `#alert-banner` (`aria-live="assertive"`) и модального окна About (`aria-label` для кнопок закрытия);
    - Добавлено визуальное выделение активных радиокнопок через `.radio-label:has(input:checked)`.
  - **Расширение CLI и интернационализации (CLI & i18n)**:
    - Добавлены флаги: `--fallback-assignee`, `--fallback-assignee-user`, `--creator-strategy`, `--subscribe-comment-authors`, `--no-subscribe-comment-authors`, `--exclude-system-comments`, `--no-exclude-system-comments`, `--project-team-mapping`, `--routing-rules`;
    - Добавлены ключи локализации в `ru.ts`, `en.ts`, `types.ts`, `i18n.js`.
  - **Тестирование (Testing)**:
    - Создан тестовый набор `tests/unit/routing.test.ts` (11 тестов): проверка всех стратегий Fallback Assignee, Creator Attribution, Task Routing Rules;
    - Общее число тестов проекта выросло до 91 (17 сьютов), 100% успешное прохождение.
- **Поддержка миграции комментариев к задачам (Task Comments Migration)**:
  - Интеграция с новыми официальными эндпоинтами WEEEK Public API (релиз от 26 августа 2026):
    - `GET /public/v1/tm/tasks/{taskId}/comments` — получение комментариев задачи с автоматической пагинацией (`limit=100`, `offset`, `hasMore`).
    - `POST /public/v1/tm/tasks/{taskId}/comments` — создание комментариев и ответов в формате Markdown.
    - `DELETE /public/v1/tm/tasks/{taskId}/comments/{commentId}` — удаление комментария.
  - Zod-схемы валидации и строгие типы: `WeeekCommentSchema` (с полями `markdown`, `parentId`), `WeeekCommentsResponseSchema` с флагом `hasMore`, входной тип `CreateWeeekCommentInput`.
  - Стадия 12 конвейера миграции `migratingComments`: последовательный перенос комментариев для каждой перенесённой задачи в Linear через GraphQL-мутацию `commentCreate`.
  - Стратегии авторства комментариев (`--comment-strategy` / `commentStrategy`):
    - `text_only` (по умолчанию): добавление цитатного заголовка с именем автора WEEEK и датой создания (`> 💬 **Имя** (Дата): \n\n...`);
    - `mapped_authors`: сопоставление автора с Linear-пользователем и отображение через `createAsUser: authorName`;
    - `none`: отключение переноса комментариев.
  - Новая стратегия синхронизации `update_comments_only`: догрузка исключительно комментариев для уже мигрированных задач без перезаписи полей задач.
  - Реестр комментариев `comments: Record<WeeekCommentId, LinearCommentId>` в `MigrationState` для строгой идемпотентности и предотвращения дублей.
  - Разблокировка и интеграция элементов управления комментариями в Web UI:
    - Разблокированы радио-кнопки выбора стратегии комментариев на Шаге 3;
    - Добавлена опция синхронизации «Только новые комментарии» (`update_comments_only`);
    - Добавлена карточка счетчика комментариев `#cnt-comments` на Шаге 4 с живой SSE-индикацией;
    - Отображение созданных и пропущенных комментариев в сводном отчете Шага 5.
  - Поддержка интерактивных промптов и флага `--comment-strategy` в CLI с локализацией на русском и английском языках (`ru`/`en`).
  - Комплексные unit- и интеграционные тесты для методов клиента WEEEK, реестра состояния и полного конвейера миграции комментариев.
- **Комплексный аудит качества кода, безопасности и жизненного цикла (Code & Quality Audit)**:
  - **Безопасность Web-сервера и SecOps**:
    - Усилена защита статического файлового сервера (`serveStatic`) от атак обхода каталогов (Path Traversal): превентивная проверка сырого URL (`req.url`) на закодированные маркеры `%2e%2e`, `..`, `%2f`, `%5c`, с возвратом `403 Forbidden`.
    - Ограничен заголовок CORS (`Access-Control-Allow-Origin`): запрещен wildcard `*`, разрешены исключительно доверенные локальные адреса (`localhost`, `127.0.0.1`) и соответствующий origin сервера.
    - Внедрены обязательные заголовки безопасности HTTP-ответов: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer`.
    - Экспортирована функция `redactSensitiveData` в `src/utils/logger.ts` для маскирования чувствительных токенов и секретов в логах.
    - Добавлен тестовый набор `tests/unit/security.test.ts` (6 тестов: блокировка Path Traversal, ограничение CORS, маскирование секретов).
  - **Управление зависимостями и цепочкой поставок (Supply Chain)**:
    - Зафиксирован оверрайд `pnpm.overrides.esbuild >=0.28.1` в `package.json`, полностью устраняющий уязвимость `GHSA-g7r4-m6w7-qqqr` (чтение произвольных файлов в Windows).
    - `pnpm audit` подтверждает 0 уязвимостей.
  - **Аудит утечек памяти и жизненного цикла ресурсов (`/memory-leak-debugging`)**:
    - Внедрен кольцевой буфер `MAX_LOG_ENTRIES = 500` для `liveConsoleLogs` в Web UI (`src/server/public/app.js`) с автоматическим удалением устаревших узлов DOM (`firstChild.remove()`).
    - Создан тестовый набор `tests/unit/memory.test.ts` для проверки корректного жизненного цикла SSE-клиентов (регистрация, автоотписка при закрытии соединения, массовая очистка `closeAll`, отсутствие утечек слушателей при 1000 событиях).
  - **Mobile First UX/UI и доступность (`@user_global` правила 8, 10, 11, 16)**:
    - Добавлено медиа-правило `@media (max-width: 640px)` в `src/server/public/app.css`: на узких экранах таблица сопоставления колонок (`.mapping-table`) автоматически преобразуется в стек адаптивных карточек с псевдоэлементами заголовков `td::before`.
    - Гарантирован минимальный размер сенсорных областей $\ge 44 \times 44$ px для всех кнопок, радиокнопок и полей ввода.
  - **Расширение тестового покрытия (Backend & Frontend Quality)**:
    - Добавлен тестовый набор `tests/unit/linear_client.test.ts` (15 тестов, покрытие 91%+): протестированы все GraphQL-мутации (`createWorkflowState`, `updateWorkflowState`, `archiveWorkflowState`, `createIssue`, `createComment`, `createLabel`, `createProject`, `createDocument`, `subscribeUser`).
    - Расширен тестовый набор `tests/unit/server.test.ts` (8 тестов): валидация `/api/status`, `/api/auth/test`, проверка корректности MIME-типов для CSS и JS, обработка некорректного JSON.
    - Создан тестовый набор `tests/unit/web_i18n.test.ts`: автоматическая валидация 100% паритета ключей локализации (`ru` и `en`) в Web UI.
    - Создан тестовый набор `tests/unit/cli.test.ts`: проверка палитры тем оформления и регистрации команд.
    - Общее число тестов проекта достигло 80 (16 сьютов), 100% успешное прохождение.
  - **Линтинг, форматирование и CI/CD**:
    - Интегрирован линтинг клиентских скриптов `src/server/public/**/*.js` в `eslint.config.js` с поддержкой браузерных глобальных переменных.
    - Выполнено форматирование кодовой базы по Prettier (проходит `npx prettier --check`).
    - Обновлен рабочий процесс `.github/workflows/ci.yml`: добавлены шаги `pnpm format:check`, `pnpm test:coverage` и `pnpm audit --audit-level=high`.
    - Скрипт `pnpm typecheck` расширен для одновременной валидации типов как в `src/`, так и в `tests/` (`tsc --noEmit && tsc -p tests/tsconfig.json --noEmit`), устранена нехватка обязательного поля `timestamp` в `tests/unit/memory.test.ts`.

### Изменено

- Обновлена версия приложения до `0.4.0` в `package.json`, `src/config/constants.ts`, Web UI, документации и политике безопасности `SECURITY.md`.
- `docs/API_ARCHITECTURE.md`: добавлены спецификации REST-эндпоинтов комментариев WEEEK и мутации Linear `commentCreate`.
- `docs/SECURITY_ARCHITECTURE.md`: добавлены разделы о защите Web UI сервера от Path Traversal, CORS, HTTP-заголовках и аудите зависимостей.
- `docs/UI_ARCHITECTURE.md`: документирована трансформация таблиц в карточки на мобильных устройствах, стандарт тач-таргетов 44px и кольцевой буфер предотвращения утечек памяти.

### Изменённые файлы

- `package.json`
- `pnpm-lock.yaml`
- `eslint.config.js`
- `.github/workflows/ci.yml`
- `src/config/constants.ts`
- `src/clients/weeek/schemas.ts`
- `src/clients/weeek/types.ts`
- `src/clients/weeek/client.ts`
- `src/core/types.ts`
- `src/core/state.ts`
- `src/core/engine.ts`
- `src/core/reporter.ts`
- `src/server/server.ts`
- `src/server/routes.ts`
- `src/server/public/index.html`
- `src/server/public/app.css`
- `src/server/public/app.js`
- `src/server/public/i18n.js`
- `src/utils/logger.ts`
- `src/cli/commands/migrate.ts`
- `src/i18n/types.ts`
- `src/i18n/ru.ts`
- `src/i18n/en.ts`
- `tests/unit/weeek_client.test.ts`
- `tests/unit/linear_client.test.ts`
- `tests/unit/state.test.ts`
- `tests/unit/server.test.ts`
- `tests/unit/security.test.ts`
- `tests/unit/memory.test.ts`
- `tests/unit/web_i18n.test.ts`
- `tests/unit/cli.test.ts`
- `tests/integration/engine.test.ts`
- `SECURITY.md`
- `README.md`
- `README.en.md`
- `docs/API_ARCHITECTURE.md`
- `docs/SECURITY_ARCHITECTURE.md`
- `docs/UI_ARCHITECTURE.md`
- `docs/CHANGELOG.md`

### Обоснование

В публичный API WEEEK от 26.08.2026 была добавлена долгожданная поддержка работы с комментариями задач (`/tm/tasks/{taskId}/comments`), что позволило полноценно снять временную блокировку функции и обеспечить перенос истории обсуждений в Linear с соблюдением требований безопасности, идемпотентности и авторства.

### Сведения о миграциях и совместимости

- Формат `state.json` обратно совместим: при чтении файла состояния предыдущих версий (где поле `comments` отсутствовало) `MigrationState` автоматически инициализирует пустой объект `comments: {}`.
- Действия для отката: при необходимости отката версии достаточно установить версию `0.3.3`, сохранённое состояние задач остаётся валидным.

---

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
