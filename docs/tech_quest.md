# WEEEK → Linear Migration Tool

## 1. Описание проекта

**WEEEK → Linear Migration Tool** — open-source CLI-инструмент для переноса проектов и задач из WEEEK в Linear через официальные API.

Цель проекта — предоставить простой и безопасный способ миграции рабочих пространств из WEEEK в Linear без ручного копирования задач.

Инструмент должен запускаться локально и не требовать отдельного backend-сервера.

Основной сценарий:

```text
WEEEK
  ↓
WEEEK Public API
  ↓
Migration Tool
  ↓
mapping / validation
  ↓
Linear GraphQL API
  ↓
Linear
```

WEEEK предоставляет API для получения проектов и задач, включая `parentId`, проект, исполнителей, приоритет, даты, теги, статус выполнения и другие свойства.

Linear предоставляет GraphQL API по адресу `https://api.linear.app/graphql`; для CLI MVP допускается использование Personal API Key. Для будущей web-версии рекомендуется OAuth2.

---

# 2. Цели

### Основная цель

Позволить пользователю перенести данные:

* проекты;
* задачи;
* подзадачи;
* описания;
* статусы;
* приоритеты;
* дедлайны;
* исполнителей;
* теги;
* связи родитель → подзадача.

### Вторичные цели

Инструмент должен:

* быть идемпотентным;
* не создавать дубликаты при повторном запуске;
* поддерживать dry-run;
* показывать прогресс миграции;
* сохранять mapping WEEEK ID → Linear ID;
* корректно обрабатывать ошибки API;
* поддерживать повторный запуск после сбоя;
* не требовать передачи данных через сторонний сервер.

---

# 3. Non-goals MVP

В первой версии НЕ требуется переносить:

* комментарии;
* историю изменений;
* time entries;
* вложения;
* подписчиков;
* recurring tasks;
* custom fields;
* портфолио WEEEK;
* календарные события;
* автоматизации;
* уведомления.

Эти возможности могут быть добавлены после MVP.

---

# 4. Целевая аудитория

### Основная

Пользователь WEEEK, который хочет перейти на Linear.

### Вторичная

* разработчики;
* небольшие команды;
* стартапы;
* open-source проекты;
* команды, мигрирующие между task management системами.

---

# 5. Формат приложения

MVP — **CLI application**.

Пример:

```bash
npx weeek-to-linear
```

или после установки:

```bash
weeek-to-linear
```

Также должна поддерживаться работа без интерактивного режима:

```bash
weeek-to-linear migrate \
  --weeek-project 123 \
  --linear-team ENG
```

---

# 6. Технологический стек

Рекомендуемый стек:

* Node.js 22+
* TypeScript
* pnpm
* `commander` или `yargs` — CLI
* `zod` — validation
* `graphql-request` или native `fetch` — Linear API
* native `fetch` — WEEEK API
* `pino` или `consola` — logging
* `cli-progress` / `ora` — progress UI
* Vitest — tests
* ESLint
* Prettier

Не использовать базу данных на MVP.

Для состояния миграции использовать локальный JSON-файл.

Например:

```text
.weeek-linear/
    state.json
    logs/
```

---

# 7. Конфигурация

Поддержать `.env`:

```env
WEEEK_API_TOKEN=
LINEAR_API_TOKEN=
```

Опционально:

```env
LOG_LEVEL=info
STATE_FILE=.weeek-linear/state.json
```

Никогда не выводить API-токены в лог.

Добавить:

```text
.env
.weeek-linear/
```

в `.gitignore`.

---

# 8. CLI

## 8.1. Проверка подключения

```bash
weeek-to-linear auth:test
```

Результат:

```text
✓ WEEEK API connection successful
✓ Linear API connection successful

WEEEK user: Denis
Linear workspace: My Workspace
```

---

## 8.2. Список проектов WEEEK

```bash
weeek-to-linear weeek:projects
```

Пример:

```text
WEEEK projects

ID      NAME              TASKS
123     Media Hub         142
456     Olive              87
789     CS2                53
```

Источник данных — WEEEK `/tm/projects` и `/tm/tasks`.

---

## 8.3. Список Linear teams

```bash
weeek-to-linear linear:teams
```

Пример:

```text
Linear teams

ID                                    KEY     NAME
abc123...                             ENG     Engineering
def456...                             DES     Design
```

---

# 9. Основная команда миграции

```bash
weeek-to-linear migrate
```

Интерактивный сценарий:

```text
? Select WEEEK projects:
  ◉ Media Hub
  ◯ Olive
  ◯ CS2

? Target Linear team:
  Engineering

? Import completed tasks?
  Yes

? Import deleted tasks?
  No

? Create Linear labels from WEEEK tags?
  Yes

? Preserve parent/subtask hierarchy?
  Yes

? Start migration?
  Yes
```

После подтверждения:

```text
Fetching WEEEK projects...
✓ 3 projects

Fetching tasks...
✓ 282 tasks

Creating Linear projects...
✓ 3 projects

Creating labels...
✓ 17 labels

Creating issues...
████████████████████████ 282/282

Resolving parent issues...
✓ 64 parent/subtask relationships

Migration completed.

Created:
  Projects: 3
  Issues: 282
  Labels: 17

Skipped:
  0

Errors:
  0
```

---

# 10. Dry Run

Обязательная функция.

```bash
weeek-to-linear migrate --dry-run
```

Инструмент должен получить данные из WEEEK, выполнить mapping, но **не создавать ничего в Linear**.

Пример:

```text
DRY RUN

Projects:
  Media Hub → Media Hub
  Olive → Olive

Tasks:
  142 tasks → 142 issues

Labels:
  12 tags → 12 labels

Potential problems:
  ⚠ 3 WEEEK users have no Linear match
  ⚠ 5 tasks have unsupported dates

No changes were made.
```

---

# 11. Mapping данных

## 11.1. Project

WEEEK:

```text
project.id
project.name
project.description
project.isPrivate
```

Linear:

```text
Project
```

Название переносится напрямую.

Описание переносится напрямую.

Если Linear project нельзя создать без дополнительных обязательных параметров — использовать соответствующий target team и доступные значения по умолчанию.

---

# 12. Task → Issue

WEEEK task:

```text
id
parentId
title
description
date
dateStart
dateEnd
priority
isCompleted
projectId
assignees
tags
```

Linear issue:

```text
title
description
status
priority
assignee
project
labels
dueDate
```

Linear issues всегда принадлежат одной team и требуют title и status.

---

# 13. Priority mapping

WEEEK использует:

```text
0 = Low
1 = Medium
2 = High
3 = Hold
```

Linear:

```text
0 = No priority
1 = Urgent
2 = High
3 = Medium
4 = Low
```

Рекомендуемый mapping:

```text
WEEEK 0 → Linear Low
WEEEK 1 → Linear Medium
WEEEK 2 → Linear High
WEEEK 3 → Linear No Priority
```

Причина: `Hold` не является приоритетом в Linear. В будущем можно преобразовывать `Hold` в отдельный label.

---

# 14. Status mapping

Статусы WEEEK должны быть сопоставлены со статусами Linear.

Например:

```text
WEEEK                    Linear

Not started       →      Backlog
In progress       →      In Progress
Completed         →      Done
```

При запуске миграции инструмент должен получить workflow states выбранной Linear team и предложить mapping.

Пример:

```text
WEEEK → Linear status mapping

Not started
  → Backlog

In progress
  → In Progress

Completed
  → Done

? Confirm mapping:
  Yes
```

Если WEEEK предоставляет несколько board columns, каждая колонка должна быть доступна для mapping.

---

# 15. Parent / Subtask

WEEEK поддерживает `parentId`.

При миграции:

```text
WEEEK

Task A
 ├── Task B
 ├── Task C
 └── Task D
```

должно превратиться в:

```text
Linear

Task A
 ├── Task B
 ├── Task C
 └── Task D
```

Порядок создания:

### Stage 1

Создать все parent issues.

### Stage 2

Создать sub-issues.

### Stage 3

Установить parent relationship.

Если parent issue не удалось создать:

```text
⚠ Cannot resolve parent for task 12345
```

Подзадача не должна из-за этого полностью теряться. Она должна быть создана как обычный issue, а ошибка должна попасть в migration report.

---

# 16. Assignee mapping

WEEEK users и Linear users имеют разные ID.

Необходимо построить mapping:

```text
WEEEK user
     ↓
email
     ↓
Linear user
```

При старте:

```text
WEEEK → Linear users

alex@example.com
    → Alex ✓

denis@example.com
    → Denis ✓

john@example.com
    → NOT FOUND ⚠
```

Для неизвестных пользователей:

```text
? What should happen?

1. Create without assignee
2. Skip task
3. Abort migration
```

По умолчанию:

**Create without assignee.**

---

# 17. Tags → Labels

WEEEK tags должны преобразовываться в Linear labels.

Например:

```text
WEEEK

bug
backend
urgent
design
```

→

```text
Linear

bug
backend
urgent
design
```

Linear поддерживает workspace-level и team-level issue labels.

Рекомендуемый MVP:

**создавать labels на уровне Linear team.**

Если label с таким названием уже существует:

```text
не создавать новый
использовать существующий
```

---

# 18. Dates

WEEEK поддерживает:

```text
date
dateStart
dateEnd
timeStart
timeEnd
```

В MVP:

```text
dateEnd → Linear dueDate
```

Если доступен только `date`:

```text
date → dueDate
```

Time information не переносится в MVP.

---

# 19. Description

Описание WEEEK переносится в Linear без изменений.

Если Linear не поддерживает конкретный формат WEEEK:

```text
WEEEK markdown/HTML
        ↓
Markdown
        ↓
Linear description
```

Необходимо сохранить:

* заголовки;
* списки;
* ссылки;
* жирный текст;
* курсив;
* code blocks.

---

# 20. Idempotency

Критически важная функция.

Повторный запуск:

```bash
weeek-to-linear migrate
```

не должен создавать дубликаты.

Локально хранить:

```json
{
  "projects": {
    "123": {
      "linearProjectId": "..."
    }
  },
  "tasks": {
    "456": {
      "linearIssueId": "..."
    }
  },
  "labels": {
    "10": {
      "linearLabelId": "..."
    }
  }
}
```

---

# 21. Migration state

Файл:

```text
.weeek-linear/state.json
```

Пример:

```json
{
  "version": 1,
  "source": "weeek",
  "target": "linear",
  "startedAt": "2026-08-12T10:00:00Z",
  "projects": {},
  "tasks": {},
  "labels": {},
  "users": {}
}
```

После успешного создания каждой сущности mapping должен сохраняться сразу.

Это позволяет продолжить миграцию после:

* ошибки API;
* network timeout;
* rate limit;
* Ctrl+C;
* падения Node.js.

---

# 22. Resume

Команда:

```bash
weeek-to-linear migrate --resume
```

должна продолжать миграцию на основе `state.json`.

Пример:

```text
Previous migration found.

Created:
  120/142 tasks

Resume migration?
  Yes
```

---

# 23. Повторная миграция

Добавить:

```bash
weeek-to-linear migrate --force
```

`--force` не должен бездумно создавать дубликаты.

Он должен игнорировать существующий mapping только после явного подтверждения.

---

# 24. Error handling

Ошибки разделить на:

### Fatal

Например:

```text
Invalid Linear API token
Invalid WEEEK API token
Linear team not found
```

Миграция прекращается.

### Recoverable

Например:

```text
One task failed
One label failed
One user cannot be matched
```

Миграция продолжается.

В конце:

```text
Migration completed with warnings.

Created: 275
Failed: 7
Skipped: 3
```

---

# 25. Retry

Для API-запросов использовать retry.

Рекомендуемая стратегия:

```text
1st retry: 1 sec
2nd retry: 2 sec
3rd retry: 4 sec
4th retry: 8 sec
```

Retry только для:

* 429;
* 500;
* 502;
* 503;
* 504;
* network errors.

Не retry для:

* 400;
* 401;
* 403;
* 404.

---

# 26. Rate limits

Инструмент должен учитывать rate limits API.

Не выполнять бесконечный параллелизм.

Использовать configurable concurrency:

```env
API_CONCURRENCY=3
```

По умолчанию:

```text
3 concurrent requests
```

При HTTP 429:

```text
Retry-After
```

должен учитываться, если предоставлен API.

---

# 27. Pagination

WEEEK API возвращает пагинацию через:

```text
hasMore
perPage
offset
```

Инструмент должен автоматически получать все страницы.

Пользователь не должен вручную указывать pagination parameters.

---

# 28. Migration stages

Полная миграция должна выполняться по этапам:

```text
1. Authenticate
2. Load WEEEK projects
3. Load WEEEK tasks
4. Load WEEEK users
5. Load WEEEK tags
6. Load Linear workspace
7. Load Linear teams
8. Load Linear users
9. Load Linear labels
10. Validate mappings
11. Create Linear projects
12. Create Linear labels
13. Create parent issues
14. Create child issues
15. Apply relations
16. Apply assignees
17. Apply labels
18. Apply statuses
19. Apply dates
20. Generate report
```

---

# 29. Validation перед миграцией

До первого изменения Linear инструмент должен выполнить validation.

Пример:

```text
Migration validation

Projects:
  ✓ 3/3 mapped

Statuses:
  ✓ 4/4 mapped

Users:
  ✓ 8/8 mapped

Labels:
  ✓ 17/17 mapped

Tasks:
  ✓ 282 ready

Warnings:
  ⚠ 4 tasks have no assignee
  ⚠ 2 tasks use unsupported date format

Errors:
  0

Ready to migrate.
```

---

# 30. Migration report

После завершения создать:

```text
migration-report.json
```

и:

```text
migration-report.md
```

Пример:

```markdown
# Migration Report

Date: 2026-08-12

## Summary

Projects: 3
Issues: 282
Labels: 17

Created: 282
Skipped: 0
Failed: 0

## Warnings

- 4 tasks have no Linear assignee

## Mapping

| WEEEK ID | Linear ID |
|----------|-----------|
| 123      | ENG-123   |
| 124      | ENG-124   |
```

---

# 31. Logging

CLI должен иметь уровни:

```bash
--log-level debug
--log-level info
--log-level warn
--log-level error
```

Обычный режим:

```text
✓ Project created: Media Hub
✓ Issue created: Build parser
✓ Issue created: Add Redis cache
```

Debug:

```text
POST https://api.linear.app/graphql
mutation issueCreate(...)
```

При этом API token никогда не показывается.

---

# 32. Architecture

Предлагаемая структура:

```text
src/
├── cli/
│   ├── index.ts
│   ├── commands/
│   │   ├── auth.ts
│   │   ├── projects.ts
│   │   └── migrate.ts
│   └── prompts/
│
├── weeek/
│   ├── client.ts
│   ├── projects.ts
│   ├── tasks.ts
│   ├── users.ts
│   └── types.ts
│
├── linear/
│   ├── client.ts
│   ├── projects.ts
│   ├── issues.ts
│   ├── labels.ts
│   ├── users.ts
│   ├── teams.ts
│   └── types.ts
│
├── migration/
│   ├── engine.ts
│   ├── mapper.ts
│   ├── validator.ts
│   ├── state.ts
│   ├── resolver.ts
│   └── report.ts
│
├── config/
│   └── config.ts
│
├── utils/
│   ├── retry.ts
│   ├── logger.ts
│   └── dates.ts
│
└── index.ts
```

---

# 33. Migration engine

Основной класс:

```typescript
class MigrationEngine {
  async validate(): Promise<ValidationResult>

  async migrateProjects(): Promise<void>

  async migrateLabels(): Promise<void>

  async migrateIssues(): Promise<void>

  async resolveRelationships(): Promise<void>

  async run(): Promise<MigrationResult>
}
```

---

# 34. Mapper

Вся логика преобразования должна быть изолирована.

Например:

```typescript
mapPriority(weeekPriority)
mapStatus(weeekStatus)
mapTask(weeekTask)
mapProject(weeekProject)
mapUser(weeekUser)
```

Это позволит тестировать mapping без обращения к API.

---

# 35. API clients

WEEEK client:

```typescript
class WeeekClient {
  getProjects()
  getProject(id)
  getTasks(options)
  getTask(id)
}
```

Linear client:

```typescript
class LinearClient {
  getTeams()
  getUsers()
  getProjects()
  getLabels()
  getWorkflowStates()

  createProject()
  createIssue()
  createLabel()

  updateIssue()
}
```

---

# 36. Security

Основные требования:

* токены только через environment variables или interactive prompt;
* не хранить токены в `state.json`;
* не отправлять данные на сторонние серверы;
* не включать токены в error reports;
* не логировать Authorization headers;
* `.env` в `.gitignore`;
* документация по созданию API tokens.

---

# 37. Open Source

Репозиторий должен быть публичным.

Рекомендуемая лицензия:

```text
MIT
```

Структура:

```text
README.md
LICENSE
CONTRIBUTING.md
SECURITY.md
CHANGELOG.md
CODE_OF_CONDUCT.md

.github/
  workflows/
    ci.yml
    release.yml
  ISSUE_TEMPLATE/
  pull_request_template.md

src/
tests/
docs/
```

---

# 38. README

README должен содержать:

1. Что делает проект.
2. Screenshot / GIF CLI.
3. Возможности.
4. Ограничения.
5. Требования.
6. Установка.
7. Получение WEEEK API token.
8. Получение Linear API token.
9. Быстрый старт.
10. Dry-run.
11. Mapping.
12. Resume.
13. FAQ.
14. Troubleshooting.
15. Contribution guide.

Пример Quick Start:

```bash
git clone https://github.com/<owner>/weeek-to-linear.git

cd weeek-to-linear

pnpm install

cp .env.example .env
```

Заполнить:

```env
WEEEK_API_TOKEN=xxx
LINEAR_API_TOKEN=xxx
```

Проверить:

```bash
pnpm cli auth:test
```

Запустить:

```bash
pnpm cli migrate
```

---

# 39. Testing

Покрыть unit-тестами:

### Mapping

```text
priority
status
dates
users
labels
```

### State

```text
save
load
resume
duplicate prevention
```

### API

Mock API responses.

### Migration

Минимальный integration test:

```text
3 projects
10 tasks
3 subtasks
5 labels
3 users
```

Ожидаемый результат:

```text
3 projects
10 issues
5 labels
3 parent relations
```

---

# 40. CI

GitHub Actions:

```text
push
  ↓
install
  ↓
lint
  ↓
typecheck
  ↓
unit tests
  ↓
build
```

Node versions:

```text
22.x
24.x
```

---

# 41. MVP Acceptance Criteria

MVP считается готовым, если пользователь может:

### Authentication

* [ ] указать WEEEK API token;
* [ ] указать Linear API token;
* [ ] проверить оба подключения.

### Discovery

* [ ] получить список WEEEK projects;
* [ ] получить список Linear teams;
* [ ] выбрать проект WEEEK;
* [ ] выбрать Linear team.

### Migration

* [ ] создать Linear projects;
* [ ] создать issues;
* [ ] создать labels;
* [ ] перенести descriptions;
* [ ] перенести priorities;
* [ ] перенести due dates;
* [ ] перенести assignees;
* [ ] перенести statuses;
* [ ] сохранить parent/subtask hierarchy.

### Reliability

* [ ] dry-run;
* [ ] retry;
* [ ] pagination;
* [ ] rate-limit handling;
* [ ] state file;
* [ ] resume;
* [ ] idempotency;
* [ ] migration report.

### Open Source

* [ ] README;
* [ ] LICENSE;
* [ ] CONTRIBUTING;
* [ ] SECURITY;
* [ ] GitHub Actions;
* [ ] tests.

---

# 42. Future roadmap

## v0.1

CLI + базовая миграция.

```text
Projects
Issues
Subtasks
Labels
Status
Priority
Assignee
Due date
```

## v0.2

Добавить:

* comments;
* attachments;
* subscribers;
* time estimates;
* time entries.

## v0.3

Добавить:

* interactive mapping editor;
* advanced custom fields;
* better Markdown conversion;
* migration preview.

## v0.4

Добавить web UI:

```text
WEEEK token
      ↓
Connect

Linear token
      ↓
Connect

Select projects
      ↓
Mapping
      ↓
Preview
      ↓
Migration
      ↓
Report
```

## v1.0

OAuth:

```text
Connect WEEEK
Connect Linear
       ↓
Select workspace
       ↓
Select projects
       ↓
Preview
       ↓
Migrate
```

Для приложения, которым будут пользоваться другие люди, Linear рекомендует OAuth2 вместо персональных API keys.

---

# 43. Важный принцип проекта

Инструмент **не должен пытаться сделать идеальный 1:1 перенос всех возможностей WEEEK в Linear**.

Главная задача:

> Перенести рабочую структуру и задачи так, чтобы после миграции пользователь мог продолжить работу в Linear без ручного восстановления сотен задач.

Поэтому при отсутствии прямого аналога необходимо выбирать ближайшую семантическую сущность Linear.

Например:

```text
WEEEK Hold
    ↓
Linear label: hold
```

а не пытаться искусственно использовать priority.

---

# 44. Definition of Done

Проект готов к публичному релизу, если:

```text
✓ Fresh WEEEK workspace
✓ Fresh Linear workspace
✓ 100+ tasks
✓ Projects
✓ Nested tasks
✓ Labels
✓ Users
✓ Different priorities
✓ Different statuses
✓ Dates

        ↓

One CLI command

        ↓

Successful migration

        ↓

No duplicate issues after second run

        ↓

Migration report generated
```

Главный пользовательский сценарий должен занимать не более:

```text
5–10 минут
```

от получения API tokens до завершения миграции.
