import { Command } from 'commander';
import { authTestCommand } from './commands/auth.js';
import { weeekProjectsCommand } from './commands/weeek.js';
import { linearTeamsCommand } from './commands/linear.js';
import { migrateCommand } from './commands/migrate.js';
import { uiCommand } from './commands/ui.js';
import { CONSTANTS } from '../config/constants.js';

const program = new Command();

program
  .name(CONSTANTS.APP_NAME)
  .description('Open-source CLI tool for safe, idempotent migration from WEEEK to Linear')
  .version(CONSTANTS.APP_VERSION, '-v, --version', 'Вывод текущей версии утилиты');

program
  .command('auth:test')
  .description('Проверка подключения к API WEEEK и Linear')
  .action(authTestCommand);

program
  .command('weeek:projects')
  .description('Получение списка проектов из рабочего пространства WEEEK')
  .action(weeekProjectsCommand);

program
  .command('linear:teams')
  .description('Получение списка доступных команд Linear')
  .action(linearTeamsCommand);

program
  .command('migrate')
  .description('Запуск интерактивного мастера миграции задач и проектов из WEEEK в Linear')
  .option('-d, --dry-run', 'Режим симуляции: валидация и маппинг без создания сущностей в Linear')
  .option('-r, --resume', 'Продолжить незавершенную миграцию на основе сохраненного состояния')
  .option('-f, --force', 'Принудительный запуск с очисткой сохраненного состояния')
  .option('-p, --weeek-project <id>', 'ID проекта WEEEK для миграции (неинтерактивный режим)')
  .option('-t, --linear-team <key>', 'Ключ команды Linear, например ENG (неинтерактивный режим)')
  .option('--no-completed', 'Не переносить завершенные задачи')
  .option('--include-deleted', 'Переносить удаленные задачи WEEEK')
  .option(
    '--unmatched-user <strategy>',
    'Действие при ненайденном пользователе: unassigned | skip | abort',
    'unassigned',
  )
  .action(options => {
    return migrateCommand({
      dryRun: options.dryRun,
      resume: options.resume,
      force: options.force,
      weeekProject: options.weeekProject,
      linearTeam: options.linearTeam,
      includeCompleted: options.completed,
      includeDeleted: options.includeDeleted,
      unmatchedUser: options.unmatchedUser,
    });
  });

program
  .command('ui')
  .alias('web')
  .description('Запуск визуального веб-интерфейса для управления миграцией')
  .option('-p, --port <number>', 'Порт для запуска сервера (по умолчанию: 3456)')
  .option('--no-open', 'Не открывать браузер автоматически')
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
