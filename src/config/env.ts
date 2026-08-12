import { z } from 'zod';
import dotenv from 'dotenv';
import { CONSTANTS } from './constants.js';

// Загрузка переменных окружения из .env файла
dotenv.config();

/**
 * Схема валидации переменных окружения
 */
export const EnvSchema = z.object({
  WEEEK_API_TOKEN: z.string().min(1, {
    message: 'WEEEK_API_TOKEN не указан. Задайте его в .env или передайте через интерактивный ввод.',
  }),
  LINEAR_API_TOKEN: z.string().min(1, {
    message: 'LINEAR_API_TOKEN не указан. Задайте его в .env или передайте через интерактивный ввод.',
  }),
  LOG_LEVEL: z
    .enum(['trace', 'debug', 'info', 'warn', 'error', 'silent'])
    .default('info'),
  API_CONCURRENCY: z
    .string()
    .transform(val => parseInt(val, 10))
    .pipe(z.number().min(1).max(10))
    .default(String(CONSTANTS.DEFAULT_CONCURRENCY)),
  STATE_FILE: z.string().default(CONSTANTS.DEFAULT_STATE_FILE),
});

export type AppConfig = z.infer<typeof EnvSchema>;

/**
 * Функция безопасного получения конфигурации
 */
export function getAppConfig(overrides?: Partial<AppConfig>): AppConfig {
  const rawEnv = {
    WEEEK_API_TOKEN: overrides?.WEEEK_API_TOKEN ?? process.env['WEEEK_API_TOKEN'] ?? '',
    LINEAR_API_TOKEN: overrides?.LINEAR_API_TOKEN ?? process.env['LINEAR_API_TOKEN'] ?? '',
    LOG_LEVEL: overrides?.LOG_LEVEL ?? process.env['LOG_LEVEL'] ?? CONSTANTS.DEFAULT_LOG_LEVEL,
    API_CONCURRENCY:
      overrides?.API_CONCURRENCY !== undefined
        ? String(overrides.API_CONCURRENCY)
        : process.env['API_CONCURRENCY'] ?? String(CONSTANTS.DEFAULT_CONCURRENCY),
    STATE_FILE: overrides?.STATE_FILE ?? process.env['STATE_FILE'] ?? CONSTANTS.DEFAULT_STATE_FILE,
  };

  const parsed = EnvSchema.safeParse(rawEnv);
  if (!parsed.success) {
    // Если токенов нет в env, возвращаем частично заполненный конфиг для возможности ввода через CLI prompt
    return {
      WEEEK_API_TOKEN: rawEnv.WEEEK_API_TOKEN,
      LINEAR_API_TOKEN: rawEnv.LINEAR_API_TOKEN,
      LOG_LEVEL: (rawEnv.LOG_LEVEL as AppConfig['LOG_LEVEL']) || 'info',
      API_CONCURRENCY: Number(rawEnv.API_CONCURRENCY) || CONSTANTS.DEFAULT_CONCURRENCY,
      STATE_FILE: rawEnv.STATE_FILE || CONSTANTS.DEFAULT_STATE_FILE,
    };
  }

  return parsed.data;
}
