import * as p from '@clack/prompts';
import { getAppConfig } from '../../config/env.js';
import { WeeekClient } from '../../clients/weeek/client.js';
import { LinearClient } from '../../clients/linear/client.js';
import { theme, printBanner } from '../ui/theme.js';

export async function authTestCommand(): Promise<void> {
  printBanner();
  p.intro(theme.title('Проверка подключения к API WEEEK и Linear'));

  const config = getAppConfig();
  let weeekToken = config.WEEEK_API_TOKEN;
  let linearToken = config.LINEAR_API_TOKEN;

  if (!weeekToken) {
    const input = await p.text({
      message: 'Введите WEEEK API токен:',
      placeholder: 'eyJhbGciOiJIUzI1Ni...',
      validate: val => (!val ? 'Токен обязателен' : undefined),
    });
    if (p.isCancel(input)) {
      p.cancel('Операция отменена');
      process.exit(0);
    }
    weeekToken = input;
  }

  if (!linearToken) {
    const input = await p.password({
      message: 'Введите Linear Personal API Key:',
      validate: val => (!val ? 'Токен обязателен' : undefined),
    });
    if (p.isCancel(input)) {
      p.cancel('Операция отменена');
      process.exit(0);
    }
    linearToken = input;
  }

  const spinner = p.spinner();

  // 1. Проверка WEEEK
  spinner.start('Проверка подключения к WEEEK API...');
  let weeekUser: { name: string; email: string };
  try {
    const weeekClient = new WeeekClient({ apiToken: weeekToken });
    const me = await weeekClient.getMe();
    weeekUser = { name: me.name || 'Пользователь', email: me.email };
    spinner.stop(theme.success('✓ WEEEK API: Подключение успешно'));
  } catch (err) {
    spinner.stop(theme.error(`✗ Ошибка подключения к WEEEK API: ${(err as Error).message}`));
    process.exit(1);
  }

  // 2. Проверка Linear
  spinner.start('Проверка подключения к Linear GraphQL API...');
  let linearViewer: { name: string; email: string; organizationName?: string };
  try {
    const linearClient = new LinearClient({ apiToken: linearToken });
    linearViewer = await linearClient.getViewer();
    spinner.stop(theme.success('✓ Linear API: Подключение успешно'));
  } catch (err) {
    spinner.stop(theme.error(`✗ Ошибка подключения к Linear API: ${(err as Error).message}`));
    process.exit(1);
  }

  p.note(
    `WEEEK пользователь: ${theme.bold(weeekUser.name)} (${theme.dim(weeekUser.email)})\n` +
      `Linear аккаунт:     ${theme.bold(linearViewer.name)} (${theme.dim(linearViewer.email)})\n` +
      `Linear организация: ${theme.primary.bold(linearViewer.organizationName || 'Личное пространство')}`,
    'Информация об учетных записях',
  );

  p.outro(theme.successBadge('Все подключения проверены и готовы к миграции!'));
}
