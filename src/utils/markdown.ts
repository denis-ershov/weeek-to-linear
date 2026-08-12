import TurndownService from 'turndown';

// Инициализация сервиса преобразования HTML в Markdown
const turndownService = new TurndownService({
  headingStyle: 'atx',
  hr: '---',
  bulletListMarker: '-',
  codeBlockStyle: 'fenced',
  emDelimiter: '*',
  strongDelimiter: '**',
});

// Отключение нежелательных тегов / санитизация
turndownService.remove(['script', 'style', 'iframe', 'object', 'embed']);

/**
 * Санитизация и преобразование описания из WEEEK в валидный Markdown для Linear
 */
export function normalizeDescriptionToMarkdown(rawContent?: string | null): string {
  if (!rawContent || typeof rawContent !== 'string') {
    return '';
  }

  const trimmed = rawContent.trim();
  if (!trimmed) {
    return '';
  }

  // Если текст содержит HTML-разметку, преобразуем её в Markdown
  if (/<[a-z][\s\S]*>/i.test(trimmed)) {
    try {
      return turndownService.turndown(trimmed).trim();
    } catch {
      // Fallback при ошибке парсинга HTML: возвращаем исходный текст
      return trimmed;
    }
  }

  return trimmed;
}

/**
 * Преобразование произвольного контента документа (строка, HTML, EditorJS blocks, TipTap JSON, Quill Delta) в Markdown
 */
export function normalizeDocumentContentToMarkdown(rawContent: unknown): string {
  if (!rawContent) return '';

  // 1. Если это строка
  if (typeof rawContent === 'string') {
    const trimmed = rawContent.trim();
    if (!trimmed) return '';

    // Проверяем, не является ли это JSON строкой
    if (
      (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
      (trimmed.startsWith('[') && trimmed.endsWith(']'))
    ) {
      try {
        const parsedJson = JSON.parse(trimmed);
        return normalizeDocumentContentToMarkdown(parsedJson);
      } catch {
        // Обычная строка
      }
    }

    return normalizeDescriptionToMarkdown(trimmed);
  }

  // 2. Если это объект
  if (typeof rawContent === 'object' && rawContent !== null) {
    const obj = rawContent as Record<string, unknown>;

    // 2.1 Editor.js { time, blocks: [...] }
    if (Array.isArray(obj.blocks)) {
      const parts: string[] = [];
      for (const block of obj.blocks as Record<string, unknown>[]) {
        if (!block || typeof block !== 'object') continue;
        const bType = String(block.type || '');
        const bData = (block.data || {}) as Record<string, unknown>;

        if (bType === 'paragraph' || bType === 'text') {
          const text = normalizeDescriptionToMarkdown(String(bData.text || ''));
          if (text) parts.push(text);
        } else if (bType === 'header') {
          const level = Number(bData.level) || 2;
          const prefix = '#'.repeat(Math.min(6, Math.max(1, level)));
          const text = normalizeDescriptionToMarkdown(String(bData.text || ''));
          if (text) parts.push(`${prefix} ${text}`);
        } else if (bType === 'list') {
          const items = Array.isArray(bData.items) ? bData.items : [];
          const style = bData.style === 'ordered' ? '1.' : '-';
          const listText = items
            .map((item, idx) => {
              const itemText =
                typeof item === 'string'
                  ? item
                  : (item as { text?: string })?.text || '';
              return `${style === '1.' ? `${idx + 1}.` : '-'} ${normalizeDescriptionToMarkdown(itemText)}`;
            })
            .join('\n');
          if (listText) parts.push(listText);
        } else if (bType === 'code') {
          const code = String(bData.code || '');
          parts.push(`\`\`\`\n${code}\n\`\`\``);
        } else if (bType === 'delimiter') {
          parts.push('---');
        } else if (bType === 'quote') {
          const text = normalizeDescriptionToMarkdown(String(bData.text || ''));
          if (text) parts.push(`> ${text}`);
        } else if (bType === 'image') {
          const url = (bData.file as { url?: string })?.url || String(bData.url || '');
          const caption = String(bData.caption || '');
          if (url) parts.push(`![${caption}](${url})`);
        } else if (bData.text) {
          const text = normalizeDescriptionToMarkdown(String(bData.text));
          if (text) parts.push(text);
        }
      }
      return parts.join('\n\n');
    }

    // 2.2 TipTap / ProseMirror { type: "doc", content: [...] }
    if (obj.type === 'doc' && Array.isArray(obj.content)) {
      const renderNodes = (nodes: Record<string, unknown>[]): string => {
        return nodes
          .map(node => {
            if (node.type === 'text') return String(node.text || '');
            if (node.type === 'paragraph') {
              const inner = Array.isArray(node.content)
                ? renderNodes(node.content as Record<string, unknown>[])
                : '';
              return inner ? `${inner}\n\n` : '';
            }
            if (node.type === 'heading') {
              const level = (node.attrs as { level?: number })?.level || 2;
              const inner = Array.isArray(node.content)
                ? renderNodes(node.content as Record<string, unknown>[])
                : '';
              return `${'#'.repeat(level)} ${inner}\n\n`;
            }
            if (node.type === 'bulletList' || node.type === 'orderedList') {
              const isOrdered = node.type === 'orderedList';
              if (Array.isArray(node.content)) {
                return (
                  node.content
                    .map((item, i) => {
                      const itemInner = Array.isArray((item as { content?: unknown[] })?.content)
                        ? renderNodes((item as { content: Record<string, unknown>[] }).content)
                        : '';
                      return `${isOrdered ? `${i + 1}.` : '-'} ${itemInner.trim()}`;
                    })
                    .join('\n') + '\n\n'
                );
              }
            }
            if (Array.isArray(node.content)) {
              return renderNodes(node.content as Record<string, unknown>[]);
            }
            return '';
          })
          .join('');
      };
      return renderNodes(obj.content as Record<string, unknown>[]).trim();
    }

    // 2.3 Quill Delta [{ insert: "..." }]
    if (Array.isArray(rawContent)) {
      const deltaText = (rawContent as { insert?: unknown }[])
        .map(op => (typeof op.insert === 'string' ? op.insert : ''))
        .join('');
      if (deltaText) return normalizeDescriptionToMarkdown(deltaText);
    }

    // 2.4 Вложенные поля
    if (obj.body) return normalizeDocumentContentToMarkdown(obj.body);
    if (obj.text) return normalizeDocumentContentToMarkdown(obj.text);
    if (obj.html) return normalizeDocumentContentToMarkdown(obj.html);
    if (obj.description) return normalizeDocumentContentToMarkdown(obj.description);
    if (obj.data) return normalizeDocumentContentToMarkdown(obj.data);
  }

  return '';
}
