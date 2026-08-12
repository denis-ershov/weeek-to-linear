import * as p from '@clack/prompts';
import cliProgress from 'cli-progress';
import { getAppConfig } from '../../config/env.js';
import { WeeekClient } from '../../clients/weeek/client.js';
import { LinearClient } from '../../clients/linear/client.js';
import { StateManager } from '../../core/state.js';
import { MigrationEngine } from '../../core/engine.js';
import type { MigrationOptions } from '../../core/types.js';
import { theme, printBanner } from '../ui/theme.js';
import { t } from '../../i18n/index.js';

export async function migrateCommand(cliOptions: {
  dryRun?: boolean;
  resume?: boolean;
  force?: boolean;
  weeekProject?: string;
  linearTeam?: string;
  includeCompleted?: boolean;
  includeDocuments?: boolean;
  createMissingStates?: boolean;
  renameMatchedStates?: boolean;
  recreateAllColumns?: boolean;
  includeDeleted?: boolean;
  syncStrategy?: 'skip' | 'update_all' | 'update_status_only';
  watcherStrategy?: 'none' | 'secondary_assignees' | 'global_watcher' | 'both';
  globalWatcher?: string;
  unmatchedUser?: 'unassigned' | 'skip' | 'abort';
  columnMapping?: Record<string, string>;
  userMapping?: Record<string, string>;
}): Promise<void> {
  printBanner();
  p.intro(theme.title(t('cli.migrate.intro')));

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
  spinner.start(t('cli.migrate.loadingProjects'));

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
    spinner.stop(theme.success(t('cli.migrate.loadedSuccess')));
  } catch (err) {
    spinner.stop(theme.error(`${t('cli.migrate.loadError')} ${(err as Error).message}`));
    process.exit(1);
  }

  if (weeekProjects.length === 0) {
    p.cancel(t('cli.migrate.noProjects'));
    process.exit(0);
  }

  if (linearTeams.length === 0) {
    p.cancel(t('cli.migrate.noTeams'));
    process.exit(0);
  }

  let selectedProjectId = cliOptions.weeekProject;
  if (!selectedProjectId) {
    const projectChoice = await p.select({
      message: t('cli.migrate.selectProject'),
      options: [
        { value: '__all__', label: t('cli.migrate.allProjects') },
        ...weeekProjects.map(prj => ({
          value: prj.id,
          label: `${prj.name} (ID: ${prj.id})`,
        })),
      ],
    });

    if (p.isCancel(projectChoice)) {
      p.cancel(t('common.cancel'));
      process.exit(0);
    }
    selectedProjectId = projectChoice === '__all__' ? undefined : (projectChoice as string);
  }

  let selectedTeamKey = cliOptions.linearTeam;
  if (!selectedTeamKey) {
    const teamChoice = await p.select({
      message: t('cli.migrate.selectTeam'),
      options: linearTeams.map(team => ({
        value: team.key,
        label: `${team.name} [${team.key}]`,
      })),
    });

    if (p.isCancel(teamChoice)) {
      p.cancel(t('common.cancel'));
      process.exit(0);
    }
    selectedTeamKey = teamChoice as string;
  }

  // Интерактивный выбор стратегии колонок
  let createMissingStates = cliOptions.createMissingStates ?? true;
  let renameMatchedStates = cliOptions.renameMatchedStates ?? false;
  let recreateAllColumns = cliOptions.recreateAllColumns ?? false;

  if (
    !cliOptions.weeekProject &&
    !cliOptions.createMissingStates &&
    !cliOptions.renameMatchedStates &&
    !cliOptions.recreateAllColumns
  ) {
    const columnModeChoice = await p.select({
      message: t('cli.migrate.columnModeQuestion'),
      options: [
        { value: 'create_missing', label: t('cli.migrate.columnModeCreateMissing') },
        { value: 'rename_matched', label: t('cli.migrate.columnModeRename') },
        { value: 'recreate_1to1', label: t('cli.migrate.columnModeRecreate') },
        { value: 'existing_only', label: t('cli.migrate.columnModeExisting') },
      ],
    });

    if (p.isCancel(columnModeChoice)) {
      p.cancel(t('common.cancel'));
      process.exit(0);
    }

    if (columnModeChoice === 'create_missing') {
      createMissingStates = true;
    } else if (columnModeChoice === 'rename_matched') {
      createMissingStates = true;
      renameMatchedStates = true;
    } else if (columnModeChoice === 'recreate_1to1') {
      recreateAllColumns = true;
    } else if (columnModeChoice === 'existing_only') {
      createMissingStates = false;
    }
  }

  // Интерактивный выбор наблюдателей
  let watcherStrategy = cliOptions.watcherStrategy || 'none';
  let globalWatcherUserId = cliOptions.globalWatcher;

  if (!cliOptions.weeekProject && !cliOptions.watcherStrategy) {
    const watcherChoice = await p.select({
      message: t('cli.migrate.watcherQuestion'),
      options: [
        { value: 'secondary_assignees', label: t('cli.migrate.watcherSecondary') },
        { value: 'none', label: t('cli.migrate.watcherNone') },
        { value: 'global_watcher', label: t('cli.migrate.watcherGlobal') },
        { value: 'both', label: t('cli.migrate.watcherBoth') },
      ],
    });

    if (p.isCancel(watcherChoice)) {
      p.cancel(t('common.cancel'));
      process.exit(0);
    }

    watcherStrategy = watcherChoice as 'none' | 'secondary_assignees' | 'global_watcher' | 'both';

    if ((watcherStrategy === 'global_watcher' || watcherStrategy === 'both') && !globalWatcherUserId) {
      const linearUsers = await linearClient.getUsers();
      if (linearUsers.length > 0) {
        const userChoice = await p.select({
          message: t('cli.migrate.selectGlobalWatcher'),
          options: linearUsers.map(u => ({
            value: u.id,
            label: `${u.name} (${u.email})`,
          })),
        });
        if (!p.isCancel(userChoice)) {
          globalWatcherUserId = userChoice as string;
        }
      }
    }
  }

  // Интерактивный выбор стратегии повторного переноса
  let syncStrategy = cliOptions.syncStrategy || 'skip';
  if (!cliOptions.weeekProject && !cliOptions.syncStrategy) {
    const syncChoice = await p.select({
      message: t('cli.migrate.syncQuestion'),
      options: [
        { value: 'skip', label: t('cli.migrate.syncSkip') },
        { value: 'update_all', label: t('cli.migrate.syncUpdateAll') },
        { value: 'update_status_only', label: t('cli.migrate.syncUpdateStatus') },
      ],
    });

    if (!p.isCancel(syncChoice)) {
      syncStrategy = syncChoice as 'skip' | 'update_all' | 'update_status_only';
    }
  }

  // Проверка существующего состояния (Resume)
  const existingTasksCount = Object.keys(stateManager.getState().tasks).length;
  if (existingTasksCount > 0 && !cliOptions.force && !cliOptions.resume) {
    const resumeConfirmMsg = t('cli.migrate.resumeConfirm').replace(
      '{count}',
      String(existingTasksCount),
    );
    const resumeChoice = await p.confirm({
      message: resumeConfirmMsg,
      initialValue: true,
    });

    if (p.isCancel(resumeChoice)) {
      p.cancel(t('common.cancel'));
      process.exit(0);
    }

    if (!resumeChoice) {
      const forceChoice = await p.confirm({
        message: t('cli.migrate.forceConfirm'),
        initialValue: false,
      });
      if (p.isCancel(forceChoice) || !forceChoice) {
        p.cancel(t('common.cancel'));
        process.exit(0);
      }
      stateManager.clear();
    }
  }

  // Прогресс-бар
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
    includeDocuments: cliOptions.includeDocuments ?? true,
    createMissingStates,
    renameMatchedStates,
    recreateAllColumns,
    boardColumnMapping: cliOptions.columnMapping,
    userMapping: cliOptions.userMapping,
    includeDeleted: cliOptions.includeDeleted ?? false,
    syncStrategy,
    watcherStrategy,
    globalWatcherUserId,
    unmatchedUserStrategy: cliOptions.unmatchedUser || 'unassigned',
  };

  try {
    const { summary, reportPaths } = await engine.run(migrationOptions);

    if (isBarActive) {
      progressBar.stop();
    }

    if (cliOptions.dryRun) {
      p.note(
        `${t('cli.migrate.projCreated')} ${summary.projects.created}\n` +
          `${t('cli.migrate.tasksCreated')} ${summary.tasks.created}\n` +
          `${t('cli.migrate.labelsCreated')} ${summary.labels.created} (${t('cli.migrate.labelsReused')}: ${summary.labels.reused})\n` +
          `${t('cli.migrate.warnings')} ${summary.warnings.length}\n` +
          `${t('cli.migrate.errors')} ${summary.errors.length}\n\n` +
          `${t('cli.migrate.reportMd')} ${theme.primary(reportPaths.markdown)}`,
        theme.warningBadge(t('cli.migrate.dryRunBadge')),
      );
    } else {
      p.note(
        `${t('cli.migrate.projCreated')} ${theme.bold(String(summary.projects.created))} (${t('cli.migrate.projSkipped')}: ${summary.projects.skipped})\n` +
          `${t('cli.migrate.tasksCreated')} ${theme.bold(String(summary.tasks.created))} (${t('cli.migrate.tasksSkipped')}: ${summary.tasks.skipped})\n` +
          `${t('cli.migrate.labelsCreated')} ${theme.bold(String(summary.labels.created))} (${t('cli.migrate.labelsReused')}: ${summary.labels.reused})\n` +
          `${t('cli.migrate.parentsResolved')} ${theme.bold(String(summary.tasks.parentsResolved))}\n` +
          `${t('cli.migrate.errors')} ${summary.errors.length === 0 ? theme.success('0') : theme.error(String(summary.errors.length))}\n\n` +
          `${t('cli.migrate.reportSaved')}\n` +
          `${t('cli.migrate.reportMd')} ${theme.primary(reportPaths.markdown)}\n` +
          `${t('cli.migrate.reportJson')} ${theme.primary(reportPaths.json)}`,
        summary.errors.length === 0
          ? theme.successBadge(t('cli.migrate.successBadge'))
          : theme.warningBadge(t('cli.migrate.errorBadge')),
      );
    }

    p.outro(theme.bold(t('cli.migrate.outro')));
  } catch (err) {
    if (isBarActive) progressBar.stop();
    p.log.error(theme.error(`${t('cli.migrate.criticalError')} ${(err as Error).message}`));
    process.exit(1);
  }
}
