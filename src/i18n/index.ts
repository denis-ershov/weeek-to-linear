import { ru } from './ru.js';
import { en } from './en.js';
import type { I18nDictionary } from './types.js';

export type Locale = 'ru' | 'en';

const DICTIONARIES: Record<Locale, I18nDictionary> = { ru, en };

let _current: Locale = 'ru';

/**
 * Определяет язык из аргументов командной строки или переменных окружения.
 * Считывается ДО вызова program.parse() чтобы описания команд были локализованы.
 */
export function detectLocale(): Locale {
  // 1. Явный флаг --lang ru|en в argv
  const langFlagIdx = process.argv.indexOf('--lang');
  if (langFlagIdx !== -1) {
    const val = process.argv[langFlagIdx + 1];
    if (val === 'ru' || val === 'en') return val;
  }

  // 2. Переменная окружения WEEEK_LANG (приоритетная)
  const envLang = process.env['WEEEK_LANG'] ?? process.env['WEEEK_TO_LINEAR_LANG'];
  if (envLang === 'ru' || envLang === 'en') return envLang;

  // 3. Системная переменная LANG/LC_ALL/LANGUAGE
  const sysLang =
    process.env['LANG'] ?? process.env['LC_ALL'] ?? process.env['LANGUAGE'] ?? '';
  if (sysLang.toLowerCase().startsWith('ru')) return 'ru';

  // 4. По умолчанию — русский (целевая аудитория)
  return 'ru';
}

/**
 * Устанавливает текущую локаль. Вызывается один раз при старте программы.
 */
export function setLocale(locale: Locale): void {
  _current = locale;
}

/**
 * Возвращает текущую активную локаль.
 */
export function getLocale(): Locale {
  return _current;
}

/**
 * Получает словарь для текущей (или указанной) локали.
 */
export function getDict(locale?: Locale): I18nDictionary {
  return DICTIONARIES[locale ?? _current];
}

/**
 * Главная функция перевода — возвращает строку по точечному пути ключа.
 * Пример: t('cli.auth.intro'), t('ui.step1.title')
 *
 * Если ключ не найден — возвращает сам ключ как fallback (никогда не падает).
 */
export function t(key: string): string {
  const dict = getDict();
  // Разбиваем точечный путь и идём по словарю
  const parts = key.split('.');
  let node: unknown = dict;
  for (const part of parts) {
    if (typeof node !== 'object' || node === null) return key;
    node = (node as Record<string, unknown>)[part];
  }
  if (typeof node === 'string') return node;
  return key;
}

// Инициализация при импорте модуля
_current = detectLocale();

/**
 * Форматированный перевод — подставляет аргументы вместо %s / %d / %i.
 * Пример: tf('logs.engine.weeekUser', 'Denis', 'denis@example.com')
 *         → 'WEEEK пользователь: Denis (denis@example.com)'
 */
export function tf(key: string, ...args: (string | number)[]): string {
  let str = t(key);
  let i = 0;
  return str.replace(/%[sdi]/g, () => String(args[i++] ?? ''));
}

export { ru, en };
export type { I18nDictionary };
