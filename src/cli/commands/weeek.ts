import * as p from '@clack/prompts';
import { getAppConfig } from '../../config/env.js';
import { WeeekClient } from '../../clients/weeek/client.js';
import { theme, createStyledTable } from '../ui/theme.js';

export async function weeekProjectsCommand(): Promise<void> {
  const config = getAppConfig();
  if (!config.WEEEK_API_TOKEN) {
    p.cancel(theme.error('WEEEK_API_TOKEN не задан. Укажите его в .env'));
    process.exit(1);
  }

  const spinner = p.spinner();
  spinner.start('Загрузка проектов WEEEK...');

  try {
    const client = new WeeekClient({ apiToken: config.WEEEK_API_TOKEN });
    const projects = await client.getProjects();

    spinner.stop(theme.success(`Найдено проектов: ${projects.length}`));

    if (projects.length === 0) {
      console.info(theme.dim('В вашем рабочем пространстве WEEEK пока нет проектов.'));
      return;
    }

    const table = createStyledTable(['ID', 'Название проекта', 'Описание']);
    for (const project of projects) {
      table.push([
        project.id,
        theme.bold(project.name),
        project.description ? theme.dim(project.description.slice(0, 50)) : theme.dim('—'),
      ]);
    }

    console.info(table.toString());
  } catch (err) {
    spinner.stop(theme.error(`Ошибка: ${(err as Error).message}`));
    process.exit(1);
  }
}
