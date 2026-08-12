/**
 * Утилиты для работы с датами и приведения к формату Linear dueDate (YYYY-MM-DD).
 */

/**
 * Преобразование даты в формат YYYY-MM-DD для Linear dueDate
 */
export function formatLinearDueDate(dateStr?: string | null): string | null {
  if (!dateStr || typeof dateStr !== 'string') return null;

  const trimmed = dateStr.trim();
  if (!trimmed) return null;

  // Если уже в формате YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }

  // Если в формате DD.MM.YYYY
  const ruMatch = trimmed.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  if (ruMatch && ruMatch[1] && ruMatch[2] && ruMatch[3]) {
    return `${ruMatch[3]}-${ruMatch[2]}-${ruMatch[1]}`;
  }

  // Парсинг через Date
  const parsed = new Date(trimmed);
  if (isNaN(parsed.getTime())) {
    return null;
  }

  const year = parsed.getUTCFullYear();
  const month = String(parsed.getUTCMonth() + 1).padStart(2, '0');
  const day = String(parsed.getUTCDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

/**
 * Проверка валидности формата даты
 */
export function isValidDateString(dateStr?: string | null): boolean {
  if (!dateStr) return false;
  return formatLinearDueDate(dateStr) !== null;
}
