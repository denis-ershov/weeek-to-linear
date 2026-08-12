/**
 * Доменные типы данных для сервиса WEEEK → Linear Migration Tool.
 * Строгая типизация с использованием брендированных типов для предотвращения ошибок смешивания ID.
 */

export type WeeekId = string & { readonly __brand: unique symbol };
export type WeeekProjectId = string & { readonly __brand: unique symbol };
export type WeeekTaskId = string & { readonly __brand: unique symbol };
export type WeeekTagId = string & { readonly __brand: unique symbol };
export type WeeekUserId = string & { readonly __brand: unique symbol };

export type LinearId = string & { readonly __brand: unique symbol };
export type LinearProjectId = string & { readonly __brand: unique symbol };
export type LinearIssueId = string & { readonly __brand: unique symbol };
export type LinearLabelId = string & { readonly __brand: unique symbol };
export type LinearUserId = string & { readonly __brand: unique symbol };
export type LinearTeamId = string & { readonly __brand: unique symbol };
export type LinearWorkflowStateId = string & { readonly __brand: unique symbol };

export const makeWeeekId = <T extends string>(id: string | number): T => String(id) as T;
export const makeLinearId = <T extends string>(id: string): T => id as T;

/**
 * Приоритеты WEEEK:
 * 0 = Low, 1 = Medium, 2 = High, 3 = Hold
 */
export type WeeekPriority = 0 | 1 | 2 | 3;

/**
 * Приоритеты Linear:
 * 0 = No priority, 1 = Urgent, 2 = High, 3 = Medium, 4 = Low
 */
export type LinearPriority = 0 | 1 | 2 | 3 | 4;

/**
 * Интерфейс состояния миграции (.weeek-linear/state.json)
 */
export interface MigrationState {
  version: number;
  source: 'weeek';
  target: 'linear';
  startedAt: string;
  updatedAt: string;
  targetTeamId?: string;
  projects: Record<
    string,
    {
      linearProjectId: string;
      name: string;
      migratedAt: string;
    }
  >;
  labels: Record<
    string,
    {
      linearLabelId: string;
      name: string;
    }
  >;
  users: Record<
    string,
    {
      linearUserId: string;
      name: string;
    }
  >;
  tasks: Record<
    string,
    {
      linearIssueId: string;
      linearIssueKey?: string;
      title: string;
      parentId?: string | null;
      migratedAt: string;
    }
  >;
}

/**
 * Конфигурация запуска миграции
 */
export interface MigrationOptions {
  weeekProjectId?: string;
  linearTeamKey?: string;
  dryRun?: boolean;
  resume?: boolean;
  force?: boolean;
  includeCompleted?: boolean;
  includeDeleted?: boolean;
  logLevel?: 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'silent';
  unmatchedUserStrategy?: 'unassigned' | 'skip' | 'abort';
}

/**
 * Результат валидации перед стартом миграции
 */
export interface PreflightValidationResult {
  isValid: boolean;
  projectsCount: number;
  tasksCount: number;
  usersCount: number;
  labelsCount: number;
  warnings: string[];
  errors: string[];
}

/**
 * Итоговая статистика и отчет миграции
 */
export interface MigrationSummary {
  startedAt: string;
  finishedAt: string;
  durationSeconds: number;
  projects: {
    total: number;
    created: number;
    skipped: number;
    failed: number;
  };
  tasks: {
    total: number;
    created: number;
    skipped: number;
    failed: number;
    parentsResolved: number;
    parentsFailed: number;
  };
  labels: {
    total: number;
    created: number;
    reused: number;
  };
  warnings: string[];
  errors: Array<{
    entityType: 'project' | 'task' | 'label' | 'relation' | 'auth';
    entityId: string;
    message: string;
    recoverable: boolean;
  }>;
}
