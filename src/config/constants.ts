/**
 * Глобальные константы и настройки по умолчанию для weeek-to-linear.
 */

export const CONSTANTS = {
  APP_NAME: 'weeek-to-linear',
  APP_VERSION: '0.1.0',
  DEFAULT_STATE_FILE: '.weeek-linear/state.json',
  DEFAULT_CONCURRENCY: 3,
  DEFAULT_LOG_LEVEL: 'info' as const,
  DEFAULT_RETRY_ATTEMPTS: 4,
  WEEEK_API_BASE_URL: 'https://api.weeek.net/public/v1',
  LINEAR_API_BASE_URL: 'https://api.linear.app/graphql',
  
  // Таблица соответствия приоритетов WEEEK -> Linear
  PRIORITY_MAP: {
    0: 4, // WEEEK Low (0) -> Linear Low (4)
    1: 3, // WEEEK Medium (1) -> Linear Medium (3)
    2: 2, // WEEEK High (2) -> Linear High (2)
    3: 0, // WEEEK Hold (3) -> Linear No priority (0)
  } as const,

  // Метка для задач WEEEK со статусом приоритета Hold
  HOLD_LABEL_NAME: 'hold',
  HOLD_LABEL_COLOR: '#F2994A',
};
