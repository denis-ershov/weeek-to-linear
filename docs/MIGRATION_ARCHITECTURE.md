# Архитектура движка миграции (MIGRATION_ARCHITECTURE.md)

## 1. Введение и назначение

Движок миграции (`MigrationEngine`) управляет полным жизненным циклом переноса данных из WEEEK в Linear.
Главные архитектурные требования:
1. **Идемпотентность**: гарантированное отсутствие дубликатов при повторных запусках.
2. **Атомарность сохранения состояния**: сохранение маппинга сущностей сразу после успешного создания.
3. **Корректность иерархии**: 3-фазное разрешение связей родитель-подзадача.
4. **Режим Dry Run**: валидация и предварительный расчет без побочных эффектов.
5. **Поддержка возобновления (`--resume`)**.

---

## 2. Схема 20-стадийного конвейера миграции

```
 [1. Authenticate]
        ↓
 [2-5. Load WEEEK Data] (Projects, Tasks, Users, Tags)
        ↓
 [6-9. Load Linear Data] (Workspace, Teams, Users, Labels, Workflow States)
        ↓
 [10. Validate Mappings] (Preflight Verification)
        ↓  (если Dry Run — сформировать план и завершить)
 [11. Create Linear Projects]
        ↓
 [12. Create Linear Labels]
        ↓
 [13. Create Parent Issues] (parentId == null)
        ↓
 [14. Create Child Issues] (создание подзадач с привязкой к родителям)
        ↓
 [15. Apply Relations & Fallback Resolution]
        ↓
 [16-19. Apply Assignees, Labels, Statuses, Dates]
        ↓
 [20. Generate Reports] (JSON + Markdown)
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

### Защита от сбоев и перезаписи
Запись состояния осуществляется атомарно:
1. Сериализация в `.weeek-linear/state.json.tmp`.
2. Синхронизация на диск (`fs.renameSync`).

---

## 4. Разрешение иерархии (3-фазный алгоритм)

1. **Фаза 1 (Корневые задачи)**:
   - Фильтруются задачи с `parentId === null` или `parentId === undefined`.
   - Создаются в Linear и их ID фиксируются в `state.json`.
2. **Фаза 2 (Подзадачи первого и последующих уровней)**:
   - Задачи упорядочиваются по глубине вложенности (топологическая сортировка).
   - Создаются с указанием `parentId = state.tasks[task.parentId].linearIssueId`.
3. **Фаза 3 (Graceful Fallback)**:
   - Если родительская задача завершилась ошибкой или не найдена, подзадача создается как обычная независимая задача, а в отчет добавляется предупреждение `WARN: Cannot resolve parent for task ID ...`.

---

## 5. Правила маппинга данных

### Приоритеты
- WEEEK `0` (Low) $\rightarrow$ Linear `4` (Low)
- WEEEK `1` (Medium) $\rightarrow$ Linear `3` (Medium)
- WEEEK `2` (High) $\rightarrow$ Linear `2` (High)
- WEEEK `3` (Hold) $\rightarrow$ Linear `0` (No priority) + Label `hold`

### Статусы
- WEEEK `Not started` $\rightarrow$ Linear State с типом `backlog` / `unstarted`
- WEEEK `In progress` $\rightarrow$ Linear State с типом `started`
- WEEEK `Completed` $\rightarrow$ Linear State с типом `completed`

### Даты
- WEEEK `dateEnd` или `date` $\rightarrow$ Linear `dueDate` в формате `YYYY-MM-DD`.

### Описания
- WEEEK HTML/Markdown $\rightarrow$ Санитизированный Markdown с сохранением форматирования, ссылок и блоков кода.
