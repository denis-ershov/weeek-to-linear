import pRetry, { type Options as PRetryOptions } from 'p-retry';
import { logger } from './logger.js';
import { tf } from '../i18n/index.js';

export interface RetryOptions {
  retries?: number;
  minTimeout?: number;
  maxTimeout?: number;
  factor?: number;
  onFailedAttempt?: (error: Error & { attemptNumber: number; retriesLeft: number }) => void;
}

/**
 * Ошибка API с HTTP-статусом и заголовками
 */
export class ApiError extends Error {
  public status?: number;
  public headers?: Headers | Record<string, string>;
  public responseBody?: unknown;
  public isFatal: boolean;

  constructor(
    message: string,
    options?: {
      status?: number;
      headers?: Headers | Record<string, string>;
      responseBody?: unknown;
      isFatal?: boolean;
    },
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = options?.status;
    this.headers = options?.headers;
    this.responseBody = options?.responseBody;
    
    // 400, 401, 403, 404 считаются фатальными ошибками запроса (не подлежат retry)
    this.isFatal =
      options?.isFatal ??
      (options?.status !== undefined && [400, 401, 403, 404].includes(options.status));
  }
}

/**
 * Извлечение времени ожидания из заголовка Retry-After (в миллисекундах)
 */
export function getRetryAfterMs(headers?: Headers | Record<string, string>): number | null {
  if (!headers) return null;

  let headerValue: string | null = null;
  if (typeof (headers as Headers).get === 'function') {
    headerValue = (headers as Headers).get('retry-after');
  } else if (typeof headers === 'object') {
    headerValue =
      (headers as Record<string, string>)['retry-after'] ||
      (headers as Record<string, string>)['Retry-After'] ||
      null;
  }

  if (!headerValue) return null;

  const seconds = Number(headerValue);
  if (!isNaN(seconds) && seconds > 0) {
    return seconds * 1000;
  }

  const dateMs = Date.parse(headerValue);
  if (!isNaN(dateMs)) {
    const diff = dateMs - Date.now();
    return diff > 0 ? diff : 0;
  }

  return null;
}

/**
 * Обертка выполнения асинхронной функции с автоматическим повтором при сбоях
 */
export async function withRetry<T>(fn: () => Promise<T>, options?: RetryOptions): Promise<T> {
  const retryOpts: PRetryOptions = {
    retries: options?.retries ?? 4,
    minTimeout: options?.minTimeout ?? 1000,
    maxTimeout: options?.maxTimeout ?? 8000,
    factor: options?.factor ?? 2,
    randomize: true, // Добавление джиттера для предотвращения лавинообразных запросов
    onFailedAttempt: error => {
      // Если ошибка фатальная (401, 403 и т.д.), прекращаем retry
      if (error instanceof ApiError && error.isFatal) {
        logger.debug(tf('logs.retry.fatalError', error.message));
        throw error;
      }

      const retryAfter = error instanceof ApiError ? getRetryAfterMs(error.headers) : null;
      if (retryAfter) {
        logger.warn(
          tf('logs.retry.retrying', error.attemptNumber, error.retriesLeft, Math.round(retryAfter / 1000), error.message),
        );
      } else {
        logger.debug(
          tf('logs.retry.retrying', error.attemptNumber, error.retriesLeft, 0, error.message),
        );
      }

      if (options?.onFailedAttempt) {
        options.onFailedAttempt(error as Error & { attemptNumber: number; retriesLeft: number });
      }
    },
  };

  return pRetry(fn, retryOpts);
}
