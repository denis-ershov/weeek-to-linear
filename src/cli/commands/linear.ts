import * as p from '@clack/prompts';
import { getAppConfig } from '../../config/env.js';
import { LinearClient } from '../../clients/linear/client.js';
import { theme, createStyledTable } from '../ui/theme.js';
import { t } from '../../i18n/index.js';

export async function linearTeamsCommand(): Promise<void> {
  const config = getAppConfig();
  if (!config.LINEAR_API_TOKEN) {
    p.cancel(theme.error(t('cli.linear.missingToken')));
    process.exit(1);
  }

  const spinner = p.spinner();
  spinner.start(t('cli.linear.loading'));

  try {
    const client = new LinearClient({ apiToken: config.LINEAR_API_TOKEN });
    const teams = await client.getTeams();

    spinner.stop(theme.success(`${t('cli.linear.found')} ${teams.length}`));

    if (teams.length === 0) {
      console.info(theme.dim(t('cli.linear.empty')));
      return;
    }

    const table = createStyledTable([
      t('cli.linear.colId'),
      t('cli.linear.colKey'),
      t('cli.linear.colName'),
    ]);
    for (const team of teams) {
      table.push([
        team.id,
        theme.primary.bold(team.key),
        theme.bold(team.name),
      ]);
    }

    console.info(table.toString());
  } catch (err) {
    spinner.stop(theme.error(`${t('cli.linear.error')} ${(err as Error).message}`));
    process.exit(1);
  }
}
