import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

describe('Web UI i18n Dictionary Consistency Audit', () => {
  it('должен содержать одинаковый и полный набор ключей в ru и en локалях', () => {
    const i18nPath = path.resolve('src/server/public/i18n.js');
    const content = fs.readFileSync(i18nPath, 'utf-8');

    // Создаем изолированный контекст для выполнения i18n.js
    const sandbox = {
      window: {} as { i18n?: { t: (k: string) => string; getLocale: () => string } },
      document: {
        querySelectorAll: () => [],
        querySelector: () => null,
      },
      localStorage: {
        getItem: () => null,
        setItem: () => {},
      },
      navigator: { language: 'ru' },
      CustomEvent: class {},
    };

    vm.createContext(sandbox);

    // Добавляем возврат TRANSLATIONS в конце самовызывающейся функции
    const codeWithExport = content.replace(/\}\)\(\);?\s*$/, 'return TRANSLATIONS;\n})();');
    const translations = vm.runInContext(codeWithExport, sandbox) as {
      ru: Record<string, string>;
      en: Record<string, string>;
    };

    expect(translations).toBeDefined();
    expect(translations.ru).toBeDefined();
    expect(translations.en).toBeDefined();

    const ruKeys = Object.keys(translations.ru).sort();
    const enKeys = Object.keys(translations.en).sort();

    expect(ruKeys.length).toBeGreaterThan(50);
    expect(enKeys.length).toBeGreaterThan(50);

    // 1. Проверяем, есть ли ключи в RU, которых нет в EN
    const missingInEn = ruKeys.filter(k => !enKeys.includes(k));
    expect(
      missingInEn,
      `Ключи присутствуют в RU, но отсутствуют в EN: ${missingInEn.join(', ')}`,
    ).toEqual([]);

    // 2. Проверяем, есть ли ключи в EN, которых нет в RU
    const missingInRu = enKeys.filter(k => !ruKeys.includes(k));
    expect(
      missingInRu,
      `Ключи присутствуют в EN, но отсутствуют в RU: ${missingInRu.join(', ')}`,
    ).toEqual([]);

    // 3. Проверяем, что ни один ключ не имеет пустого перевода
    for (const [key, val] of Object.entries(translations.ru)) {
      expect(val.trim().length, `Пустой перевод для RU ключа "${key}"`).toBeGreaterThan(0);
    }
    for (const [key, val] of Object.entries(translations.en)) {
      expect(val.trim().length, `Пустой перевод для EN ключа "${key}"`).toBeGreaterThan(0);
    }
  });
});
