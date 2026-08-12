import * as p from '@clack/prompts';
import { exec } from 'node:child_process';
import { WebServer } from '../../server/server.js';
import { theme, printBanner } from '../ui/theme.js';
import { logger } from '../../utils/logger.js';
import { t, tf } from '../../i18n/index.js';

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
      logger.debug(tf('logs.ui.browserOpenError', err.message));
    }
  });
}

export async function uiCommand(options: { port?: string | number; open?: boolean }): Promise<void> {
  printBanner();
  p.intro(theme.title(t('cli.ui.intro')));

  const requestedPort = options.port ? Number(options.port) : 3456;
  const shouldOpen = options.open !== false;

  const server = new WebServer({ port: requestedPort });

  try {
    const { port, url } = await server.start();

    p.note(
      `${t('cli.ui.serverNote')}\n\n` +
        `  ${theme.primary.bold(url)}\n\n` +
        `${t('cli.ui.stopHint')} ${theme.dim('Ctrl + C')}`,
      theme.successBadge(`${t('cli.ui.serverBadge')} ${port}`),
    );

    if (shouldOpen) {
      openBrowser(url);
    }

    // Корректное завершение
    const cleanup = async () => {
      p.log.info(theme.dim(`\n${t('cli.ui.stopping')}`));
      await server.stop();
      process.exit(0);
    };

    process.on('SIGINT', cleanup);
    process.on('SIGTERM', cleanup);
  } catch (err) {
    p.log.error(theme.error(`${t('cli.ui.startError')} ${(err as Error).message}`));
    process.exit(1);
  }
}
