import { describe, it, expect, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { ReportGenerator } from '../../src/core/reporter.js';
import type { MigrationSummary, MigrationState } from '../../src/core/types.js';

describe('core/reporter', () => {
  const jsonPath = path.resolve('.weeek-linear/test-report.json');
  const mdPath = path.resolve('.weeek-linear/test-report.md');

  const mockSummary: MigrationSummary = {
    startedAt: '2026-08-12T10:00:00.000Z',
    finishedAt: '2026-08-12T10:01:00.000Z',
    durationSeconds: 60,
    projects: { total: 2, created: 2, skipped: 0, failed: 0 },
    tasks: { total: 10, created: 10, updated: 0, skipped: 0, failed: 0, parentsResolved: 3, parentsFailed: 0 },
    labels: { total: 5, created: 3, reused: 2 },
    documents: { total: 2, created: 2, skipped: 0, failed: 0 },
    warnings: ['Внимание: пользователь не найден'],
    errors: [],
  };

  const mockState: MigrationState = {
    version: 1,
    source: 'weeek',
    target: 'linear',
    startedAt: '2026-08-12T10:00:00.000Z',
    updatedAt: '2026-08-12T10:01:00.000Z',
    projects: { '10': { linearProjectId: 'lin_10', name: 'Project Alpha', migratedAt: '2026-08-12T10:00:00.000Z' } },
    labels: { 'tag_1': { linearLabelId: 'lbl_1', name: 'Bug' } },
    users: { 'denis@example.com': { linearUserId: 'usr_1', name: 'Denis' } },
    documents: { 'doc_1': { linearDocId: 'ldoc_1', title: 'Architecture Note', migratedAt: '2026-08-12T10:00:00.000Z' } },
    tasks: { '101': { linearIssueId: 'iss_101', linearIssueKey: 'ENG-101', title: 'Task 1', migratedAt: '2026-08-12T10:00:00.000Z' } },
  };

  afterEach(() => {
    if (fs.existsSync(jsonPath)) fs.unlinkSync(jsonPath);
    if (fs.existsSync(mdPath)) fs.unlinkSync(mdPath);
  });

  it('должен генерировать валидный JSON отчет', () => {
    ReportGenerator.generateJsonReport(mockSummary, mockState, jsonPath);
    expect(fs.existsSync(jsonPath)).toBe(true);

    const parsed = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
    expect(parsed.summary.projects.total).toBe(2);
    expect(parsed.summary.documents.total).toBe(2);
    expect(parsed.mapping.projects['10']?.name).toBe('Project Alpha');
    expect(parsed.mapping.documents['doc_1']?.title).toBe('Architecture Note');
  });

  it('должен генерировать читаемый Markdown отчет со статистикой', () => {
    ReportGenerator.generateMarkdownReport(mockSummary, mockState, mdPath);
    expect(fs.existsSync(mdPath)).toBe(true);

    const md = fs.readFileSync(mdPath, 'utf-8');
    expect(md).toContain('# Отчет о миграции WEEEK → Linear');
    expect(md).toContain('Project Alpha');
    expect(md).toContain('ENG-101');
    expect(md).toContain('Architecture Note');
    expect(md).toContain('Внимание: пользователь не найден');
  });
});
