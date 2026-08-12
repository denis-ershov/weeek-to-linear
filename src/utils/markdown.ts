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
