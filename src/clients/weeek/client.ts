import type PQueue from 'p-queue';
import { CONSTANTS } from '../../config/constants.js';
import { logger } from '../../utils/logger.js';
import { t, tf } from '../../i18n/index.js';
import { ApiError, withRetry } from '../../utils/retry.js';
import { createConcurrencyQueue } from '../../utils/queue.js';
import {
  WeeekProjectSchema,
  WeeekBoardSchema,
  WeeekTaskSchema,
  WeeekUserSchema,
  WeeekTagSchema,
  WeeekBoardColumnSchema,
  WeeekDocumentSchema,
  WeeekCommentSchema,
} from './schemas.js';
import type {
  WeeekProject,
  WeeekBoard,
  WeeekTask,
  WeeekUser,
  WeeekTag,
  WeeekBoardColumn,
  WeeekDocument,
  WeeekComment,
} from './types.js';
import { z } from 'zod';

export interface WeeekClientOptions {
  apiToken: string;
  baseUrl?: string;
  queue?: PQueue;
}

export class WeeekClient {
  private readonly apiToken: string;
  private readonly baseUrl: string;
  private readonly queue: PQueue;

  constructor(options: WeeekClientOptions) {
    if (!options.apiToken) {
      throw new Error('WEEEK API токен обязателен для инициализации WeeekClient');
    }
    this.apiToken = options.apiToken.startsWith('Bearer ')
      ? options.apiToken
      : `Bearer ${options.apiToken}`;
    this.baseUrl = options.baseUrl || CONSTANTS.WEEEK_API_BASE_URL;
    this.queue = options.queue || createConcurrencyQueue();
  }

  /**
   * Базовый метод выполнения авторизованного HTTP-запроса к WEEEK API
   */
  private async request<T>(
    endpoint: string,
    options?: RequestInit,
  ): Promise<T> {
    return this.queue.add(() =>
      withRetry(async () => {
        const url = `${this.baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
        logger.debug({ url, method: options?.method || 'GET' }, t('logs.weeekClient.request'));

        let response: Response;
        try {
          response = await fetch(url, {
            ...options,
            headers: {
              Accept: 'application/json',
              'Content-Type': 'application/json',
              Authorization: this.apiToken,
              ...(options?.headers || {}),
            },
          });
        } catch (fetchError) {
          throw new ApiError(
            `Ошибка сетевого соединения с WEEEK API: ${(fetchError as Error).message}`,
            { isFatal: false },
          );
        }

        if (!response.ok) {
          let errorBody: unknown;
          try {
            errorBody = await response.json();
          } catch {
            errorBody = await response.text();
          }

          throw new ApiError(
            `WEEEK API вернул статус ${response.status}: ${JSON.stringify(errorBody)}`,
            {
              status: response.status,
              headers: response.headers,
              responseBody: errorBody,
            },
          );
        }

        return (await response.json()) as T;
      }),
    ) as Promise<T>;
  }

  /**
   * Проверка подключения и получение профиля пользователя WEEEK
   */
  async getMe(): Promise<WeeekUser> {
    try {
      const data = await this.request<{ user?: unknown; data?: unknown }>('/user/me');
      const userPayload = data.user || data.data || data;
      return WeeekUserSchema.parse(userPayload);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        throw new ApiError('Неверный WEEEK API токен (401 Unauthorized)', {
          status: 401,
          isFatal: true,
        });
      }
      throw err;
    }
  }

  /**
   * Получение списка всех проектов рабочего пространства
   */
  async getProjects(): Promise<WeeekProject[]> {
    const data = await this.request<{ projects?: unknown[]; data?: unknown[] }>('/tm/projects');
    const projectsList = data.projects || data.data || (Array.isArray(data) ? data : []);
    return z.array(WeeekProjectSchema).parse(projectsList);
  }

  /**
   * Получение информации о конкретном проекте
   */
  async getProject(id: string): Promise<WeeekProject> {
    const data = await this.request<{ project?: unknown; data?: unknown }>(`/tm/projects/${id}`);
    const project = data.project || data.data || data;
    return WeeekProjectSchema.parse(project);
  }

  /**
   * Получение списка пользователей рабочего пространства WEEEK
   */
  async getUsers(): Promise<WeeekUser[]> {
    const endpoints = ['/ws/users', '/tm/users', '/user/members'];
    for (const endpoint of endpoints) {
      try {
        const data = await this.request<Record<string, unknown>>(endpoint);
        const usersList =
          (data as { users?: unknown[] })?.users ||
          (data as { data?: { users?: unknown[] } })?.data?.users ||
          (data as { data?: unknown[] })?.data ||
          (data as { members?: unknown[] })?.members ||
          (Array.isArray(data) ? data : []);

        if (Array.isArray(usersList) && usersList.length > 0) {
          return z.array(WeeekUserSchema).parse(usersList);
        }
      } catch {
        // Пробуем следующий эндпоинт
      }
    }
    logger.debug(t('logs.weeekClient.usersNotFound'));
    return [];
  }

  /**
   * Получение списка тегов рабочего пространства WEEEK
   */
  async getTags(): Promise<WeeekTag[]> {
    const endpoints = ['/tm/tags', '/ws/tags', '/tags'];
    for (const endpoint of endpoints) {
      try {
        const data = await this.request<Record<string, unknown>>(endpoint);
        const tagsList =
          (data as { tags?: unknown[] })?.tags ||
          (data as { data?: { tags?: unknown[] } })?.data?.tags ||
          (data as { data?: unknown[] })?.data ||
          (Array.isArray(data) ? data : []);

        if (Array.isArray(tagsList) && tagsList.length > 0) {
          return z.array(WeeekTagSchema).parse(tagsList);
        }
      } catch {
        // Пробуем следующий эндпоинт
      }
    }
    logger.debug(t('logs.weeekClient.tagsNotFound'));
    return [];
  }

  /**
   * Получение списка досок проекта или всего рабочего пространства WEEEK
   */
  async getBoards(options: { projectId?: string } = {}): Promise<WeeekBoard[]> {
    const endpoints = [
      options.projectId ? `/tm/boards?projectId=${options.projectId}` : null,
      options.projectId ? `/ws/boards?projectId=${options.projectId}` : null,
      '/tm/boards',
      '/ws/boards',
      '/boards',
    ].filter(Boolean) as string[];

    const allBoards: WeeekBoard[] = [];
    const seenIds = new Set<string>();

    for (const endpoint of endpoints) {
      try {
        const data = await this.request<Record<string, unknown>>(endpoint);
        const boardsList =
          (data as { boards?: unknown[] })?.boards ||
          (data as { data?: { boards?: unknown[] } })?.data?.boards ||
          (data as { data?: unknown[] })?.data ||
          (Array.isArray(data) ? data : []);

        if (Array.isArray(boardsList) && boardsList.length > 0) {
          const parsed = z.array(WeeekBoardSchema).parse(boardsList);
          for (const b of parsed) {
            if (!seenIds.has(b.id)) {
              seenIds.add(b.id);
              allBoards.push(b);
            }
          }
          if (allBoards.length > 0) break;
        }
      } catch {
        // Пробуем следующий эндпоинт
      }
    }

    return allBoards;
  }

  /**
   * Получение списка колонок канбан-доски проекта WEEEK через API
   */
  async getBoardColumns(
    options: { projectId?: string; boardId?: string } = {},
  ): Promise<WeeekBoardColumn[]> {
    const allColumns: WeeekBoardColumn[] = [];
    const seenColumnIds = new Set<string>();

    const addColumns = (cols: unknown[]) => {
      try {
        const parsed = z.array(WeeekBoardColumnSchema).parse(cols);
        for (const col of parsed) {
          if (!seenColumnIds.has(col.id)) {
            seenColumnIds.add(col.id);
            allColumns.push(col);
          }
        }
      } catch {
        // Игнорируем ошибки парсинга невалидных элементов
      }
    };

    // 1. Если передан конкретный boardId, запрашиваем напрямую
    if (options.boardId) {
      const endpoints = [
        `/tm/board-columns?boardId=${options.boardId}`,
        `/tm/boards/${options.boardId}/columns`,
        `/ws/board-columns?boardId=${options.boardId}`,
      ];
      for (const ep of endpoints) {
        try {
          const data = await this.request<Record<string, unknown>>(ep);
          const list =
            (data as { boardColumns?: unknown[] })?.boardColumns ||
            (data as { columns?: unknown[] })?.columns ||
            (data as { data?: unknown[] })?.data ||
            (Array.isArray(data) ? data : []);
          if (Array.isArray(list) && list.length > 0) {
            addColumns(list);
            break;
          }
        } catch {
          // Пробуем следующий
        }
      }
    }

    // 2. Получаем доски проекта или рабочего пространства и опрашиваем каждую
    let boards: WeeekBoard[] = [];
    try {
      boards = await this.getBoards({ projectId: options.projectId });
    } catch {
      // Игнорируем
    }

    for (const board of boards) {
      const endpoints = [
        `/tm/board-columns?boardId=${board.id}`,
        `/tm/boards/${board.id}/columns`,
        `/ws/board-columns?boardId=${board.id}`,
      ];

      for (const ep of endpoints) {
        try {
          const data = await this.request<Record<string, unknown>>(ep);
          const list =
            (data as { boardColumns?: unknown[] })?.boardColumns ||
            (data as { columns?: unknown[] })?.columns ||
            (data as { data?: unknown[] })?.data ||
            (Array.isArray(data) ? data : []);

          if (Array.isArray(list) && list.length > 0) {
            addColumns(list);
            break;
          }
        } catch {
          // Пробуем следующий
        }
      }
    }

    // 3. Также пробуем общие эндпоинты колонок и статусов WEEEK
    const genericEndpoints = [
      options.projectId ? `/tm/board-columns?projectId=${options.projectId}` : null,
      options.projectId ? `/tm/projects/${options.projectId}/columns` : null,
      options.projectId ? `/tm/statuses?projectId=${options.projectId}` : null,
      '/tm/board-columns',
      '/ws/board-columns',
      '/tm/statuses',
      '/ws/statuses',
    ].filter(Boolean) as string[];

    for (const ep of genericEndpoints) {
      try {
        const data = await this.request<Record<string, unknown>>(ep);
        const list =
          (data as { boardColumns?: unknown[] })?.boardColumns ||
          (data as { columns?: unknown[] })?.columns ||
          (data as { statuses?: unknown[] })?.statuses ||
          (data as { data?: unknown[] })?.data ||
          (Array.isArray(data) ? data : []);

        if (Array.isArray(list) && list.length > 0) {
          addColumns(list);
        }
      } catch {
        // Пробуем следующий
      }
    }

    logger.debug(tf('logs.weeekClient.columnsLoaded', allColumns.length));
    return allColumns;
  }

  /**
   * Получение списка документов базы знаний (Knowledge Base) WEEEK
   */
  async getDocuments(options: { projectId?: string } = {}): Promise<WeeekDocument[]> {
    const pid = options.projectId;
    const endpoints = [
      pid ? `/ws/projects/${pid}/documents` : null,
      pid ? `/projects/${pid}/documents` : null,
      pid ? `/ws/tm/projects/${pid}/documents` : null,
      pid ? `/ws/kb/projects/${pid}/documents` : null,
      pid ? `/ws/documents?project_id=${pid}` : null,
      pid ? `/ws/documents?projectId=${pid}` : null,
      pid ? `/ws/kb/articles?project_id=${pid}` : null,
      pid ? `/ws/kb/articles?projectId=${pid}` : null,
      pid ? `/kb/articles?project_id=${pid}` : null,
      pid ? `/kb/articles?projectId=${pid}` : null,
      '/ws/docs',
      '/tm/docs',
      '/docs',
      '/kb/articles',
      '/kb/documents',
      '/ws/kb/articles',
      '/ws/articles',
      '/articles',
      '/ws/kb',
      '/kb',
      '/kb/trees',
      '/kb/folders',
      '/ws/notes',
      '/notes',
    ].filter(Boolean) as string[];

    const allDocs: WeeekDocument[] = [];
    const seenIds = new Set<string>();

    const extractItemsRecursively = (data: unknown): unknown[] => {
      if (!data) return [];
      if (Array.isArray(data)) {
        let items: unknown[] = [];
        for (const it of data) {
          if (it && typeof it === 'object') {
            const obj = it as Record<string, unknown>;
            if (
              'title' in obj ||
              'name' in obj ||
              'content' in obj ||
              'body' in obj ||
              'articleId' in obj ||
              'uuid' in obj ||
              'id' in obj
            ) {
              items.push(obj);
            }
            if (Array.isArray(obj.children)) {
              items = items.concat(extractItemsRecursively(obj.children));
            }
            if (Array.isArray(obj.articles)) {
              items = items.concat(extractItemsRecursively(obj.articles));
            }
            if (Array.isArray(obj.categories)) {
              items = items.concat(extractItemsRecursively(obj.categories));
            }
            if (Array.isArray(obj.tree)) {
              items = items.concat(extractItemsRecursively(obj.tree));
            }
            if (Array.isArray(obj.docs)) {
              items = items.concat(extractItemsRecursively(obj.docs));
            }
            if (Array.isArray(obj.documents)) {
              items = items.concat(extractItemsRecursively(obj.documents));
            }
          }
        }
        return items;
      }
      if (typeof data === 'object' && data !== null) {
        const obj = data as Record<string, unknown>;
        const list =
          obj.documents ||
          obj.projectDocuments ||
          obj.articles ||
          obj.docs ||
          obj.notes ||
          obj.trees ||
          obj.tree ||
          obj.categories ||
          obj.folders ||
          obj.items ||
          obj.pages ||
          obj.nodes ||
          obj.result ||
          obj.data;

        if (list) {
          return extractItemsRecursively(list);
        }
      }
      return [];
    };

    for (const endpoint of endpoints) {
      try {
        const data = await this.request<Record<string, unknown>>(endpoint);
        const extracted = extractItemsRecursively(data);

        if (extracted.length > 0) {
          for (const item of extracted) {
            try {
              const parsed = WeeekDocumentSchema.parse(item);
              if (!seenIds.has(parsed.id)) {
                seenIds.add(parsed.id);
                // Если содержимое документа не загрузилось в списочном запросе, пробуем запросить отдельно
                if (!parsed.content || parsed.content.trim().length < 5) {
                  const fullDoc = await this.getSingleDocument(parsed.id).catch(() => null);
                  if (fullDoc?.content) {
                    parsed.content = fullDoc.content;
                  }
                }
                allDocs.push(parsed);
              }
            } catch {
              // Игнорируем некорректные элементы
            }
          }
        }
      } catch {
        // Пробуем следующий эндпоинт
      }
    }

    logger.debug(tf('logs.weeekClient.docsLoaded', allDocs.length));
    return allDocs;
  }

  /**
   * Получение детального содержимого конкретного документа WEEEK по ID
   */
  async getSingleDocument(docId: string): Promise<WeeekDocument | null> {
    const endpoints = [
      `/ws/project-documents/${docId}`,
      `/ws/kb/articles/${docId}`,
      `/kb/articles/${docId}`,
      `/ws/docs/${docId}`,
      `/docs/${docId}`,
      `/ws/articles/${docId}`,
      `/articles/${docId}`,
      `/ws/kb/documents/${docId}`,
      `/ws/documents/${docId}`,
    ];

    for (const endpoint of endpoints) {
      try {
        const data = await this.request<Record<string, unknown>>(endpoint);
        if (data && typeof data === 'object') {
          const raw = data.article || data.document || data.data || data;
          const parsed = WeeekDocumentSchema.parse(raw);
          if (parsed && parsed.title) {
            return parsed;
          }
        }
      } catch {
        // Пробуем следующий эндпоинт
      }
    }
    return null;
  }

  /**
   * Получение комментариев к задаче WEEEK
   */
  async getTaskComments(taskId: string): Promise<WeeekComment[]> {
    const endpoints = [
      `/ws/tm/tasks/${taskId}/comments`,
      `/tm/tasks/${taskId}/comments`,
      `/ws/tasks/${taskId}/comments`,
      `/tasks/${taskId}/comments`,
      `/tm/comments?task_id=${taskId}`,
      `/ws/comments?task_id=${taskId}`,
      `/tm/comments?taskId=${taskId}`,
      `/ws/comments?taskId=${taskId}`,
    ];

    for (const endpoint of endpoints) {
      try {
        const data = await this.request<unknown>(endpoint);
        const extractList = (raw: unknown): unknown[] => {
          if (Array.isArray(raw)) return raw;
          if (raw && typeof raw === 'object') {
            const r = raw as Record<string, unknown>;
            const list = r.comments || r.data || r.items;
            if (Array.isArray(list)) return list;
          }
          return [];
        };

        const list = extractList(data);
        if (list.length > 0) {
          const comments: WeeekComment[] = [];
          for (const item of list) {
            try {
              const parsed = WeeekCommentSchema.parse(item);
              if (parsed.text) {
                comments.push({ ...parsed, taskId });
              }
            } catch {
              // Игнорируем некорректные элементы
            }
          }
          if (comments.length > 0) return comments;
        }
      } catch {
        // Пробуем следующий эндпоинт
      }
    }
    return [];
  }

  /**
   * Получение всех задач проекта WEEEK с автоматической обработкой пагинации
   */
  async getTasks(options: {
    projectId?: string;
    includeCompleted?: boolean;
    includeDeleted?: boolean;
    perPage?: number;
  } = {}): Promise<WeeekTask[]> {
    const allTasks: WeeekTask[] = [];
    const perPage = options.perPage || 100;
    let offset = 0;
    let hasMore = true;

    while (hasMore) {
      const queryParams = new URLSearchParams({
        perPage: String(perPage),
        offset: String(offset),
      });

      if (options.projectId) {
        queryParams.set('projectId', options.projectId);
      }

      if (options.includeCompleted) {
        queryParams.set('all', '1');
      }

      const endpoint = `/tm/tasks?${queryParams.toString()}`;
      const response = await this.request<{
        tasks?: unknown[];
        data?: unknown[];
        hasMore?: boolean;
        total?: number;
      }>(endpoint);

      const rawTasks = response.tasks || response.data || (Array.isArray(response) ? response : []);
      const parsedTasks = z.array(WeeekTaskSchema).parse(rawTasks);

      allTasks.push(...parsedTasks);

      // Проверка условий окончания пагинации
      if (response.hasMore !== undefined) {
        hasMore = response.hasMore;
      } else if (rawTasks.length < perPage) {
        hasMore = false;
      }

      offset += rawTasks.length;

      // Защита от бесконечного цикла, если API возвращает 0 задач
      if (rawTasks.length === 0) {
        break;
      }
    }

    // Фильтрация удаленных задач, если не запрошено обратное
    if (!options.includeDeleted) {
      return allTasks.filter(t => !t.isDeleted);
    }

    return allTasks;
  }
}
