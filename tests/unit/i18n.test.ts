import { describe, it, expect, beforeEach } from 'vitest';
import { t, tf, setLocale, getLocale, detectLocale, getDict } from '../../src/i18n/index.js';

describe('i18n module', () => {
  beforeEach(() => {
    setLocale('ru');
  });

  it('должен переводить ключи на русский язык по умолчанию', () => {
    expect(getLocale()).toBe('ru');
    expect(t('common.cancel')).toBe('Операция отменена');
    expect(t('cli.commands.migrate')).toBe('Запуск интерактивного мастера миграции задач и проектов из WEEEK в Linear');
  });

  it('должен переключать локаль на английскую', () => {
    setLocale('en');
    expect(getLocale()).toBe('en');
    expect(t('common.cancel')).toBe('Operation cancelled');
    expect(t('cli.commands.migrate')).toBe('Run interactive migration wizard from WEEEK to Linear');
  });

  it('должен подставлять параметры через tf()', () => {
    setLocale('ru');
    const formatted = tf('logs.engine.weeekUser', 'Denis', 'denis@example.com');
    expect(formatted).toBe('WEEEK пользователь: Denis (denis@example.com)');
  });

  it('должен использовать fallback ключ, если перевод не найден', () => {
    expect(t('unknown.nonexistent.key')).toBe('unknown.nonexistent.key');
  });

  it('должен отдавать словарь через getDict()', () => {
    const dictRu = getDict('ru');
    expect(dictRu.common.yes).toBe('Да');

    const dictEn = getDict('en');
    expect(dictEn.common.yes).toBe('Yes');
  });

  it('должен определять системную локаль через detectLocale()', () => {
    const locale = detectLocale();
    expect(['ru', 'en']).toContain(locale);
  });
});
