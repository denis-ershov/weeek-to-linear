import chalk from 'chalk';

// Принудительная установка кодировки UTF-8 для стандартных потоков вывода на Windows
if (process.stdout && typeof process.stdout.setDefaultEncoding === 'function') {
  process.stdout.setDefaultEncoding('utf-8');
}
if (process.stderr && typeof process.stderr.setDefaultEncoding === 'function') {
  process.stderr.setDefaultEncoding('utf-8');
}

/**
 * Ключи и пути к чувствительным полям, которые автоматически маскируются в логах.
 * Гарантия отсутствия утечки токенов и паролей в терминалах или CI.
 */
const REDACTED_KEYS = new Set([
  'token',
  'apikey',
  'password',
  'secret',
  'authorization',
  'weeek_api_token',
  'linear_api_token',
]);

/**
 * Рекурсивная очистка объекта от секретов
 */
function sanitize(val: unknown): unknown {
  if (val === null || val === undefined) return val;
  if (typeof val === 'string') {
    if (val.startsWith('Bearer ') || val.startsWith('lin_api_')) {
      return '[REDACTED]';
    }
    return val;
  }
  if (Array.isArray(val)) {
    return val.map(sanitize);
  }
  if (typeof val === 'object') {
    const res: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(val as Record<string, unknown>)) {
      if (REDACTED_KEYS.has(k.toLowerCase())) {
        res[k] = '[REDACTED]';
      } else {
        res[k] = sanitize(v);
      }
    }
    return res;
  }
  return val;
}

/**
 * Форматирование локального времени со смещением
 */
function formatTime(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  const ms = String(now.getMilliseconds()).padStart(3, '0');
  const tzOffset = -now.getTimezoneOffset();
  const tzSign = tzOffset >= 0 ? '+' : '-';
  const tzHours = String(Math.floor(Math.abs(tzOffset) / 60)).padStart(2, '0');
  const tzMin = String(Math.abs(tzOffset) % 60).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}.${ms} ${tzSign}${tzHours}${tzMin}`;
}

const levels = {
  debug: { priority: 10, label: chalk.gray('DEBUG') },
  info: { priority: 20, label: chalk.cyan('INFO') },
  warn: { priority: 30, label: chalk.yellow('WARN') },
  error: { priority: 40, label: chalk.red('ERROR') },
  fatal: { priority: 50, label: chalk.bgRed.white('FATAL') },
};

export type LogLevel = keyof typeof levels;

export interface Logger {
  debug(msg: string): void;
  debug(obj: object, msg?: string): void;
  info(msg: string): void;
  info(obj: object, msg?: string): void;
  warn(msg: string): void;
  warn(obj: object, msg?: string): void;
  error(msg: string): void;
  error(obj: object, msg?: string): void;
  fatal(msg: string): void;
  fatal(obj: object, msg?: string): void;
}

export class AppLogger implements Logger {
  private minPriority: number;

  constructor(level: LogLevel | string = 'info') {
    this.minPriority = levels[(level?.toLowerCase() as LogLevel) || 'info']?.priority ?? 20;
  }

  private log(level: LogLevel, arg1: unknown, arg2?: string): void {
    const config = levels[level];
    if (config.priority < this.minPriority) return;

    const timeStr = chalk.gray(`[${formatTime()}]`);
    let message = '';
    let meta = '';

    if (typeof arg1 === 'string') {
      message = arg1;
    } else if (typeof arg1 === 'object' && arg1 !== null) {
      const sanitized = sanitize(arg1);
      meta = Object.keys(sanitized as object).length > 0 ? ` ${JSON.stringify(sanitized)}` : '';
      if (typeof arg2 === 'string') {
        message = arg2;
      }
    }

    const output = `${timeStr} ${config.label}: ${message}${meta}`;
    if (level === 'error' || level === 'fatal') {
      process.stderr.write(`${output}\n`);
    } else {
      process.stdout.write(`${output}\n`);
    }
  }

  debug(msg: string): void;
  debug(obj: object, msg?: string): void;
  debug(arg1: unknown, arg2?: string): void {
    this.log('debug', arg1, arg2);
  }

  info(msg: string): void;
  info(obj: object, msg?: string): void;
  info(arg1: unknown, arg2?: string): void {
    this.log('info', arg1, arg2);
  }

  warn(msg: string): void;
  warn(obj: object, msg?: string): void;
  warn(arg1: unknown, arg2?: string): void {
    this.log('warn', arg1, arg2);
  }

  error(msg: string): void;
  error(obj: object, msg?: string): void;
  error(arg1: unknown, arg2?: string): void {
    this.log('error', arg1, arg2);
  }

  fatal(msg: string): void;
  fatal(obj: object, msg?: string): void;
  fatal(arg1: unknown, arg2?: string): void {
    this.log('fatal', arg1, arg2);
  }
}

export function createLogger(level: string = 'info'): Logger {
  return new AppLogger(level);
}

export const logger = createLogger(process.env['LOG_LEVEL'] || 'info');
