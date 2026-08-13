# WEEEK → Linear Migration Tool

[![CI](https://github.com/denis-ershov/weeek-to-linear/actions/workflows/ci.yml/badge.svg)](https://github.com/denis-ershov/weeek-to-linear/actions/workflows/ci.yml)
[![Version](https://img.shields.io/badge/version-0.3.3-blue.svg)](https://github.com/denis-ershov/weeek-to-linear)
[![License: GPL v3](https://img.shields.io/badge/License-GPL_v3-blue.svg)](https://www.gnu.org/licenses/gpl-3.0)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D22.0.0-green.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org/)

> 🇷🇺 **Русская версия**: [README.md](./README.md)

**WEEEK → Linear Migration Tool** is a professional open-source tool with **Web UI** and **CLI** support for the safe, idempotent, and reliable migration of projects, tasks, multi-level subtasks, kanban board columns, knowledge base documents, priorities, deadlines, labels, and assignees from **WEEEK** to **Linear** via official APIs.

---

## ✨ Key Features

- 🚀 **Comprehensive data migration**: automatic migration of projects, tasks, subtask hierarchy, priorities, deadlines, labels, and assignees.
- 💬 **Task comments migration**: *Temporarily disabled due to the lack of public REST task comment endpoints in official WEEEK API.*
- 📋 **WEEEK Custom Fields**:
  - Format text, select, numeric, and system custom fields into a structured Markdown block in issue description.
  - Configure mapping, renaming, or ignoring specific custom fields.
- 📋 **Smart Kanban Board & Column Migration**:
  - Automatic recognition of WEEEK columns and heuristic matching to Linear Workflow States.
  - **Auto-create missing states**: automatically create new Workflow States in Linear with the correct base type (`backlog`, `unstarted`, `started`, `completed`, `canceled`) and color.
  - **Rename states**: option to rename matched Linear states to the exact names and colors from WEEEK.
  - **Full replacement (1-to-1)**: archive extra default Linear states and recreate the exact WEEEK column structure.
- ⚠️ **Knowledge Base document migration**: *Temporarily disabled due to the lack of public REST document endpoints in official WEEEK API.*
- 👥 **Personal user mapping (Assignees)**:
  - Automatic matching by Email.
  - Individual selector per team member with Fallback support (`unassigned`, `skip`, assign to a specific user).
- 👁️ **Flexible subscriber (Watcher) assignment**:
  - `none`: no additional subscribers;
  - `secondary_assignees`: WEEEK secondary assignees become Linear subscribers;
  - `global_watcher`: assign a responsible team member (Team Lead / PM) to all issues;
  - `both`: combination of secondary assignees and global watcher.
- 🔁 **Idempotency and re-sync strategies**:
  - State saved in `.weeek-linear/state.json`.
  - Sync modes: `skip` (skip already migrated), `update_all` (full update), `update_status_only` (update status and priority only).
- 💻 **Visual Web UI**: sleek interface inspired by **Linear / Vercel** with Mobile-First responsiveness, card-based layout, and live SSE progress streaming.
- 🌐 **Multilingual (ru / en)**: language selector in Web UI, `--lang` flag in CLI, auto-detection from system locale.
- 🔒 **Security-First (Zero Leak)**: local execution, token masking in logs (`[REDACTED]`), strict security policies.
- 🧪 **Dry-run mode (`--dry-run`)**: validate and pre-calculate without making changes in Linear.
- 🛡️ **API resilience**: exponential retry with jitter, strict rate-limiting and automatic `Retry-After` header handling (HTTP 429).
- 📊 **Automatic reports**: detailed migration audit in `migration-report.md` (Markdown with tables) and `migration-report.json`.

---

## 🏗️ Data Transfer Architecture

```
WEEEK (REST API)
   ↓  (Projects, tasks, kanban columns, documents, labels, users)
Data Mapper & Sanitizer
   ↓  (HTML/Markdown transform, dates, statuses, priorities, assignees)
3-Phase Relationship Resolver & State Engine
   ↓  (1. Parents → 2. Subtasks → 3. Documents → 4. Subscribers)
Linear (GraphQL API)
   ↓
.weeek-linear/state.json + migration-report.md
```

---

## ⚡ Quick Start

### 1. Launch the visual Web UI

```bash
npx weeek-to-linear ui
```
> Opens the web interface at `http://localhost:3456` with a step-by-step wizard for configuring columns, users, and options.

---

### 2. Run the interactive CLI

```bash
npx weeek-to-linear
```

---

### 3. Local installation from repository

```bash
# Clone the repository
git clone https://github.com/denis-ershov/weeek-to-linear.git
cd weeek-to-linear

# Install dependencies
pnpm install

# Set up environment variables (optional)
cp .env.example .env
```

Edit `.env` if needed:
```env
WEEEK_API_TOKEN=your_weeek_token
LINEAR_API_TOKEN=your_linear_token
```

### Start Web UI:
```bash
pnpm dev ui
```

### Run interactive migration:
```bash
pnpm cli migrate
```

---

## 🔑 Getting API Tokens

### WEEEK API Token:
1. Log into your **WEEEK** account.
2. Go to **Profile Settings** → **API**.
3. Create a new access token and copy it.

### Linear API Token:
1. Log into **Linear**.
2. Go to **Settings** → **Account** → **Security** ([linear.app/settings/account/security](https://linear.app/settings/account/security)).
3. Under **Personal API keys**, create a new key (e.g., `Migration Tool`) and save it.

---

## 📋 CLI Commands & Flags Reference

### Commands:
| Command | Description |
| :--- | :--- |
| `weeek-to-linear ui` (or `web`) | Launch the local visual web interface |
| `weeek-to-linear auth:test` | Verify WEEEK and Linear token validity and display account info |
| `weeek-to-linear weeek:projects` | Table of all projects in the WEEEK workspace |
| `weeek-to-linear linear:teams` | List available Linear teams and their keys |
| `weeek-to-linear migrate [options]` | Run the interactive wizard or non-interactive migration |

### Full list of `migrate` flags:
| Flag | Description |
| :--- | :--- |
| `-d, --dry-run` | Dry-run mode: validate and calculate without changing data in Linear |
| `-l, --lang <ru\|en>` | CLI interface language (`ru` or `en`, default `ru` or from `WEEEK_LANG`) |
| `-r, --resume` | Resume migration from the last stop point |
| `-f, --force` | Force restart with cleared saved state |
| `-p, --weeek-project <id>` | Non-interactive migration of a specific WEEEK project |
| `-t, --linear-team <key>` | Non-interactive Linear team selection (e.g., `ENG`) |
| `--create-missing-states` | Automatically create missing workflow states in Linear |
| `--rename-matched-states` | Rename matched Linear states to WEEEK format |
| `--recreate-columns` | Full replacement: archive extra states and recreate structure 1-to-1 |
| `--no-completed` | Exclude completed tasks from migration |
| `--no-docs` | Skip documents *(disabled due to missing WEEEK API)* |
| `--include-deleted` | Include deleted WEEEK tasks in migration |
| `--sync-strategy <strategy>` | Re-run behavior: `skip` (default), `update_all`, `update_status_only` |
| `--custom-fields-strategy <strategy>` | Custom fields strategy: `append_to_description` (default), `none` |
| `--custom-fields-mapping <json>` | JSON custom fields mapping string |
| `--ignore-custom-fields <list>` | Comma-separated list of custom field names/IDs to skip |
| `--watcher-strategy <strategy>` | Subscriber strategy: `none`, `secondary_assignees`, `global_watcher`, `both` |
| `--global-watcher <userId>` | Linear user ID to assign as global watcher |
| `--unmatched-user <strategy>` | Action for unmatched users: `unassigned` (default), `skip`, `abort` |
| `--column-mapping <json>` | JSON column mapping string (e.g. `'{"col_1":"st_1"}'`) |
| `--user-mapping <json>` | JSON user mapping string (e.g. `'{"usr_w":"usr_lin"}'`) |

---

## 🗺️ Data Mapping Table

### Priorities:
| WEEEK Priority | Linear Priority | Note |
| :--- | :--- | :--- |
| `0` (Low) | `4` (Low) | Direct match |
| `1` (Medium) | `3` (Medium) | Direct match |
| `2` (High) | `2` (High) | Direct match |
| `3` (Hold) | `0` (No priority) | A `hold` label is assigned |

### Kanban columns and statuses:
| WEEEK Column / Status | Linear Workflow State Type | Default Action |
| :--- | :--- | :--- |
| `💡 Important` / `Backlog` | `backlog` | Auto-match or create |
| `⏱ Planned` / `Todo` | `unstarted` | Auto-match or create |
| `👾 In Progress` | `started` | Auto-match or create |
| `❓ Testing` / `QA` / `Review` | `started` (name: Review/QA) | Auto-match or create |
| `⁉️ Rework` | `started` | Auto-match or create |
| `‼️ Closed` / `Done` | `completed` | Auto-match or create |
| `📁 Archive` / `Canceled` | `canceled` / `completed` | Auto-match or create |

---

## 🌐 Multilingual Support

The tool supports **Russian** and **English**:

- **Web UI**: click the `RU | EN` toggle in the header. The choice is saved in `localStorage`.
- **CLI**: use the `--lang ru` or `--lang en` flag, or set the `WEEEK_LANG=en` environment variable.
- **Auto-detection**: if no explicit language is set, the system locale (`LANG`, `LC_ALL`) is used. Default is Russian.

---

## 🧪 Testing & Quality

```bash
# TypeScript type check
pnpm typecheck

# ESLint linter
pnpm lint

# Run Vitest test suite
pnpm test

# Build distribution
pnpm build
```

---

## 📚 Project Documentation

Detailed architecture documentation is available in the `docs/` directory:
- [docs/UI_ARCHITECTURE.md](docs/UI_ARCHITECTURE.md) — Web UI, design tokens, and server API spec.
- [docs/API_ARCHITECTURE.md](docs/API_ARCHITECTURE.md) — REST/GraphQL client and quota handling spec.
- [docs/MIGRATION_ARCHITECTURE.md](docs/MIGRATION_ARCHITECTURE.md) — Multi-stage pipeline, statuses, and state machine.
- [docs/SECURITY_ARCHITECTURE.md](docs/SECURITY_ARCHITECTURE.md) — Threat Model (STRIDE) and Zero-Leak standards.
- [docs/CLI_ARCHITECTURE.md](docs/CLI_ARCHITECTURE.md) — CLI commands and terminal interface spec.
- [docs/CHANGELOG.md](docs/CHANGELOG.md) — Project change log.

---

## 💖 Support the Project

If this tool saved you time and helped you migrate from WEEEK to Linear, consider supporting the author:

- 🎁 [**DonationAlerts**](https://www.donationalerts.com/r/i_w1ns_i)
- ☕ [**Buy Me a Coffee**](https://buymeacoffee.com/it.dns)

---

## 📄 License

This project is distributed under the open [GPL v3](LICENSE) license.
