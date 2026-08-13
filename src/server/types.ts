/**
 * Типы данных и DTO для веб-сервера и SSE-стриминга сервиса weeek-to-linear.
 */

import type { MigrationSummary, WatcherStrategy, SyncStrategy, CommentStrategy, CustomFieldsStrategy } from '../core/types.js';

export interface ServerStatusResponse {
  ok: boolean;
  version: string;
  hasEnvTokens: {
    weeek: boolean;
    linear: boolean;
  };
  defaultConfig: {
    logLevel: string;
    concurrency: number;
    stateFile: string;
  };
}

export interface AuthTestRequest {
  weeekToken: string;
  linearToken: string;
}

export interface AuthTestResponse {
  success: boolean;
  weeekUser?: {
    id: string;
    name: string;
    email: string;
  };
  linearViewer?: {
    id: string;
    name: string;
    email: string;
    organizationName?: string;
  };
  error?: string;
}

export interface StartMigrationRequest {
  weeekToken?: string;
  linearToken?: string;
  weeekProjectId?: string;
  linearTeamKey: string;
  dryRun?: boolean;
  resume?: boolean;
  force?: boolean;
  includeCompleted?: boolean;
  includeDeleted?: boolean;
  includeDocuments?: boolean;
  createMissingStates?: boolean;
  renameMatchedStates?: boolean;
  recreateAllColumns?: boolean;
  boardColumnMapping?: Record<string, string>;
  userMapping?: Record<string, string>;
  watcherStrategy?: WatcherStrategy;
  globalWatcherUserId?: string;
  syncStrategy?: SyncStrategy;
  commentStrategy?: CommentStrategy;
  customFieldsStrategy?: CustomFieldsStrategy;
  customFieldsMapping?: Record<string, string>;
  ignoredCustomFields?: string[];
  unmatchedUserStrategy?: 'unassigned' | 'skip' | 'abort';
}

/**
 * Типы событий Server-Sent Events (SSE)
 */
export type SseEventType =
  | 'stage'
  | 'progress'
  | 'warning'
  | 'error'
  | 'done'
  | 'aborted'
  | 'heartbeat';

export interface SseEventData {
  type: SseEventType;
  stageNumber?: number;
  stageName?: string;
  progressType?: 'projects' | 'labels' | 'tasks' | 'documents';
  current?: number;
  total?: number;
  itemName?: string;
  message?: string;
  error?: {
    entityType: string;
    entityId: string;
    message: string;
  };
  summary?: MigrationSummary;
  reportPaths?: {
    json: string;
    markdown: string;
  };
  timestamp: string;
}
