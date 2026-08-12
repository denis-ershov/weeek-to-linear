import PQueue from 'p-queue';
import { CONSTANTS } from '../config/constants.js';

/**
 * Создание очереди для регулирования частоты и параллельности запросов
 */
export function createConcurrencyQueue(concurrency: number = CONSTANTS.DEFAULT_CONCURRENCY): PQueue {
  return new PQueue({
    concurrency: Math.max(1, Math.min(concurrency, 10)),
  });
}
