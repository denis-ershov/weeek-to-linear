import type PQueue from 'p-queue';
import { CONSTANTS } from '../../config/constants.js';
import { logger } from '../../utils/logger.js';
import { ApiError, withRetry } from '../../utils/retry.js';
import { createConcurrencyQueue } from '../../utils/queue.js';
import {
  WeeekProjectSchema,
  WeeekTaskSchema,
  WeeekUserSchema,
  WeeekTagSchema,
} from './schemas.js';
import type { WeeekProject, WeeekTask, WeeekUser, WeeekTag } from './types.js';
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
        logger.debug({ url, method: options?.method || 'GET' }, 'Выполнение запроса к WEEEK API');

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
    logger.debug('Пользователи рабочего пространства WEEEK не найдены по стандартным эндпоинтам');
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
    logger.debug('Теги WEEEK не найдены или список пуст');
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
