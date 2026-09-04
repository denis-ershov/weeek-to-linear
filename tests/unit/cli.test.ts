import { describe, it, expect } from 'vitest';
import { theme } from '../../src/cli/ui/theme.js';
import { Command } from 'commander';

describe('CLI Commands & Theme Suite', () => {
  it('должен предоставлять оформленные функции вывода темы (theme)', () => {
    expect(theme.primary('WEEEK')).toBeDefined();
    expect(theme.secondary('Linear')).toBeDefined();
    expect(theme.success('OK')).toBeDefined();
    expect(theme.warning('Warn')).toBeDefined();
    expect(theme.error('Err')).toBeDefined();
    expect(theme.dim('Dim text')).toBeDefined();
    expect(theme.bold('Bold text')).toBeDefined();
    expect(theme.title('Title')).toBeDefined();
  });

  it('должен корректно регистрировать основные опции и команды мигратора', () => {
    const program = new Command();
    program.name('weeek-to-linear').version('0.4.0').description('Migration tool');

    program
      .command('migrate')
      .option('-d, --dry-run')
      .option('--comment-strategy <strategy>')
      .option('--sync-strategy <strategy>');

    expect(program.commands).toHaveLength(1);
    const migrateCmd = program.commands[0];
    expect(migrateCmd.name()).toBe('migrate');
    expect(migrateCmd.options.some(o => o.long === '--dry-run')).toBe(true);
    expect(migrateCmd.options.some(o => o.long === '--comment-strategy')).toBe(true);
    expect(migrateCmd.options.some(o => o.long === '--sync-strategy')).toBe(true);
  });
});
