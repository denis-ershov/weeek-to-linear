import { Command } from 'commander';
import { authTestCommand } from './commands/auth.js';
import { weeekProjectsCommand } from './commands/weeek.js';
import { linearTeamsCommand } from './commands/linear.js';
import { migrateCommand } from './commands/migrate.js';
import { uiCommand } from './commands/ui.js';
import { CONSTANTS } from '../config/constants.js';
import { detectLocale, setLocale, t } from '../i18n/index.js';
import type { TaskRoutingRule } from '../core/types.js';

// Определяем язык ДО регистрации команд — чтобы описания были локализованы
setLocale(detectLocale());

const program = new Command();

program
  .name(CONSTANTS.APP_NAME)
  .description(t('cli.description'))
  .version(CONSTANTS.APP_VERSION, '-v, --version', t('cli.versionFlag'))
  .option('--lang <ru|en>', t('cli.flags.lang'), detectLocale());

program.command('auth:test').description(t('cli.commands.authTest')).action(authTestCommand);

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
  .option('--sync-strategy <strategy>', t('cli.flags.syncStrategy'), 'skip')
  .option('--comment-strategy <strategy>', t('cli.flags.commentStrategy'), 'none')
  .option('--watcher-strategy <strategy>', t('cli.flags.watcherStrategy'), 'none')
  .option('--global-watcher <userId>', t('cli.flags.globalWatcher'))
  .option('--unmatched-user <strategy>', t('cli.flags.unmatchedUser'), 'unassigned')
  .option(
    '--custom-fields-strategy <strategy>',
    'Стратегия переноса кастомных полей (append_to_description|none)',
    'append_to_description',
  )
  .option('--custom-fields-mapping <json>', 'JSON сопоставления кастомных полей WEEEK')
  .option(
    '--ignore-custom-fields <list>',
    'Список имён или ID кастомных полей для пропуска (через запятую)',
  )
  .option('--fallback-assignee <strategy>', t('cli.flags.fallbackAssignee'), 'unassigned')
  .option('--fallback-assignee-user <userId>', t('cli.flags.fallbackAssigneeUser'))
  .option('--creator-strategy <strategy>', t('cli.flags.creatorStrategy'), 'header')
  .option('--subscribe-comment-authors', t('cli.flags.subscribeCommentAuthors'), true)
  .option('--no-subscribe-comment-authors', 'Не подписывать авторов комментариев')
  .option('--exclude-system-comments', t('cli.flags.excludeSystemComments'), true)
  .option('--no-exclude-system-comments', 'Не исключать системные комментарии')
  .option('--project-team-mapping <json>', t('cli.flags.projectTeamMapping'))
  .option('--routing-rules <json>', t('cli.flags.routingRules'))
  .action(options => {
    let parsedColumnMapping: Record<string, string> | undefined;
    let parsedUserMapping: Record<string, string> | undefined;
    let parsedCustomFieldsMapping: Record<string, string> | undefined;
    let parsedIgnoreCustomFields: string[] | undefined;
    let parsedProjectTeamMapping: Record<string, string> | undefined;
    let parsedRoutingRules: TaskRoutingRule[] | undefined;

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

    if (options.customFieldsMapping) {
      try {
        parsedCustomFieldsMapping = JSON.parse(options.customFieldsMapping);
      } catch {
        console.error(`${t('cli.migrate.jsonError')} --custom-fields-mapping`);
      }
    }

    if (options.projectTeamMapping) {
      try {
        parsedProjectTeamMapping = JSON.parse(options.projectTeamMapping);
      } catch {
        console.error(`${t('cli.migrate.jsonError')} --project-team-mapping`);
      }
    }

    if (options.routingRules) {
      try {
        parsedRoutingRules = JSON.parse(options.routingRules);
      } catch {
        console.error(`${t('cli.migrate.jsonError')} --routing-rules`);
      }
    }

    if (options.ignoreCustomFields) {
      parsedIgnoreCustomFields = String(options.ignoreCustomFields)
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);
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
      commentStrategy: options.commentStrategy,
      customFieldsStrategy: options.customFieldsStrategy,
      customFieldsMapping: parsedCustomFieldsMapping,
      ignoreCustomFields: parsedIgnoreCustomFields,
      watcherStrategy: options.watcherStrategy,
      globalWatcher: options.globalWatcher,
      unmatchedUser: options.unmatchedUser,
      columnMapping: parsedColumnMapping,
      userMapping: parsedUserMapping,
      fallbackAssignee: options.fallbackAssignee,
      fallbackAssigneeUserId: options.fallbackAssigneeUser,
      creatorStrategy: options.creatorStrategy,
      subscribeCommentAuthors: options.subscribeCommentAuthors,
      commentFilterStrategy: options.excludeSystemComments ? 'exclude_system' : 'all',
      projectTeamMapping: parsedProjectTeamMapping,
      routingRules: parsedRoutingRules,
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
