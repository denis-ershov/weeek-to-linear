import { CONSTANTS } from '../config/constants.js';
import type { WeeekPriority, LinearPriority, WatcherStrategy } from './types.js';
import type { WeeekTask, WeeekProject } from '../clients/weeek/types.js';
import type {
  LinearWorkflowState,
  LinearUser,
  CreateIssueInput,
  CreateProjectInput,
} from '../clients/linear/types.js';
import { formatLinearDueDate } from '../utils/dates.js';
import { normalizeDescriptionToMarkdown } from '../utils/markdown.js';
import { tf } from '../i18n/index.js';

export interface MappingContext {
  teamId: string;
  linearProjectId?: string | null;
  workflowStates: LinearWorkflowState[];
  linearUsers: LinearUser[];
  linearLabelsByName: Map<string, string>; // Map<labelNameLower, linearLabelId>
  tasksStateMap: Record<string, { linearIssueId: string }>;
  boardColumnMapping?: Record<string, string>; // weeekColumnId -> linearStateId
  userMapping?: Record<string, string>; // weeekUserIdOrEmail -> linearUserId | 'unassigned' | 'skip'
  watcherStrategy?: WatcherStrategy;
  globalWatcherUserId?: string;
  unmatchedUserStrategy?: 'unassigned' | 'skip' | 'abort';
}

export interface TaskMappingResult {
  createInput: CreateIssueInput;
  subscriberUserIds: string[];
  warnings: string[];
  skip: boolean;
  needsHoldLabel: boolean;
}

/**
 * Преобразование приоритета WEEEK в приоритет Linear
 * WEEEK: 0=Low, 1=Medium, 2=High, 3=Hold
 * Linear: 0=No priority, 1=Urgent, 2=High, 3=Medium, 4=Low
 */
export function mapPriority(priority?: number | WeeekPriority | null): {
  linearPriority: LinearPriority;
  needsHoldLabel: boolean;
} {
  if (priority === undefined || priority === null) {
    return { linearPriority: 0, needsHoldLabel: false };
  }

  const p = Number(priority);
  if (p === 3) {
    // В WEEEK 3 = Hold. В Linear нет приоритета Hold, назначается 0 (No priority) и специальный label
    return { linearPriority: 0, needsHoldLabel: true };
  }

  const mapped = CONSTANTS.PRIORITY_MAP[p as keyof typeof CONSTANTS.PRIORITY_MAP];
  return {
    linearPriority: (mapped !== undefined ? mapped : 0) as LinearPriority,
    needsHoldLabel: false,
  };
}

/**
 * Определение базового типа статуса Linear ('backlog' | 'unstarted' | 'started' | 'completed' | 'canceled')
 * на основе названия канбан-колонки WEEEK
 */
export function guessWorkflowStateType(
  columnName: string,
): 'backlog' | 'unstarted' | 'started' | 'completed' | 'canceled' {
  const lower = columnName.toLowerCase().trim();

  if (
    lower.includes('закрыт') ||
    lower.includes('done') ||
    lower.includes('завершен') ||
    lower.includes('готов')
  ) {
    return 'completed';
  }

  if (
    lower.includes('архив') ||
    lower.includes('отмен') ||
    lower.includes('cancel')
  ) {
    return 'canceled';
  }

  if (
    lower.includes('тест') ||
    lower.includes('qa') ||
    lower.includes('ревью') ||
    lower.includes('review') ||
    lower.includes('в работ') ||
    lower.includes('в процесс') ||
    lower.includes('доработ') ||
    lower.includes('in progress') ||
    lower.includes('doing')
  ) {
    return 'started';
  }

  if (
    lower.includes('важн') ||
    lower.includes('бэклог') ||
    lower.includes('backlog')
  ) {
    return 'backlog';
  }

  return 'unstarted';
}

/**
 * Умное сопоставление канбан-колонки WEEEK с Linear WorkflowState
 */
export function mapBoardColumnToWorkflowState(
  boardColumnId: string | null | undefined,
  boardColumnTitle: string | null | undefined,
  boardColumnMapping: Record<string, string> | undefined,
  workflowStates: LinearWorkflowState[],
): string | undefined {
  if (workflowStates.length === 0) return undefined;

  // 1. Прямой маппинг по ID колонки
  if (boardColumnId && boardColumnMapping && boardColumnMapping[String(boardColumnId)]) {
    const targetStateId = boardColumnMapping[String(boardColumnId)];
    const exists = workflowStates.some(s => s.id === targetStateId);
    if (exists) return targetStateId;
  }

  // 2. Эвристическое сопоставление по названию колонки
  if (boardColumnTitle) {
    const lower = boardColumnTitle.toLowerCase().trim();

    // Завершенные / Архив
    if (lower.includes('закрыт') || lower.includes('done') || lower.includes('завершен') || lower.includes('готов')) {
      const state = workflowStates.find(s => s.type.toLowerCase() === 'completed');
      if (state) return state.id;
    }

    if (lower.includes('архив') || lower.includes('отмен') || lower.includes('cancel')) {
      const state =
        workflowStates.find(s => s.type.toLowerCase() === 'canceled') ||
        workflowStates.find(s => s.type.toLowerCase() === 'completed');
      if (state) return state.id;
    }

    // В работе / Тестирование / Доработка
    if (lower.includes('тест') || lower.includes('qa') || lower.includes('ревью') || lower.includes('review')) {
      const state =
        workflowStates.find(s => s.name.toLowerCase().includes('review') || s.name.toLowerCase().includes('qa')) ||
        workflowStates.find(s => s.type.toLowerCase() === 'started');
      if (state) return state.id;
    }

    if (lower.includes('в работ') || lower.includes('в процесс') || lower.includes('доработ') || lower.includes('in progress') || lower.includes('doing')) {
      const state = workflowStates.find(s => s.type.toLowerCase() === 'started');
      if (state) return state.id;
    }

    // Запланировано / Бэклог / Важное
    if (lower.includes('план') || lower.includes('запланирован') || lower.includes('todo') || lower.includes('не начато')) {
      const state =
        workflowStates.find(s => s.type.toLowerCase() === 'unstarted') ||
        workflowStates.find(s => s.type.toLowerCase() === 'backlog');
      if (state) return state.id;
    }

    if (lower.includes('важн') || lower.includes('бэклог') || lower.includes('backlog')) {
      const state =
        workflowStates.find(s => s.type.toLowerCase() === 'backlog') ||
        workflowStates.find(s => s.type.toLowerCase() === 'unstarted');
      if (state) return state.id;
    }
  }

  return undefined;
}

/**
 * Преобразование статуса WEEEK в соответствующий Linear WorkflowState ID
 */
export function mapStatus(
  isCompleted: boolean | undefined,
  workflowStates: LinearWorkflowState[],
  boardColumnId?: string | null,
  boardColumnTitle?: string | null,
  boardColumnMapping?: Record<string, string>,
): string | undefined {
  if (workflowStates.length === 0) return undefined;

  // Сначала пробуем сопоставить по канбан-колонке
  if (boardColumnId || boardColumnTitle) {
    const colStateId = mapBoardColumnToWorkflowState(
      boardColumnId,
      boardColumnTitle,
      boardColumnMapping,
      workflowStates,
    );
    if (colStateId) return colStateId;
  }

  if (isCompleted) {
    const completedState =
      workflowStates.find(s => s.type.toLowerCase() === 'completed') ||
      workflowStates.find(s => s.name.toLowerCase().includes('done') || s.name.toLowerCase().includes('готов') || s.name.toLowerCase().includes('завершен'));
    if (completedState) return completedState.id;
  }

  // По умолчанию: Unstarted или Backlog
  const defaultState =
    workflowStates.find(s => s.type.toLowerCase() === 'unstarted') ||
    workflowStates.find(s => s.type.toLowerCase() === 'backlog') ||
    workflowStates[0];

  return defaultState?.id;
}

/**
 * Резолвинг пользователя WEEEK в Linear User ID с учетом персонального маппинга
 */
export function resolveAssignee(
  rawAssignee: unknown,
  linearUsers: LinearUser[],
  userMapping?: Record<string, string>,
): { assigneeId?: string; shouldSkip?: boolean; warning?: string } {
  if (!rawAssignee) {
    return {};
  }

  let userId: string | null = null;
  let email: string | null = null;

  if (typeof rawAssignee === 'string') {
    if (rawAssignee.includes('@')) {
      email = rawAssignee.trim().toLowerCase();
    } else {
      userId = rawAssignee.trim();
    }
  } else if (typeof rawAssignee === 'object' && rawAssignee !== null) {
    const obj = rawAssignee as { id?: string | number; email?: string };
    if (obj.id) userId = String(obj.id);
    if (obj.email) email = obj.email.trim().toLowerCase();
  }

  // 1. Проверка явного маппинга по ID или Email
  if (userMapping) {
    const mappingKey = (userId && userMapping[userId]) || (email && userMapping[email]);
    if (mappingKey) {
      if (mappingKey === 'unassigned') {
        return {};
      }
      if (mappingKey === 'skip') {
        return { shouldSkip: true };
      }
      // Проверяем существование в Linear
      const targetUser = linearUsers.find(u => u.id === mappingKey || u.email.toLowerCase() === mappingKey.toLowerCase());
      if (targetUser) {
        return { assigneeId: targetUser.id };
      }
    }
  }

  // 2. Поиск по Email в Linear
  if (email) {
    const matched = linearUsers.find(u => u.email.toLowerCase() === email);
    if (matched) {
      return { assigneeId: matched.id };
    }
    return { warning: tf('mapper.userNotFoundByEmail', email) };
  }

  return { warning: tf('mapper.userNotMapped', JSON.stringify(rawAssignee)) };
}

/**
 * Резолвинг списка наблюдателей (Subscribers)
 */
export function resolveSubscribers(
  rawAssignees: unknown[] | undefined,
  linearUsers: LinearUser[],
  userMapping: Record<string, string> | undefined,
  watcherStrategy: WatcherStrategy | undefined,
  globalWatcherUserId: string | undefined,
  primaryAssigneeId: string | undefined,
): string[] {
  const subscribersSet = new Set<string>();

  // 1. Глобальный наблюдатель (например, Team Lead)
  if (
    (watcherStrategy === 'global_watcher' || watcherStrategy === 'both') &&
    globalWatcherUserId
  ) {
    subscribersSet.add(globalWatcherUserId);
  }

  // 2. Вторичные исполнители из WEEEK
  if (
    (watcherStrategy === 'secondary_assignees' || watcherStrategy === 'both') &&
    Array.isArray(rawAssignees) &&
    rawAssignees.length > 1
  ) {
    // Пропускаем первого (он основной assignee)
    for (let i = 1; i < rawAssignees.length; i++) {
      const secAssignee = rawAssignees[i];
      const match = resolveAssignee(secAssignee, linearUsers, userMapping);
      if (match.assigneeId) {
        subscribersSet.add(match.assigneeId);
      }
    }
  }

  // Не подписываем основного исполнителя повторно
  if (primaryAssigneeId) {
    subscribersSet.delete(primaryAssigneeId);
  }

  return Array.from(subscribersSet);
}

/**
 * Преобразование проекта WEEEK в Linear CreateProjectInput
 */
export function mapProject(weeekProject: WeeekProject, teamId: string): CreateProjectInput {
  return {
    teamId,
    name: weeekProject.name.trim(),
    description: weeekProject.description ? normalizeDescriptionToMarkdown(weeekProject.description) : undefined,
  };
}

/**
 * Комплексное преобразование задачи WEEEK в CreateIssueInput Linear
 */
export function mapTask(weeekTask: WeeekTask, context: MappingContext): TaskMappingResult {
  const warnings: string[] = [];
  const { linearPriority, needsHoldLabel } = mapPriority(weeekTask.priority);

  // 1. Описание
  const description = normalizeDescriptionToMarkdown(weeekTask.description);

  // 2. Дедлайн (dueDate)
  const dueDate = formatLinearDueDate(weeekTask.dateEnd || weeekTask.date);
  if ((weeekTask.dateEnd || weeekTask.date) && !dueDate) {
    warnings.push(`Некорректный формат даты задачи ID ${weeekTask.id}: ${weeekTask.dateEnd || weeekTask.date}`);
  }

  // 3. Статус (с учетом канбан-колонки)
  const columnId = weeekTask.boardColumnId || weeekTask.columnId;
  const stateId = mapStatus(
    weeekTask.isCompleted,
    context.workflowStates,
    columnId,
    undefined,
    context.boardColumnMapping,
  );

  // 4. Исполнитель
  let assigneeId: string | undefined;
  const firstAssignee = Array.isArray(weeekTask.assignees) && weeekTask.assignees.length > 0 ? weeekTask.assignees[0] : null;
  if (firstAssignee) {
    const assigneeMatch = resolveAssignee(firstAssignee, context.linearUsers, context.userMapping);
    if (assigneeMatch.shouldSkip) {
      return {
        createInput: {} as CreateIssueInput,
        subscriberUserIds: [],
        warnings,
        skip: true,
        needsHoldLabel,
      };
    }
    if (assigneeMatch.assigneeId) {
      assigneeId = assigneeMatch.assigneeId;
    } else if (assigneeMatch.warning) {
      warnings.push(`Задача "${weeekTask.title}": ${assigneeMatch.warning}`);
      if (context.unmatchedUserStrategy === 'skip') {
        return {
          createInput: {} as CreateIssueInput,
          subscriberUserIds: [],
          warnings,
          skip: true,
          needsHoldLabel,
        };
      }
    }
  }

  // 5. Наблюдатели (Subscribers)
  const subscriberUserIds = resolveSubscribers(
    weeekTask.assignees,
    context.linearUsers,
    context.userMapping,
    context.watcherStrategy,
    context.globalWatcherUserId,
    assigneeId,
  );

  // 6. Метки (Labels)
  const labelIds: string[] = [];
  if (Array.isArray(weeekTask.tags)) {
    for (const tag of weeekTask.tags) {
      const tagTitle = typeof tag === 'string' ? tag : tag.title;
      if (tagTitle) {
        const lower = tagTitle.trim().toLowerCase();
        const existingLabelId = context.linearLabelsByName.get(lower);
        if (existingLabelId) {
          labelIds.push(existingLabelId);
        }
      }
    }
  }

  if (needsHoldLabel) {
    const holdLabelId = context.linearLabelsByName.get(CONSTANTS.HOLD_LABEL_NAME);
    if (holdLabelId && !labelIds.includes(holdLabelId)) {
      labelIds.push(holdLabelId);
    }
  }

  // 7. Родительская задача (Parent ID)
  let parentId: string | undefined;
  if (weeekTask.parentId) {
    const parentRecord = context.tasksStateMap[String(weeekTask.parentId)];
    if (parentRecord) {
      parentId = parentRecord.linearIssueId;
    }
  }

  const createInput: CreateIssueInput = {
    teamId: context.teamId,
    title: weeekTask.title.trim() || 'Без названия',
    description: description || undefined,
    priority: linearPriority,
    stateId,
    dueDate: dueDate || undefined,
    assigneeId,
    labelIds: labelIds.length > 0 ? labelIds : undefined,
    projectId: context.linearProjectId || undefined,
    parentId,
  };

  return {
    createInput,
    subscriberUserIds,
    warnings,
    skip: false,
    needsHoldLabel,
  };
}
