# WEEEK → Linear Migration Tool

[![CI](https://github.com/denis-ershov/weeek-to-linear/actions/workflows/ci.yml/badge.svg)](https://github.com/denis-ershov/weeek-to-linear/actions/workflows/ci.yml)
[![Version](https://img.shields.io/badge/version-0.3.0-blue.svg)](https://github.com/denis-ershov/weeek-to-linear)
[![License: GPL v3](https://img.shields.io/badge/License-GPL_v3-blue.svg)](https://www.gnu.org/licenses/gpl-3.0)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D22.0.0-green.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org/)

> 🇬🇧 **English version**: [README.en.md](./README.en.md)

**WEEEK → Linear Migration Tool** — профессиональный open-source инструмент с поддержкой **Web UI** и **CLI** для безопасного, идемпотентного и надежного переноса проектов, задач, многоуровневых подзадач, колонок канбан-досок, документов базы знаний, приоритетов, дедлайнов, тегов и исполнителей из **WEEEK** в **Linear** через официальные API.


---

## ✨ Ключевые возможности

- 🚀 **Комплексный перенос данных**: автоматическая миграция проектов, задач, иерархии подзадач, приоритетов, дедлайнов, тегов и исполнителей.
- 📋 **Умный перенос Канбан-досок и колонок**:
  - Автоматическое распознавание колонок WEEEK и их эвристическое сопоставление со статусами Linear.
  - **Авто-создание отсутствующих статусов**: автоматическое создание новых Workflow States в Linear с корректным базовым типом (`backlog`, `unstarted`, `started`, `completed`, `canceled`) и цветом.
  - **Переименование статусов**: опция переименования сопоставленных Linear-статусов в точные названия и цвета из WEEEK.
  - **Полная замена (1-в-1)**: архивация лишних дефолтных статусов Linear и пересоздание точной структуры колонок из WEEEK.
- 📚 **Перенос документов базы знаний**: загрузка статей из WEEEK Knowledge Base и создание документов в Linear Project Documents с сохранением Markdown-разметки.
- 👥 **Персональный маппинг пользователей (Assignees)**:
  - Автоматическое сопоставление по Email.
  - Индивидуальный селектор для каждого сотрудника с поддержкой Fallback (`unassigned`, `skip`, назначение на конкретного пользователя).
- 👁️ **Гибкое назначение наблюдателей (Subscribers / Watchers)**:
  - `none`: без назначения дополнительных наблюдателей;
  - `secondary_assignees`: вторичные исполнители WEEEK назначаются наблюдателями в Linear;
  - `global_watcher`: привязка ответственного сотрудника (Team Lead / PM) ко всем задачам;
  - `both`: комбинация вторичных исполнителей и глобального наблюдателя.
- 🔁 **Идемпотентность и стратегии повторной синхронизации**:
  - Сохранение состояния в `.weeek-linear/state.json`.
  - Режимы синхронизации: `skip` (пропуск уже перенесенных), `update_all` (полное обновление), `update_status_only` (обновление только статуса и приоритета).
- 💻 **Визуальный Web UI**: стильный интерфейс в духе **Linear / Vercel** с Mobile-First адаптивностью, карточным интерфейсом и живым SSE-стримингом прогресса.
- 🌐 **Мультиязычность (ru / en)**: переключатель языка в Web UI, флаг `--lang` в CLI, автоопределение по системной локали.
- 🔒 **Security-First (Zero Leak)**: локальное выполнение, маскирование токенов в логах (`[REDACTED]`), строгие политики безопасности.
- 🧪 **Режим симуляции (`--dry-run`)**: валидация и предварительный расчет без внесения изменений в Linear.
- 🛡️ **Отказоустойчивость API**: экспоненциальный retry с джиттером, строгий rate-limiting и автоматический учет заголовка `Retry-After` (HTTP 429).
- 📊 **Автоматические отчеты**: детальный аудит миграции в форматах `migration-report.md` (Markdown с таблицами) и `migration-report.json`.

---

## 🏗️ Архитектура переноса данных

```
WEEEK (REST API)
   ↓  (Проекты, задачи, канбан-колонки, документы, теги, пользователи)
Data Mapper & Sanitizer
   ↓  (Трансформация HTML/Markdown, дат, статусов, приоритетов, исполнителей)
3-Phase Relationship Resolver & State Engine
   ↓  (1. Родители -> 2. Подзадачи -> 3. Документы -> 4. Наблюдатели)
Linear (GraphQL API)
   ↓
.weeek-linear/state.json + migration-report.md
```

---

## ⚡ Быстрый старт (Quick Start)

### 1. Запуск визуального веб-интерфейса (Web UI)

```bash
npx weeek-to-linear ui
```
> Откроется веб-интерфейс на `http://localhost:3456` с пошаговым мастером настройки колонок, пользователей и параметров.

---

### 2. Запуск через интерактивный терминал (CLI)

```bash
npx weeek-to-linear
```

---

### 3. Локальная установка из репозитория

```bash
# Клонирование репозитория
git clone https://github.com/denis-ershov/weeek-to-linear.git
cd weeek-to-linear

# Установка зависимостей
pnpm install

# Настройка переменных окружения (опционально)
cp .env.example .env
```

Отредактируйте `.env` (при необходимости):
```env
WEEEK_API_TOKEN=ваш_weeek_токен
LINEAR_API_TOKEN=ваш_linear_токен
```

### Запуск Web UI:
```bash
pnpm dev ui
```

### Запуск интерактивной миграции:
```bash
pnpm cli migrate
```

---

## 🔑 Получение API-токенов

### WEEEK API Token:
1. Войдите в аккаунт **WEEEK**.
2. Перейдите в **Настройки профиля** → **API**.
3. Создайте новый токен доступа и скопируйте его.

### Linear API Token:
1. Войдите в **Linear**.
2. Перейдите в **Settings** → **Account** → **Security** ([linear.app/settings/account/security](https://linear.app/settings/account/security)).
3. В разделе **Personal API keys** создайте новый ключ (например, `Migration Tool`) и сохраните его.

---

## 📋 Справочник CLI-команд и флагов

### Команды:
| Команда | Описание |
| :--- | :--- |
| `weeek-to-linear ui` (или `web`) | Запуск локального визуального веб-интерфейса |
| `weeek-to-linear auth:test` | Проверка валидности токенов WEEEK и Linear и вывод информации об аккаунтах |
| `weeek-to-linear weeek:projects` | Таблица всех проектов рабочего пространства WEEEK |
| `weeek-to-linear linear:teams` | Список доступных команд Linear и их ключей (`Key`) |
| `weeek-to-linear migrate [options]` | Запуск интерактивного мастера или неинтерактивной миграции |

### Полный список флагов команды `migrate`:
| Флаг | Описание |
| :--- | :--- |
| `-d, --dry-run` | Режим симуляции: валидация и расчет без изменения данных в Linear |
| `-l, --lang <ru|en>` | Язык интерфейса CLI (по умолчанию `ru` или значение из `WEEEK_LANG`) |
| `-r, --resume` | Продолжить миграцию с момента последней остановки |
| `-f, --force` | Принудительный перезапуск с очисткой сохраненного состояния |
| `-p, --weeek-project <id>` | Неинтерактивный перенос конкретного проекта WEEEK |
| `-t, --linear-team <key>` | Неинтерактивный выбор команды Linear (например, `ENG`) |
| `--create-missing-states` | Автоматически создавать отсутствующие статусы/колонки в Linear |
| `--rename-matched-states` | Переименовать сопоставленные статусы Linear в формат WEEEK |
| `--recreate-columns` | Полная замена: архивировать лишние статусы и пересоздать структуру 1-в-1 как в WEEEK |
| `--no-completed` | Исключить завершенные задачи из миграции |
| `--no-docs` | Не переносить документы базы знаний |
| `--include-deleted` | Включить удаленные задачи в перенос |
| `--sync-strategy <strategy>` | Поведение при повторном запуске: `skip` (по умолчанию), `update_all`, `update_status_only` |
| `--watcher-strategy <strategy>` | Стратегия наблюдателей: `none`, `secondary_assignees`, `global_watcher`, `both` |
| `--global-watcher <userId>` | ID пользователя Linear для назначения глобальным наблюдателем |
| `--unmatched-user <strategy>` | Действие при ненайденном пользователе: `unassigned` (по умолчанию), `skip`, `abort` |
| `--column-mapping <json>` | JSON-строка сопоставления колонок (напр. `'{"col_1":"st_1"}'`) |
| `--user-mapping <json>` | JSON-строка сопоставления пользователей (напр. `'{"usr_w":"usr_lin"}'`) |

---

## 🗺️ Таблица сопоставления данных (Mapping)

### Приоритеты:
| WEEEK Приоритет | Linear Приоритет | Примечание |
| :--- | :--- | :--- |
| `0` (Low) | `4` (Low) | Прямое соответствие |
| `1` (Medium) | `3` (Medium) | Прямое соответствие |
| `2` (High) | `2` (High) | Прямое соответствие |
| `3` (Hold) | `0` (No priority) | Назначается специальная метка `hold` |

### Канбан-колонки и статусы:
| WEEEK Колонка / Статус | Linear Workflow State Type | Действие по умолчанию |
| :--- | :--- | :--- |
| `💡 Важное` / `Бэклог` | `backlog` | Авто-сопоставление или создание |
| `⏱ Запланировано` / `Todo` | `unstarted` | Авто-сопоставление или создание |
| `👾 В работе` / `In Progress` | `started` | Авто-сопоставление или создание |
| `❓ Тестирование` / `QA` / `Review` | `started` (имя: Review/QA) | Авто-сопоставление или создание |
| `⁉️ Доработать` | `started` | Авто-сопоставление или создание |
| `‼️ Закрыто` / `Done` | `completed` | Авто-сопоставление или создание |
| `📁 Архив` / `Canceled` | `canceled` / `completed` | Авто-сопоставление или создание |

---

## 🧪 Тестирование и проверка качества

```bash
# Проверка типов TypeScript
pnpm typecheck

# Запуск линтера ESLint
pnpm lint

# Запуск набора тестов Vitest
pnpm test

# Сборка дистрибутива
pnpm build
```

---

## 📚 Документация проекта

Подробная архитектурная документация доступна в каталоге `docs/`:
- [docs/UI_ARCHITECTURE.md](docs/UI_ARCHITECTURE.md) — Спецификация Web UI, дизайн-токенов и API сервера.
- [docs/API_ARCHITECTURE.md](docs/API_ARCHITECTURE.md) — Спецификация REST/GraphQL клиентов и обработки квот.
- [docs/MIGRATION_ARCHITECTURE.md](docs/MIGRATION_ARCHITECTURE.md) — 20-стадийный конвейер, статусы и стейт-машина.
- [docs/SECURITY_ARCHITECTURE.md](docs/SECURITY_ARCHITECTURE.md) — Threat Model (STRIDE) и Zero-Leak стандарты.
- [docs/CLI_ARCHITECTURE.md](docs/CLI_ARCHITECTURE.md) — Спецификация команд и терминального интерфейса.
- [docs/CHANGELOG.md](docs/CHANGELOG.md) — Журнал изменений проекта.

---

## 📄 Лицензия

Проект распространяется под открытой лицензией [GPL v3](LICENSE).

