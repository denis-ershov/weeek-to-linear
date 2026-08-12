import chalk from 'chalk';
import Table from 'cli-table3';

/**
 * Дизайн-система и цветовая палитра терминала (Linear / Dark theme style)
 */
export const theme = {
  primary: chalk.hex('#5E6AD2'), // Linear Purple
  secondary: chalk.hex('#8A99AD'),
  success: chalk.hex('#4EBA6F'), // Emerald Green
  warning: chalk.hex('#F2994A'), // Amber Orange
  error: chalk.hex('#EB5757'),   // Coral Red
  dim: chalk.hex('#6E7681'),
  bold: chalk.bold,
  title: chalk.bold.hex('#F4F5F8'),
  badge: (text: string) => chalk.bgHex('#5E6AD2').white.bold(` ${text} `),
  successBadge: (text: string) => chalk.bgHex('#4EBA6F').black.bold(` ${text} `),
  warningBadge: (text: string) => chalk.bgHex('#F2994A').black.bold(` ${text} `),
  errorBadge: (text: string) => chalk.bgHex('#EB5757').white.bold(` ${text} `),
};

/**
 * Отрисовка фирменного баннера утилиты
 */
export function printBanner(): void {
  console.info('');
  console.info(
    theme.primary('  ██╗    ██╗███████╗███████╗███████╗██╗  ██╗   ') +
      theme.secondary('→  ') +
      theme.bold.hex('#5E6AD2')('LINEAR'),
  );
  console.info(
    theme.primary('  ██║    ██║██╔════╝██╔════╝██╔════╝██║ ██╔╝   ') +
      theme.dim('Migration Tool v0.1.0'),
  );
  console.info(
    theme.primary('  ██║ █╗ ██║█████╗  █████╗  █████╗  █████╔╝    ') +
      theme.dim('Safe • Idempotent • Production-ready'),
  );
  console.info(
    theme.primary('  ██║███╗██║██╔══╝  ██╔══╝  ██╔══╝  ██╔═██╗    '),
  );
  console.info(
    theme.primary('  ╚███╔███╔╝███████╗███████╗███████╗██║  ██╗   '),
  );
  console.info(
    theme.primary('   ╚══╝╚══╝ ╚══════╝╚══════╝╚══════╝╚═╝  ╚═╝   '),
  );
  console.info('');
}

/**
 * Создание таблицы с аккуратным современным оформлением
 */
export function createStyledTable(head: string[]): Table.Table {
  return new Table({
    head: head.map(h => theme.primary.bold(h)),
    chars: {
      top: '─',
      'top-mid': '┬',
      'top-left': '┌',
      'top-right': '┐',
      bottom: '─',
      'bottom-mid': '┴',
      'bottom-left': '└',
      'bottom-right': '┘',
      left: '│',
      'left-mid': '├',
      mid: '─',
      'mid-mid': '┼',
      right: '│',
      'right-mid': '┤',
      middle: '│',
    },
    style: {
      head: [],
      border: ['grey'],
    },
  });
}
