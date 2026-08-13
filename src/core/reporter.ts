import fs from 'node:fs';
import path from 'node:path';
import type { MigrationSummary, MigrationState } from './types.js';
import { t, tf, getLocale } from '../i18n/index.js';

export class ReportGenerator {
  /**
   * Сохранение отчета в формате JSON
   */
  public static generateJsonReport(
    summary: MigrationSummary,
    state: MigrationState,
    outputPath: string = 'migration-report.json',
  ): string {
    const reportData = {
      summary,
      state,
      mapping: {
        projects: state.projects,
        tasks: state.tasks,
        labels: state.labels,
        users: state.users,
        boardColumns: state.boardColumns || {},
        documents: state.documents || {},
      },
      exportedAt: new Date().toISOString(),
    };

    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir) && dir !== '.') {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(outputPath, JSON.stringify(reportData, null, 2), 'utf-8');
    return outputPath;
  }

  /**
   * Генерация понятного человеку отчета в формате Markdown
   */
  public static generateMarkdownReport(
    summary: MigrationSummary,
    state: MigrationState,
    outputPath: string = 'migration-report.md',
  ): string {
    const taskEntries = Object.entries(state.tasks);
    const projectEntries = Object.entries(state.projects);
    const docEntries = Object.entries(state.documents || {});
    const localeStr = getLocale() === 'ru' ? 'ru-RU' : 'en-US';

    let md = `# ${t('reporter.title')}\n\n`;
    md += `**${t('reporter.date')}:** ${new Date(summary.startedAt).toLocaleString(localeStr)}  \n`;
    md += `**${t('reporter.duration')}:** ${summary.durationSeconds.toFixed(1)} ${t('reporter.seconds')}  \n\n`;

    md += `## 📊 ${t('reporter.summaryTitle')}\n\n`;
    md += `| ${t('reporter.entityHeader')} | ${t('reporter.totalHeader')} | ${t('reporter.createdHeader')} | ${t('reporter.updatedHeader')} | ${t('reporter.skippedHeader')} | ${t('reporter.errorsHeader')} |\n`;
    md += `| :--- | :--- | :--- | :--- | :--- | :--- |\n`;
    md += `| **${t('reporter.projects')}** | ${summary.projects.total} | ${summary.projects.created} | 0 | ${summary.projects.skipped} | ${summary.projects.failed} |\n`;
    md += `| **${t('reporter.tasks')}** | ${summary.tasks.total} | ${summary.tasks.created} | ${summary.tasks.updated} | ${summary.tasks.skipped} | ${summary.tasks.failed} |\n`;
    md += `| **${t('reporter.labels')}** | ${summary.labels.total} | ${summary.labels.created} | 0 | ${summary.labels.reused} | 0 |\n`;
    md += `| **${t('reporter.documents')}** | ${summary.documents.total} | ${summary.documents.created} | 0 | ${summary.documents.skipped} | ${summary.documents.failed} |\n`;
    if (summary.comments) {
      md += `| **${t('reporter.comments')}** | ${summary.comments.total} | ${summary.comments.created} | 0 | ${summary.comments.skipped} | ${summary.comments.failed} |\n`;
    }
    md += `\n`;

    md += `**${tf('reporter.parentsResolved', summary.tasks.parentsResolved, summary.tasks.parentsFailed)}**\n\n`;

    if (summary.warnings.length > 0) {
      md += `## ⚠️ ${t('reporter.warningsTitle')} (${summary.warnings.length})\n\n`;
      for (const w of summary.warnings) {
        md += `- ${w}\n`;
      }
      md += `\n`;
    }

    if (summary.errors.length > 0) {
      md += `## ❌ ${t('reporter.errorsTitle')} (${summary.errors.length})\n\n`;
      for (const e of summary.errors) {
        md += `- **[${e.entityType.toUpperCase()}]** (${e.entityId}): ${e.message}\n`;
      }
      md += `\n`;
    }

    md += `## 🔗 ${t('reporter.mappingTitle')}\n\n`;
    md += `### ${t('reporter.projectsTitle')}\n\n`;
    if (projectEntries.length > 0) {
      md += `| WEEEK ID | Linear ID | ${t('cli.weeek.colName')} |\n`;
      md += `| :--- | :--- | :--- |\n`;
      for (const [wId, p] of projectEntries) {
        md += `| \`${wId}\` | \`${p.linearProjectId}\` | ${p.name} |\n`;
      }
      md += `\n`;
    } else {
      md += `${t('reporter.noProjects')}\n\n`;
    }

    if (docEntries.length > 0) {
      md += `### ${t('reporter.docsTitle')}\n\n`;
      md += `| WEEEK Doc ID | Linear Doc ID | ${t('cli.weeek.colName')} |\n`;
      md += `| :--- | :--- | :--- |\n`;
      for (const [wId, d] of docEntries) {
        md += `| \`${wId}\` | \`${d.linearDocId}\` | ${d.title} |\n`;
      }
      md += `\n`;
    }

    md += `### ${t('reporter.tasksTitle')}\n\n`;
    if (taskEntries.length > 0) {
      md += `| WEEEK ID | Linear Key / ID | ${t('cli.weeek.colName')} |\n`;
      md += `| :--- | :--- | :--- |\n`;
      for (const [wId, tItem] of taskEntries.slice(0, 100)) {
        md += `| \`${wId}\` | \`${tItem.linearIssueKey || tItem.linearIssueId}\` | ${tItem.title} |\n`;
      }
      if (taskEntries.length > 100) {
        md += `\n${tf('reporter.moreTasksNote', taskEntries.length - 100)}\n\n`;
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
