import {
  normalizeDescriptionToMarkdown,
  normalizeDocumentContentToMarkdown,
} from '../../src/utils/markdown.js';

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

  it('normalizeDocumentContentToMarkdown должен парсить блоки Editor.js в Markdown', () => {
    const editorJsData = {
      time: 12345678,
      blocks: [
        { type: 'header', data: { text: 'Документ базы знаний', level: 2 } },
        { type: 'paragraph', data: { text: 'Это параграф с <b>жирным</b> шрифтом' } },
        { type: 'list', data: { style: 'ordered', items: ['Шаг 1', 'Шаг 2'] } },
        { type: 'code', data: { code: 'const x = 42;' } },
      ],
    };

    const result = normalizeDocumentContentToMarkdown(editorJsData);
    expect(result).toContain('## Документ базы знаний');
    expect(result).toContain('Это параграф с **жирным** шрифтом');
    expect(result).toContain('1. Шаг 1');
    expect(result).toContain('2. Шаг 2');
    expect(result).toContain('```\nconst x = 42;\n```');
  });

  it('normalizeDocumentContentToMarkdown должен парсить TipTap/ProseMirror JSON в Markdown', () => {
    const tipTapData = {
      type: 'doc',
      content: [
        {
          type: 'heading',
          attrs: { level: 1 },
          content: [{ type: 'text', text: 'Заголовок TipTap' }],
        },
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'Текст документа' }],
        },
      ],
    };

    const result = normalizeDocumentContentToMarkdown(tipTapData);
    expect(result).toContain('# Заголовок TipTap');
    expect(result).toContain('Текст документа');
  });
});
