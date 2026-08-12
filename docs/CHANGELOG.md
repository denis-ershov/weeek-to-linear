# Changelog

Все значимые изменения проекта **WEEEK → Linear Migration Tool** документируются в этом файле согласно стандарту проекта.

Формат основан на [Keep a Changelog](https://keepachangelog.com/ru/1.0.0/).

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
