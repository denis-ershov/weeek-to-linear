import { CONSTANTS } from '../config/constants.js';
import type { WeeekPriority, LinearPriority } from './types.js';
import type { WeeekTask, WeeekProject } from '../clients/weeek/types.js';
import type {
  LinearWorkflowState,
  LinearUser,
  CreateIssueInput,
  CreateProjectInput,
} from '../clients/linear/types.js';
import { formatLinearDueDate } from '../utils/dates.js';
import { normalizeDescriptionToMarkdown } from '../utils/markdown.js';

export interface MappingContext {
  teamId: string;
  linearProjectId?: string | null;
  workflowStates: LinearWorkflowState[];
  linearUsers: LinearUser[];
  linearLabelsByName: Map<string, string>; // Map<labelNameLower, linearLabelId>
  tasksStateMap: Record<string, { linearIssueId: string }>;
  unmatchedUserStrategy?: 'unassigned' | 'skip' | 'abort';
}

export interface TaskMappingResult {
  createInput: CreateIssueInput;
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
 * Преобразование статуса WEEEK в соответствующий Linear WorkflowState ID
 */
export function mapStatus(
  isCompleted: boolean | undefined,
  workflowStates: LinearWorkflowState[],
  customStatusName?: string | null,
): string | undefined {
  if (workflowStates.length === 0) return undefined;

  // Если задано кастомное имя статуса, ищем точное или приближенное совпадение
  if (customStatusName) {
    const normalized = customStatusName.trim().toLowerCase();
    const found = workflowStates.find(
      s => s.name.toLowerCase() === normalized || s.type.toLowerCase() === normalized,
    );
    if (found) return found.id;
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
 * Сопоставление пользователя WEEEK с пользователем Linear по Email
 */
export function mapAssignee(
  rawAssignee: unknown,
  linearUsers: LinearUser[],
): { assigneeId?: string; warning?: string } {
  if (!rawAssignee) {
    return {};
  }

  let email: string | null = null;
  if (typeof rawAssignee === 'string') {
    email = rawAssignee.includes('@') ? rawAssignee.trim().toLowerCase() : null;
  } else if (typeof rawAssignee === 'object' && rawAssignee !== null) {
    const obj = rawAssignee as { email?: string };
    if (obj.email) {
      email = obj.email.trim().toLowerCase();
    }
  }

  if (!email) {
    return { warning: `Не удалось определить email пользователя WEEEK: ${JSON.stringify(rawAssignee)}` };
  }

  const matched = linearUsers.find(u => u.email.toLowerCase() === email);
  if (matched) {
    return { assigneeId: matched.id };
  }

  return { warning: `Пользователь с email "${email}" не найден в Linear организации` };
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

  // 3. Статус
  const stateId = mapStatus(weeekTask.isCompleted, context.workflowStates);

  // 4. Исполнитель
  let assigneeId: string | undefined;
  const firstAssignee = Array.isArray(weeekTask.assignees) && weeekTask.assignees.length > 0 ? weeekTask.assignees[0] : null;
  if (firstAssignee) {
    const assigneeMatch = mapAssignee(firstAssignee, context.linearUsers);
    if (assigneeMatch.assigneeId) {
      assigneeId = assigneeMatch.assigneeId;
    } else if (assigneeMatch.warning) {
      warnings.push(`Задача "${weeekTask.title}": ${assigneeMatch.warning}`);
      if (context.unmatchedUserStrategy === 'skip') {
        return {
          createInput: {} as CreateIssueInput,
          warnings,
          skip: true,
          needsHoldLabel,
        };
      }
    }
  }

  // 5. Метки (Labels)
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

  // 6. Родительская задача (Parent ID)
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
    warnings,
    skip: false,
    needsHoldLabel,
  };
}
