import * as p from '@clack/prompts';
import { exec } from 'node:child_process';
import { WebServer } from '../../server/server.js';
import { theme, printBanner } from '../ui/theme.js';
import { logger } from '../../utils/logger.js';

/**
 * Кроссплатформенное открытие URL в браузере
 */
function openBrowser(url: string): void {
  const start =
    process.platform === 'darwin'
      ? 'open'
      : process.platform === 'win32'
        ? 'start'
        : 'xdg-open';

  exec(`${start} ${url}`, err => {
    if (err) {
      logger.debug(`Не удалось автоматически открыть браузер: ${err.message}`);
    }
  });
}

export async function uiCommand(options: { port?: string | number; open?: boolean }): Promise<void> {
  printBanner();
  p.intro(theme.title('Запуск Web UI для управления миграцией'));

  const requestedPort = options.port ? Number(options.port) : 3456;
  const shouldOpen = options.open !== false;

  const server = new WebServer({ port: requestedPort });

  try {
    const { port, url } = await server.start();

    p.note(
      `Веб-интерфейс запущен и доступен по адресу:\n\n` +
        `  ${theme.primary.bold(url)}\n\n` +
        `Для остановки сервера нажмите ${theme.dim('Ctrl + C')}`,
      theme.successBadge(`СЕРВЕР АКТИВЕН НА ПОРТУ ${port}`),
    );

    if (shouldOpen) {
      openBrowser(url);
    }

    // Обработка корректного завершения
    const cleanup = async () => {
      p.log.info(theme.dim('\nОстановка веб-сервера...'));
      await server.stop();
      process.exit(0);
    };

    process.on('SIGINT', cleanup);
    process.on('SIGTERM', cleanup);
  } catch (err) {
    p.log.error(theme.error(`Ошибка запуска веб-сервера: ${(err as Error).message}`));
    process.exit(1);
  }
}
