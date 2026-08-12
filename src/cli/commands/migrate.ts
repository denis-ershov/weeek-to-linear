import * as p from '@clack/prompts';
import cliProgress from 'cli-progress';
import { getAppConfig } from '../../config/env.js';
import { WeeekClient } from '../../clients/weeek/client.js';
import { LinearClient } from '../../clients/linear/client.js';
import { StateManager } from '../../core/state.js';
import { MigrationEngine } from '../../core/engine.js';
import type { MigrationOptions } from '../../core/types.js';
import { theme, printBanner } from '../ui/theme.js';

export async function migrateCommand(cliOptions: {
  dryRun?: boolean;
  resume?: boolean;
  force?: boolean;
  weeekProject?: string;
  linearTeam?: string;
  includeCompleted?: boolean;
  includeDeleted?: boolean;
  unmatchedUser?: 'unassigned' | 'skip' | 'abort';
}): Promise<void> {
  printBanner();
  p.intro(theme.title('Мастер миграции из WEEEK в Linear'));

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
      p.cancel('Миграция отменена');
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
      p.cancel('Миграция отменена');
      process.exit(0);
    }
    linearToken = input;
  }

  const spinner = p.spinner();
  spinner.start('Проверка подключения и загрузка проектов...');

  const weeekClient = new WeeekClient({ apiToken: weeekToken });
  const linearClient = new LinearClient({ apiToken: linearToken });
  const stateManager = new StateManager(config.STATE_FILE);

  let weeekProjects;
  let linearTeams;
  try {
    [weeekProjects, linearTeams] = await Promise.all([
      weeekClient.getProjects(),
      linearClient.getTeams(),
    ]);
    spinner.stop(theme.success('✓ Проекты и команды успешно загружены'));
  } catch (err) {
    spinner.stop(theme.error(`Ошибка загрузки: ${(err as Error).message}`));
    process.exit(1);
  }

  if (weeekProjects.length === 0) {
    p.cancel('В WEEEK не найдено ни одного проекта.');
    process.exit(0);
  }

  if (linearTeams.length === 0) {
    p.cancel('В Linear не найдено ни одной команды.');
    process.exit(0);
  }

  let selectedProjectId = cliOptions.weeekProject;
  if (!selectedProjectId) {
    const projectChoice = await p.select({
      message: 'Выберите проект WEEEK для миграции:',
      options: [
        { value: '__all__', label: '📦 Все проекты WEEEK' },
        ...weeekProjects.map(prj => ({
          value: prj.id,
          label: `${prj.name} (ID: ${prj.id})`,
        })),
      ],
    });

    if (p.isCancel(projectChoice)) {
      p.cancel('Миграция отменена');
      process.exit(0);
    }
    selectedProjectId = projectChoice === '__all__' ? undefined : (projectChoice as string);
  }

  let selectedTeamKey = cliOptions.linearTeam;
  if (!selectedTeamKey) {
    const teamChoice = await p.select({
      message: 'Выберите целевую команду Linear:',
      options: linearTeams.map(team => ({
        value: team.key,
        label: `${team.name} [${team.key}]`,
      })),
    });

    if (p.isCancel(teamChoice)) {
      p.cancel('Миграция отменена');
      process.exit(0);
    }
    selectedTeamKey = teamChoice as string;
  }

  // Проверка существующего состояния (Resume)
  const existingTasksCount = Object.keys(stateManager.getState().tasks).length;
  if (existingTasksCount > 0 && !cliOptions.force && !cliOptions.resume) {
    const resumeChoice = await p.confirm({
      message: `Обнаружена предыдущая миграция (${existingTasksCount} сохраненных задач). Продолжить (Resume)?`,
      initialValue: true,
    });

    if (p.isCancel(resumeChoice)) {
      p.cancel('Миграция отменена');
      process.exit(0);
    }

    if (!resumeChoice) {
      const forceChoice = await p.confirm({
        message: 'Сбросить сохраненный прогресс и начать заново (--force)?',
        initialValue: false,
      });
      if (p.isCancel(forceChoice) || !forceChoice) {
        p.cancel('Миграция отменена');
        process.exit(0);
      }
      stateManager.clear();
    }
  }

  // Настройка прогресс-бара
  const progressBar = new cliProgress.SingleBar(
    {
      format: `${theme.primary('{bar}')} | {percentage}% | {value}/{total} {type} | {item}`,
      barCompleteChar: '\u2588',
      barIncompleteChar: '\u2591',
      hideCursor: true,
    },
    cliProgress.Presets.shades_classic,
  );

  let isBarActive = false;

  const engine = new MigrationEngine(weeekClient, linearClient, stateManager, {
    onStage: (_num, stageName) => {
      if (isBarActive) {
        progressBar.stop();
        isBarActive = false;
      }
      p.log.step(theme.bold(stageName));
    },
    onProgress: (type, current, total, itemName) => {
      if (!isBarActive) {
        progressBar.start(total, current, { type, item: itemName || '' });
        isBarActive = true;
      } else {
        progressBar.setTotal(total);
        progressBar.update(current, { type, item: (itemName || '').slice(0, 30) });
      }
    },
    onWarning: msg => {
      p.log.warn(theme.warning(msg));
    },
    onError: err => {
      p.log.error(theme.error(`[${err.entityType.toUpperCase()}] ${err.message}`));
    },
  });

  const migrationOptions: MigrationOptions = {
    weeekProjectId: selectedProjectId,
    linearTeamKey: selectedTeamKey,
    dryRun: cliOptions.dryRun,
    resume: cliOptions.resume,
    force: cliOptions.force,
    includeCompleted: cliOptions.includeCompleted ?? true,
    includeDeleted: cliOptions.includeDeleted ?? false,
    unmatchedUserStrategy: cliOptions.unmatchedUser || 'unassigned',
  };

  try {
    const { summary, reportPaths } = await engine.run(migrationOptions);

    if (isBarActive) {
      progressBar.stop();
    }

    if (cliOptions.dryRun) {
      p.note(
        `Проектов к созданию: ${summary.projects.created}\n` +
          `Задач к созданию:    ${summary.tasks.created}\n` +
          `Меток к созданию:    ${summary.labels.created} (существующих: ${summary.labels.reused})\n` +
          `Предупреждений:      ${summary.warnings.length}\n` +
          `Ошибок:              ${summary.errors.length}\n\n` +
          `Отчет: ${theme.primary(reportPaths.markdown)}`,
        theme.warningBadge('РЕЖИМ DRY RUN ЗАВЕРШЕН — ИЗМЕНЕНИЯ НЕ ВНОСИЛИСЬ'),
      );
    } else {
      p.note(
        `Создано проектов: ${theme.bold(summary.projects.created)} (пропущено: ${summary.projects.skipped})\n` +
          `Создано задач:    ${theme.bold(summary.tasks.created)} (пропущено: ${summary.tasks.skipped})\n` +
          `Создано меток:    ${theme.bold(summary.labels.created)} (переиспользовано: ${summary.labels.reused})\n` +
          `Связей подзадач:  ${theme.bold(summary.tasks.parentsResolved)}\n` +
          `Ошибок:           ${summary.errors.length === 0 ? theme.success('0') : theme.error(String(summary.errors.length))}\n\n` +
          `Детальный отчет сохранен:\n` +
          `- Markdown: ${theme.primary(reportPaths.markdown)}\n` +
          `- JSON:     ${theme.primary(reportPaths.json)}`,
        summary.errors.length === 0 ? theme.successBadge('МИГРАЦИЯ УСПЕШНО ЗАВЕРШЕНА') : theme.warningBadge('МИГРАЦИЯ ЗАВЕРШЕНА С ОШИБКАМИ'),
      );
    }

    p.outro(theme.bold('Спасибо за использование WEEEK → Linear Migration Tool!'));
  } catch (err) {
    if (isBarActive) progressBar.stop();
    p.log.error(theme.error(`Критическая ошибка миграции: ${(err as Error).message}`));
    process.exit(1);
  }
}
