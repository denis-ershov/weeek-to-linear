import { describe, it, expect } from 'vitest';
import { formatLinearDueDate, isValidDateString } from '../../src/utils/dates.js';

describe('utils/dates', () => {
  it('должен корректно оставлять уже валидный формат YYYY-MM-DD', () => {
    expect(formatLinearDueDate('2026-08-12')).toBe('2026-08-12');
  });

  it('должен корректно конвертировать формат DD.MM.YYYY', () => {
    expect(formatLinearDueDate('12.08.2026')).toBe('2026-08-12');
    expect(formatLinearDueDate('01.05.2024')).toBe('2024-05-01');
  });

  it('должен корректно конвертировать ISO строки', () => {
    expect(formatLinearDueDate('2026-08-12T14:30:00Z')).toBe('2026-08-12');
  });

  it('должен возвращать null для пустых или невалидных значений', () => {
    expect(formatLinearDueDate(null)).toBeNull();
    expect(formatLinearDueDate(undefined)).toBeNull();
    expect(formatLinearDueDate('')).toBeNull();
    expect(formatLinearDueDate('не дата')).toBeNull();
  });

  it('isValidDateString должен возвращать true только для корректных дат', () => {
    expect(isValidDateString('2026-08-12')).toBe(true);
    expect(isValidDateString('12.08.2026')).toBe(true);
    expect(isValidDateString('invalid')).toBe(false);
    expect(isValidDateString(null)).toBe(false);
  });
});
