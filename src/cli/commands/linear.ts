import * as p from '@clack/prompts';
import { getAppConfig } from '../../config/env.js';
import { LinearClient } from '../../clients/linear/client.js';
import { theme, createStyledTable } from '../ui/theme.js';

export async function linearTeamsCommand(): Promise<void> {
  const config = getAppConfig();
  if (!config.LINEAR_API_TOKEN) {
    p.cancel(theme.error('LINEAR_API_TOKEN не задан. Укажите его в .env'));
    process.exit(1);
  }

  const spinner = p.spinner();
  spinner.start('Загрузка команд Linear...');

  try {
    const client = new LinearClient({ apiToken: config.LINEAR_API_TOKEN });
    const teams = await client.getTeams();

    spinner.stop(theme.success(`Найдено команд: ${teams.length}`));

    if (teams.length === 0) {
      console.info(theme.dim('В организации Linear пока нет команд.'));
      return;
    }

    const table = createStyledTable(['ID', 'Ключ (Key)', 'Название команды']);
    for (const team of teams) {
      table.push([
        team.id,
        theme.primary.bold(team.key),
        theme.bold(team.name),
      ]);
    }

    console.info(table.toString());
  } catch (err) {
    spinner.stop(theme.error(`Ошибка: ${(err as Error).message}`));
    process.exit(1);
  }
}
