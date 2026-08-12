import fs from 'node:fs';
import path from 'node:path';
import type { MigrationSummary, MigrationState } from './types.js';

export class ReportGenerator {
  /**
   * Генерация JSON-отчета
   */
  public static generateJsonReport(
    summary: MigrationSummary,
    state: MigrationState,
    outputPath: string = 'migration-report.json',
  ): string {
    const reportData = {
      summary,
      mapping: {
        projects: state.projects,
        tasks: state.tasks,
        labels: state.labels,
        users: state.users,
      },
    };

    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir) && dir !== '.') {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(outputPath, JSON.stringify(reportData, null, 2), 'utf-8');
    return outputPath;
  }

  /**
   * Генерация Markdown-отчета с красивым Linear-стилем
   */
  public static generateMarkdownReport(
    summary: MigrationSummary,
    state: MigrationState,
    outputPath: string = 'migration-report.md',
  ): string {
    const taskEntries = Object.entries(state.tasks);
    const projectEntries = Object.entries(state.projects);

    let md = `# Отчет о миграции WEEEK → Linear\n\n`;
    md += `**Дата:** ${new Date(summary.startedAt).toLocaleString('ru-RU')}  \n`;
    md += `**Длительность:** ${summary.durationSeconds.toFixed(1)} сек.  \n\n`;

    md += `## 📊 Итоговая статистика\n\n`;
    md += `| Сущность | Всего | Создано | Пропущено | Ошибки |\n`;
    md += `| :--- | :--- | :--- | :--- | :--- |\n`;
    md += `| **Проекты** | ${summary.projects.total} | ${summary.projects.created} | ${summary.projects.skipped} | ${summary.projects.failed} |\n`;
    md += `| **Задачи** | ${summary.tasks.total} | ${summary.tasks.created} | ${summary.tasks.skipped} | ${summary.tasks.failed} |\n`;
    md += `| **Метки** | ${summary.labels.total} | ${summary.labels.created} | ${summary.labels.reused} | 0 |\n\n`;

    md += `**Разрешение связей подзадач:** ${summary.tasks.parentsResolved} успешно, ${summary.tasks.parentsFailed} с предупреждениями.\n\n`;

    if (summary.warnings.length > 0) {
      md += `## ⚠️ Предупреждения (${summary.warnings.length})\n\n`;
      for (const w of summary.warnings) {
        md += `- ${w}\n`;
      }
      md += `\n`;
    }

    if (summary.errors.length > 0) {
      md += `## ❌ Ошибки (${summary.errors.length})\n\n`;
      for (const e of summary.errors) {
        md += `- **[${e.entityType.toUpperCase()}]** (${e.entityId}): ${e.message}\n`;
      }
      md += `\n`;
    }

    md += `## 🔗 Карта соответствия (Mapping)\n\n`;
    md += `### Проекты\n\n`;
    if (projectEntries.length > 0) {
      md += `| WEEEK ID | Linear ID | Название |\n`;
      md += `| :--- | :--- | :--- |\n`;
      for (const [wId, p] of projectEntries) {
        md += `| \`${wId}\` | \`${p.linearProjectId}\` | ${p.name} |\n`;
      }
      md += `\n`;
    } else {
      md += `_Проекты не переносились_\n\n`;
    }

    md += `### Задачи (выборка первых 100)\n\n`;
    if (taskEntries.length > 0) {
      md += `| WEEEK ID | Linear Key / ID | Название |\n`;
      md += `| :--- | :--- | :--- |\n`;
      for (const [wId, t] of taskEntries.slice(0, 100)) {
        md += `| \`${wId}\` | \`${t.linearIssueKey || t.linearIssueId}\` | ${t.title} |\n`;
      }
      if (taskEntries.length > 100) {
        md += `\n_... и еще ${taskEntries.length - 100} задач (полный список доступен в migration-report.json)_\n\n`;
      }
      md += `\n`;
    }

    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir) && dir !== '.') {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(outputPath, md, 'utf-8');
    return outputPath;
  }
}
