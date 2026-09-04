# Архитектура движка миграции (MIGRATION_ARCHITECTURE.md)

## 1. Введение и назначение

Движок миграции (`MigrationEngine`) управляет полным жизненным циклом переноса данных из WEEEK в Linear.
Главные архитектурные требования:

1. **Идемпотентность и гибкая синхронизация**: поддержка стратегий повторного запуска (`skip`, `update_all`, `update_status_only`).
2. **Точный перенос Канбан-досок**: сопоставление кастомных колонок WEEEK (`💡 Важное`, `⏱ Запланировано`, `👾 В работе`, `❓ Тестирование`, `⁉️ Доработать`, `‼️ Закрыто`, `📁 Архив`) с Workflow States Linear.
3. **Перенос базы знаний (Knowledge Base)**: миграция документов WEEEK в Linear Project Documents.
4. **Персональный маппинг исполнителей и наблюдателей**: гибкий выбор исполнителя Linear для каждого пользователя WEEEK, а также подписка наблюдателей (`Subscribers`).
5. **Атомарность сохранения состояния**: сохранение маппинга сущностей сразу после успешного создания.
6. **Корректность иерархии**: 3-фазное разрешение связей родитель-подзадача.
7. **Режим Dry Run**: валидация и предварительный расчет без побочных эффектов.

---

## 2. Схема расширенного конвейера миграции

```
 [1. Authenticate]
        ↓
 [2-5. Load WEEEK Data] (Projects, Board Columns, Tasks, Documents, Users, Tags)
        ↓
 [6-9. Load Linear Data] (Workspace, Teams, Users, Labels, Workflow States, Existing Projects)
        ↓
 [10. Validate Mappings] (Preflight Verification)
        ↓  (если Dry Run — сформировать план и завершить)
 [11. Create Linear Projects]
        ↓
 [12. Migrate Documents] (WEEEK Knowledge Base → Linear Project Documents)
        ↓
 [13. Create Linear Labels] (Tags + 'hold' label)
        ↓
 [14. Create Parent Issues] (parentId == null, маппинг колонок и исполнителей)
        ↓
 [15. Create Child Issues] (создание подзадач с привязкой к родителям)
        ↓
 [16. Subscribe Watchers] (подписка наблюдателей по стратегии: secondary_assignees / global_watcher / both)
        ↓
 [17. Apply Re-migration Strategy] (если задача уже перенесена: skip / update_all / update_status_only)
        ↓
 [18. Generate Reports] (JSON + Markdown)
```

---

## 3. Сохранение состояния (`.weeek-linear/state.json`)

Схема файла состояния:

```json
{
  "version": 1,
  "source": "weeek",
  "target": "linear",
  "startedAt": "2026-08-12T10:00:00.000Z",
  "updatedAt": "2026-08-12T10:05:00.000Z",
  "targetTeamId": "lin_team_123",
  "projects": {
    "123": {
      "linearProjectId": "lin_prj_abc",
      "name": "Media Hub",
      "migratedAt": "2026-08-12T10:01:00.000Z"
    }
  },
  "documents": {
    "doc_50": {
      "linearDocId": "lin_doc_999",
      "title": "Architecture Overview",
      "migratedAt": "2026-08-12T10:01:30.000Z"
    }
  },
  "labels": {
    "tag_10": {
      "linearLabelId": "lin_lbl_xyz",
      "name": "backend"
    }
  },
  "users": {
    "alex@example.com": {
      "linearUserId": "lin_usr_456",
      "name": "Alex"
    }
  },
  "boardColumns": {
    "col_qa": {
      "linearStateId": "lin_state_review",
      "name": "❓ Тестирование"
    }
  },
  "tasks": {
    "456": {
      "linearIssueId": "lin_iss_789",
      "linearIssueKey": "ENG-123",
      "title": "Build parser",
      "migratedAt": "2026-08-12T10:02:00.000Z"
    }
  }
}
```

---

## 4. Правила маппинга данных

### Канбан-колонки WEEEK $\rightarrow$ Linear Workflow States

1. **Явный маппинг пользователя**: настройки из Web UI или конфигурации имеют наивысший приоритет.
2. **Опциональное создание отсутствующих статусов (`--create-missing-states` / `__create_new__`)**:
   - Если статус в Linear отсутствует, движок автоматически создает новый Workflow State через GraphQL мутацию `linearClient.createWorkflowState({ teamId, name, type, color })`.
   - Базовый тип (`backlog`, `unstarted`, `started`, `completed`, `canceled`) вычисляется функцией `guessWorkflowStateType(name)`.
3. **Эвристический подбор**:
   - `💡 Важное / Бэклог` $\rightarrow$ State с типом `backlog` / `unstarted`.
   - `⏱ Запланировано / Todo` $\rightarrow$ State с типом `unstarted`.
   - `👾 В работе / In Progress` $\rightarrow$ State с типом `started`.
   - `❓ Тестирование / QA / Review` $\rightarrow$ State с именем `Review`/`QA` или типом `started`.
   - `⁉️ Доработать` $\rightarrow$ State с типом `started`.
   - `‼️ Закрыто / Done` $\rightarrow$ State с типом `completed`.
   - `📁 Архив / Canceled` $\rightarrow$ State с типом `canceled` или `completed`.

### Персональный маппинг пользователей (Assignees)

- **Поиск по Email**: автоматическое сопоставление пользователей с одинаковым email.
- **Индивидуальный селектор**: возможность явно назначить любого сотрудника Linear для каждого пользователя WEEEK.
- **Fallback стратегии**:
  - `unassigned`: задача создается без исполнителя (рекомендуется);
  - `skip`: задачи этого пользователя пропускаются;
  - `abort`: миграция прерывается при отсутствии соответствия.

### Наблюдатели (Subscribers / Watchers)

- `none`: без назначения дополнительных наблюдателей.
- `secondary_assignees`: 2-й и последующие исполнители WEEEK подписываются как наблюдатели в Linear.
- `global_watcher`: выбранный сотрудник (Team Lead / PM) подписывается ко всем создаваемым задачам.
- `both`: комбинация вторичных исполнителей и глобального наблюдателя.

### Стратегии повторного запуска (Sync Strategy)

- `skip`: пропуск уже перенесенных задач (по умолчанию).
- `update_all`: полное обновление названия, описания, статуса, приоритета, дедлайна, комментариев и исполнителя.
- `update_status_only`: обновление только статуса, дедлайна и приоритета (сохраняя пользовательские правки в Linear).
- `update_comments_only`: обновление исключительно комментариев без перезаписи полей задач.

---

## 5. Гибкий движок маршрутизации (Flexible Routing Engine)

### 5.1. Маршрутизация пользователей и создателей задач (User & Role Routing)

- **Fallback Assignee (`fallbackAssignee`)**:
  - `unassigned`: задача создается без исполнителя (по умолчанию);
  - `creator`: если исполнитель не указан, исполнителем становится автор задачи из WEEEK (при наличии сопоставления в Linear);
  - `specific_user`: назначение конкретного дефолтного сотрудника Linear (`fallbackAssigneeUserId`).
- **Атрибуция авторов задач (`creatorStrategy`)**:
  - `header`: включение блока цитаты в начале описания (`> 👤 **Создатель задачи (WEEEK):** ...`);
  - `subscriber`: добавление сопоставленного автора задачи в наблюдатели (`subscribers`);
  - `both`: цитата в описании + добавление в наблюдатели Linear;
  - `none`: отключение дополнительного учета автора.

### 5.2. Маршрутизация комментариев (Comment Routing Engine)

- **Режимы авторизации Linear API (Personal API Key vs OAuth App)**:
  - Согласно официальной документации Linear API (`https://linear.app/developers/oauth-actor-authorization`), мутации `commentCreate` с атрибутом `createAsUser` разрешены **только** в режиме `OAuth actor=app`.
  - При использовании стандартного **Personal API Key** (`lin_api_*`) передача `createAsUser` запрещена и возвращает ошибку `createAsUser used without OAuth actor=app mode`.
  - `LinearClient` автоматически определяет тип токена (`!apiToken.startsWith('lin_api_')`) и метод `canUseCreateAsUser()`. Для Personal API Key вызов `createAsUser` блокируется, а автор комментария и привязанный аккаунт Linear гарантированно включаются в Markdown-шапку:
    `> 💬 **Andrey Dobryy** (Linear: Andrey Dobryy) _(04.09.2026, 18:27)_:`
  - Если запрос с `createAsUser` отклоняется Linear API, срабатывает мгновенный безотказный **fallback** (создание комментария без `createAsUser` с сохранением автора в тексте) с автоматическим переключением клиента в стандартный режим для последующих комментариев.
- **Предотвращение зависаний ретраев (`withRetry`)**:
  - Ошибки несовместимости прав и режимов авторизации Linear (`actor=app`, `createAsUser`) помечены как фатальные (non-retryable), что исключает 20-секундные задержки и блокировку конвейера.
- **Автоподписка авторов комментариев (`subscribeCommentAuthors`)**:
  - При переносе комментария сопоставленный автор автоматически добавляется в список подписчиков задачи (`linearClient.subscribeUser(issueId, targetUserId)`).
  - Позволяет участникам дискуссии в WEEEK продолжать получать уведомления об ответах в Linear.
- **Фильтрация системных комментариев (`commentFilterStrategy: exclude_system`)**:
  - Автоматический отсев технических сообщений (изменение статусов, сроков, ответственных), чтобы не засорять историю обсуждений в Linear.
- **Резервный автор комментариев (`fallbackCommentAuthor`)**:
  - `use_name`: вывод оригинального имени автора из WEEEK в заголовке комментария;
  - `specific_user`: привязка всех несопоставленных комментариев к выбранному сотруднику Linear (`fallbackCommentUserId`);
  - `bot_label`: отправка от имени `WEEEK Bot`.

### 5.3. Маршрутизация проектов в команды Linear (`projectTeamMapping`)

- Возможность индивидуального сопоставления каждого проекта WEEEK с отдельной целевой командой Linear (`Record<weeekProjectId, linearTeamId>`).

### 5.4. Условные правила маршрутизации (Task Routing Rules)

Декларативные правила, применяемые в процессе преобразования задач `mapTask`:

```ts
interface TaskRoutingRule {
  id: string;
  condition: {
    field: 'tag' | 'column' | 'priority' | 'assignee';
    operator: 'equals' | 'contains';
    value: string;
  };
  action: {
    setAssigneeId?: string;
    addSubscriberId?: string;
    addLabelId?: string;
    setPriority?: number;
    targetTeamId?: string;
  };
}
```
