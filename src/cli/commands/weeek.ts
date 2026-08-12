import * as p from '@clack/prompts';
import { getAppConfig } from '../../config/env.js';
import { WeeekClient } from '../../clients/weeek/client.js';
import { theme, createStyledTable } from '../ui/theme.js';
import { t } from '../../i18n/index.js';

export async function weeekProjectsCommand(): Promise<void> {
  const config = getAppConfig();
  if (!config.WEEEK_API_TOKEN) {
    p.cancel(theme.error(t('cli.weeek.missingToken')));
    process.exit(1);
  }

  const spinner = p.spinner();
  spinner.start(t('cli.weeek.loading'));

  try {
    const client = new WeeekClient({ apiToken: config.WEEEK_API_TOKEN });
    const projects = await client.getProjects();

    spinner.stop(theme.success(`${t('cli.weeek.found')} ${projects.length}`));

    if (projects.length === 0) {
      console.info(theme.dim(t('cli.weeek.empty')));
      return;
    }

    const table = createStyledTable([
      t('cli.weeek.colId'),
      t('cli.weeek.colName'),
      t('cli.weeek.colDesc'),
    ]);
    for (const project of projects) {
      table.push([
        project.id,
        theme.bold(project.name),
        project.description ? theme.dim(project.description.slice(0, 50)) : theme.dim('—'),
      ]);
    }

    console.info(table.toString());
  } catch (err) {
    spinner.stop(theme.error(`${t('cli.weeek.error')} ${(err as Error).message}`));
    process.exit(1);
  }
}
