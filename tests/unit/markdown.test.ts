import { describe, it, expect } from 'vitest';
import { normalizeDescriptionToMarkdown } from '../../src/utils/markdown.js';

describe('utils/markdown', () => {
  it('должен возвращать пустую строку при null или undefined', () => {
    expect(normalizeDescriptionToMarkdown(null)).toBe('');
    expect(normalizeDescriptionToMarkdown(undefined)).toBe('');
    expect(normalizeDescriptionToMarkdown('')).toBe('');
  });

  it('должен сохранять обычный Markdown без изменений', () => {
    const text = '## Заголовок\n\n- пункт 1\n- пункт 2\n\n```js\nconsole.log(1);\n```';
    expect(normalizeDescriptionToMarkdown(text)).toBe(text);
  });

  it('должен корректно конвертировать HTML в Markdown', () => {
    const html = '<h1>Заголовок</h1><p>Текст с <strong>жирным</strong> и <a href="https://example.com">ссылкой</a>.</p>';
    const result = normalizeDescriptionToMarkdown(html);
    expect(result).toContain('# Заголовок');
    expect(result).toContain('**жирным**');
    expect(result).toContain('[ссылкой](https://example.com)');
  });

  it('должен вырезать небезопасные теги script и iframe', () => {
    const malicious = '<p>Безопасный текст</p><script>alert("xss")</script><iframe src="evil.com"></iframe>';
    const result = normalizeDescriptionToMarkdown(malicious);
    expect(result).toBe('Безопасный текст');
    expect(result).not.toContain('alert');
    expect(result).not.toContain('evil.com');
  });
});
