import { Command } from 'commander';
import { authTestCommand } from './commands/auth.js';
import { weeekProjectsCommand } from './commands/weeek.js';
import { linearTeamsCommand } from './commands/linear.js';
import { migrateCommand } from './commands/migrate.js';
import { uiCommand } from './commands/ui.js';
import { CONSTANTS } from '../config/constants.js';
import { detectLocale, setLocale, t } from '../i18n/index.js';

// Определяем язык ДО регистрации команд — чтобы описания были локализованы
setLocale(detectLocale());

const program = new Command();

program
  .name(CONSTANTS.APP_NAME)
  .description(t('cli.description'))
  .version(CONSTANTS.APP_VERSION, '-v, --version', t('cli.versionFlag'))
  .option('--lang <ru|en>', t('cli.flags.lang'), detectLocale());

program
  .command('auth:test')
  .description(t('cli.commands.authTest'))
  .action(authTestCommand);

program
  .command('weeek:projects')
  .description(t('cli.commands.weeekProjects'))
  .action(weeekProjectsCommand);

program
  .command('linear:teams')
  .description(t('cli.commands.linearTeams'))
  .action(linearTeamsCommand);

program
  .command('migrate')
  .description(t('cli.commands.migrate'))
  .option('-d, --dry-run', t('cli.flags.dryRun'))
  .option('-r, --resume', t('cli.flags.resume'))
  .option('-f, --force', t('cli.flags.force'))
  .option('-p, --weeek-project <id>', t('cli.flags.weeekProject'))
  .option('-t, --linear-team <key>', t('cli.flags.linearTeam'))
  .option('--no-completed', t('cli.flags.noCompleted'))
  .option('--no-docs', t('cli.flags.noDocs'))
  .option('--create-missing-states', t('cli.flags.createMissingStates'), false)
  .option('--rename-matched-states', t('cli.flags.renameMatchedStates'), false)
  .option('--recreate-columns', t('cli.flags.recreateColumns'), false)
  .option('--include-deleted', t('cli.flags.includeDeleted'))
  .option(
    '--sync-strategy <strategy>',
    t('cli.flags.syncStrategy'),
    'skip',
  )
  .option(
    '--watcher-strategy <strategy>',
    t('cli.flags.watcherStrategy'),
    'none',
  )
  .option('--global-watcher <userId>', t('cli.flags.globalWatcher'))
  .option(
    '--unmatched-user <strategy>',
    t('cli.flags.unmatchedUser'),
    'unassigned',
  )
  .option('--column-mapping <json>', t('cli.flags.columnMapping'))
  .option('--user-mapping <json>', t('cli.flags.userMapping'))
  .action(options => {
    let parsedColumnMapping: Record<string, string> | undefined;
    let parsedUserMapping: Record<string, string> | undefined;

    if (options.columnMapping) {
      try {
        parsedColumnMapping = JSON.parse(options.columnMapping);
      } catch {
        console.error(`${t('cli.migrate.jsonError')} --column-mapping`);
      }
    }

    if (options.userMapping) {
      try {
        parsedUserMapping = JSON.parse(options.userMapping);
      } catch {
        console.error(`${t('cli.migrate.jsonError')} --user-mapping`);
      }
    }

    return migrateCommand({
      dryRun: options.dryRun,
      resume: options.resume,
      force: options.force,
      weeekProject: options.weeekProject,
      linearTeam: options.linearTeam,
      includeCompleted: options.completed,
      includeDocuments: options.docs,
      createMissingStates: options.createMissingStates,
      renameMatchedStates: options.renameMatchedStates,
      recreateAllColumns: options.recreateColumns,
      includeDeleted: options.includeDeleted,
      syncStrategy: options.syncStrategy,
      watcherStrategy: options.watcherStrategy,
      globalWatcher: options.globalWatcher,
      unmatchedUser: options.unmatchedUser,
      columnMapping: parsedColumnMapping,
      userMapping: parsedUserMapping,
    });
  });

program
  .command('ui')
  .alias('web')
  .description(t('cli.commands.ui'))
  .option('-p, --port <number>', t('cli.flags.port'))
  .option('--no-open', t('cli.flags.noOpen'))
  .action(options => {
    return uiCommand({
      port: options.port,
      open: options.open,
    });
  });

// Если аргументы не переданы, запускаем интерактивную миграцию по умолчанию
if (process.argv.length <= 2) {
  process.argv.push('migrate');
}

program.parse(process.argv);
