import * as p from '@clack/prompts';
import { getAppConfig } from '../../config/env.js';
import { WeeekClient } from '../../clients/weeek/client.js';
import { LinearClient } from '../../clients/linear/client.js';
import { theme, printBanner } from '../ui/theme.js';
import { t } from '../../i18n/index.js';

export async function authTestCommand(): Promise<void> {
  printBanner();
  p.intro(theme.title(t('cli.auth.intro')));

  const config = getAppConfig();
  let weeekToken = config.WEEEK_API_TOKEN;
  let linearToken = config.LINEAR_API_TOKEN;

  if (!weeekToken) {
    const input = await p.text({
      message: t('cli.auth.enterWeeekToken'),
      placeholder: 'eyJhbGciOiJIUzI1Ni...',
      validate: val => (!val ? t('common.tokenRequired') : undefined),
    });
    if (p.isCancel(input)) {
      p.cancel(t('common.cancel'));
      process.exit(0);
    }
    weeekToken = input;
  }

  if (!linearToken) {
    const input = await p.password({
      message: t('cli.auth.enterLinearToken'),
      validate: val => (!val ? t('common.tokenRequired') : undefined),
    });
    if (p.isCancel(input)) {
      p.cancel(t('common.cancel'));
      process.exit(0);
    }
    linearToken = input;
  }

  const spinner = p.spinner();

  // 1. Проверка WEEEK
  spinner.start(t('cli.auth.checkingWeeek'));
  let weeekUser: { name: string; email: string };
  try {
    const weeekClient = new WeeekClient({ apiToken: weeekToken });
    const me = await weeekClient.getMe();
    weeekUser = { name: me.name || t('cli.auth.defaultUser'), email: me.email };
    spinner.stop(theme.success(t('cli.auth.weeekSuccess')));
  } catch (err) {
    spinner.stop(theme.error(`${t('cli.auth.weeekError')} ${(err as Error).message}`));
    process.exit(1);
  }

  // 2. Проверка Linear
  spinner.start(t('cli.auth.checkingLinear'));
  let linearViewer: { name: string; email: string; organizationName?: string };
  try {
    const linearClient = new LinearClient({ apiToken: linearToken });
    linearViewer = await linearClient.getViewer();
    spinner.stop(theme.success(t('cli.auth.linearSuccess')));
  } catch (err) {
    spinner.stop(theme.error(`${t('cli.auth.linearError')} ${(err as Error).message}`));
    process.exit(1);
  }

  p.note(
    `${t('cli.auth.weeekUser')} ${theme.bold(weeekUser.name)} (${theme.dim(weeekUser.email)})\n` +
      `${t('cli.auth.linearAccount')} ${theme.bold(linearViewer.name)} (${theme.dim(linearViewer.email)})\n` +
      `${t('cli.auth.linearOrg')} ${theme.primary.bold(linearViewer.organizationName || t('cli.auth.personalSpace'))}`,
    t('cli.auth.accountsNote'),
  );

  p.outro(theme.successBadge(t('cli.auth.outro')));
}
