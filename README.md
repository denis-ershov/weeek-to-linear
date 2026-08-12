# WEEEK → Linear Migration Tool

[![CI](https://github.com/denis-ershov/weeek-to-linear/actions/workflows/ci.yml/badge.svg)](https://github.com/denis-ershov/weeek-to-linear/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D22.0.0-green.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org/)

**WEEEK → Linear Migration Tool** — профессиональный open-source инструмент с поддержкой **Web UI** и **CLI** для безопасного, идемпотентного и надежного переноса проектов, задач, подзадач, статусов, меток, дедлайнов и исполнителей из **WEEEK** в **Linear** через официальные API.

---

## ✨ Ключевые возможности

- 🚀 **Комплексный перенос данных**: автоматическая миграция проектов, задач, многоуровневых подзадач, приоритетов, дедлайнов, тегов и исполнителей.
- 💻 **Визуальный Web UI**: удобный веб-интерфейс в стиле **Linear / Vercel** с Mobile-First адаптивностью, живым SSE-мониторингом прогресса и карточками сущностей.
- 🔒 **Security-First (Zero Leak)**: локальное выполнение на вашем компьютере, автоматическое маскирование токенов в логах (`[REDACTED]`), строгие политики безопасности.
- 🔁 **Идемпотентность и Resume**: сохранение состояния в `.weeek-linear/state.json` — при повторном запуске дубликаты **не создаются**, а прерванная миграция продолжается с момента остановки (`--resume`).
- 🧪 **Режим симуляции (`--dry-run`)**: предстартовая валидация и предварительный расчет связей без изменения данных в Linear.
- 🛡️ **Отказоустойчивость API**: экспоненциальный retry с джиттером, строгий rate-limiting и автоматический учет заголовка `Retry-After` (HTTP 429).
- 📊 **Автоматические отчеты**: генерация детального аудита миграции в форматах `migration-report.md` (Markdown с таблицами) и `migration-report.json`.
- 🎨 **Современный интерактивный CLI**: стильный терминальный визард в духе Linear/Raycast с подсветкой, индикаторами прогресса и подсказками.

---

## 🏗️ Архитектура переноса данных

```
WEEEK (REST API)
   ↓  (Аутентификация, проекты, задачи, теги, пользователи)
Data Mapper & Sanitizer
   ↓  (Трансформация HTML/Markdown, дат, статусов и приоритетов)
3-Phase Relationship Resolver
   ↓  (1. Родители -> 2. Подзадачи -> 3. Связывание parentId)
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
> Откроется веб-интерфейс на `http://localhost:3456` с пошаговым мастером миграции.

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

### Проверка подключения через CLI:
```bash
pnpm cli auth:test
```

### Тестовый прогон (Dry Run):
```bash
pnpm cli migrate --dry-run
```

### Запуск миграции:
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

### Флаги команды `migrate`:
| Флаг | Описание |
| :--- | :--- |
| `-d, --dry-run` | Симуляция миграции без внесения изменений в Linear |
| `-r, --resume` | Продолжить миграцию с момента последней остановки |
| `-f, --force` | Принудительный перезапуск с очисткой сохраненного состояния |
| `-p, --weeek-project <id>` | Неинтерактивный перенос конкретного проекта WEEEK |
| `-t, --linear-team <key>` | Неинтерактивный выбор команды Linear (например, `ENG`) |
| `--no-completed` | Исключить завершенные задачи из миграции |
| `--include-deleted` | Включить удаленные задачи в перенос |
| `--unmatched-user <strategy>` | Поведение при ненайденном пользователе: `unassigned` (по умолчанию), `skip`, `abort` |

---

## 🗺️ Таблица сопоставления данных (Mapping)

### Приоритеты:
| WEEEK Приоритет | Linear Приоритет | Примечание |
| :--- | :--- | :--- |
| `0` (Low) | `4` (Low) | Прямое соответствие |
| `1` (Medium) | `3` (Medium) | Прямое соответствие |
| `2` (High) | `2` (High) | Прямое соответствие |
| `3` (Hold) | `0` (No priority) | Назначается специальная метка `hold` |

### Статусы:
| WEEEK Статус | Linear Workflow State |
| :--- | :--- |
| `Not started` / `Не начато` | `Backlog` / `Unstarted` |
| `In progress` / `В работе` | `Started` |
| `Completed` / `Завершено` | `Completed` (`Done`) |

### Пользователи:
- Сопоставление производится автоматически по **Email** адресу.
- Если пользователь не найден в Linear, задача создается без исполнителя (либо пропускается при `--unmatched-user skip`).

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
- [docs/MIGRATION_ARCHITECTURE.md](docs/MIGRATION_ARCHITECTURE.md) — 20-стадийный конвейер и стейт-машина.
- [docs/SECURITY_ARCHITECTURE.md](docs/SECURITY_ARCHITECTURE.md) — Threat Model (STRIDE) и Zero-Leak стандарты.
- [docs/CLI_ARCHITECTURE.md](docs/CLI_ARCHITECTURE.md) — Спецификация команд и терминального интерфейса.
- [docs/CHANGELOG.md](docs/CHANGELOG.md) — Журнал изменений проекта.

---

## 📄 Лицензия

Проект распространяется под открытой лицензией [MIT](LICENSE).
