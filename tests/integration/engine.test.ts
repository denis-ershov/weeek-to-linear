import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MigrationEngine } from '../../src/core/engine.js';
import { WeeekClient } from '../../src/clients/weeek/client.js';
import { LinearClient } from '../../src/clients/linear/client.js';
import { StateManager } from '../../src/core/state.js';
import path from 'node:path';
import fs from 'node:fs';

describe('integration/engine', () => {
  const testStatePath = path.resolve('.weeek-linear/test-engine-state.json');
  let stateManager: StateManager;

  beforeEach(() => {
    if (fs.existsSync(testStatePath)) fs.unlinkSync(testStatePath);
    stateManager = new StateManager(testStatePath);
  });

  it('должен успешно выполнять полную миграцию проектов, тегов, задач, подзадач и документов', async () => {
    // 1. Мок WEEEK
    const mockWeeek = {
      getMe: vi.fn().mockResolvedValue({ id: '1', email: 'denis@example.com', name: 'Denis' }),
      getProjects: vi.fn().mockResolvedValue([
        { id: 'wp_1', name: 'Alpha Project', description: 'Desc 1' },
      ]),
      getProject: vi.fn(),
      getBoardColumns: vi.fn().mockResolvedValue([
        { id: 'col_1', name: '👾 В работе', projectId: 'wp_1' },
      ]),
      getDocuments: vi.fn().mockResolvedValue([
        { id: 'wdoc_1', title: 'Knowledge Article', content: '<h1>Header</h1><p>Text</p>', projectId: 'wp_1' },
      ]),
      getUsers: vi.fn().mockResolvedValue([
        { id: 'wu_1', email: 'denis@example.com', name: 'Denis' },
        { id: 'wu_2', email: 'alex@example.com', name: 'Alex' },
      ]),
      getTags: vi.fn().mockResolvedValue([
        { id: 'wt_1', title: 'Bug', color: '#ff0000' },
      ]),
      getTasks: vi.fn().mockResolvedValue([
        {
          id: 'wtk_1',
          title: 'Parent Task',
          parentId: null,
          isCompleted: false,
          priority: 1,
          boardColumnId: 'col_1',
          assignees: [{ email: 'denis@example.com' }, { email: 'alex@example.com' }],
        },
        {
          id: 'wtk_2',
          title: 'Child Task',
          parentId: 'wtk_1',
          isCompleted: true,
          priority: 2,
          assignees: [{ email: 'alex@example.com' }],
        },
      ]),
    } as unknown as WeeekClient;

    // 2. Мок Linear
    const mockLinear = {
      getViewer: vi.fn().mockResolvedValue({ id: 'lu_1', name: 'Denis', email: 'denis@example.com', organizationName: 'My Org' }),
      getTeams: vi.fn().mockResolvedValue([{ id: 'lt_1', key: 'ENG', name: 'Engineering' }]),
      getTeam: vi.fn().mockResolvedValue({ id: 'lt_1', key: 'ENG', name: 'Engineering' }),
      getWorkflowStates: vi.fn().mockImplementation(async () => [
        { id: 'ls_todo', name: 'Todo', type: 'unstarted' },
        { id: 'ls_started', name: 'In Progress', type: 'started' },
        { id: 'ls_done', name: 'Done', type: 'completed' },
      ]),
      getUsers: vi.fn().mockResolvedValue([
        { id: 'lu_1', name: 'Denis', email: 'denis@example.com' },
        { id: 'lu_2', name: 'Alex', email: 'alex@example.com' },
      ]),
      getLabels: vi.fn().mockResolvedValue([]),
      getProjects: vi.fn().mockResolvedValue([]),
      createProject: vi.fn().mockResolvedValue({ id: 'lp_1', name: 'Alpha Project' }),
      createLabel: vi.fn().mockResolvedValue({ id: 'll_1', name: 'Bug' }),
      createDocument: vi.fn().mockResolvedValue({ id: 'ldoc_1', title: 'Knowledge Article' }),
      createWorkflowState: vi.fn().mockResolvedValue({ id: 'ls_custom', name: '👾 В работе', type: 'started' }),
      updateWorkflowState: vi.fn().mockResolvedValue({ id: 'ls_started', name: '👾 В работе', type: 'started' }),
      archiveWorkflowState: vi.fn().mockResolvedValue(undefined),
      createIssue: vi.fn()
        .mockResolvedValueOnce({ id: 'li_1', identifier: 'ENG-1', title: 'Parent Task' })
        .mockResolvedValueOnce({ id: 'li_2', identifier: 'ENG-2', title: 'Child Task' }),
      updateIssue: vi.fn().mockResolvedValue(undefined),
      subscribeUser: vi.fn().mockResolvedValue(undefined),
    } as unknown as LinearClient;

    const engine = new MigrationEngine(mockWeeek, mockLinear, stateManager);

    // Запуск миграции с наблюдателями, документами и созданием статусов
    const { summary } = await engine.run({
      linearTeamKey: 'ENG',
      includeDocuments: true,
      createMissingStates: true,
      watcherStrategy: 'secondary_assignees',
    });

    expect(summary.projects.created).toBe(1);
    expect(summary.labels.created).toBe(1);
    expect(summary.documents.created).toBe(1);
    expect(summary.tasks.created).toBe(2);
    expect(summary.tasks.parentsResolved).toBe(1);
    expect(stateManager.isTaskMigrated('wtk_1')).toBe(true);
    expect(stateManager.isTaskMigrated('wtk_2')).toBe(true);
    expect(stateManager.isDocumentMigrated('wdoc_1')).toBe(true);

    // Проверяем вызов подписки на задачу
    expect(mockLinear.subscribeUser).toHaveBeenCalledWith('li_1', 'lu_2');

    // Проверка повторного запуска со стратегией skip (идемпотентность): ничего не должно дублироваться
    const secondRun = await engine.run({
      linearTeamKey: 'ENG',
      syncStrategy: 'skip',
    });

    expect(secondRun.summary.projects.skipped).toBe(1);
    expect(secondRun.summary.tasks.skipped).toBe(2);
    expect(secondRun.summary.documents.skipped).toBe(1);
    expect(secondRun.summary.tasks.created).toBe(0);

    // Проверка повторного запуска со стратегией update_status_only
    const thirdRun = await engine.run({
      linearTeamKey: 'ENG',
      syncStrategy: 'update_status_only',
    });
    expect(thirdRun.summary.tasks.updated).toBe(2);
    expect(mockLinear.updateIssue).toHaveBeenCalled();

    // Проверка режима переименования статусов (renameMatchedStates)
    await engine.run({
      linearTeamKey: 'ENG',
      renameMatchedStates: true,
      boardColumnMapping: { col_1: 'ls_started' },
    });
    expect(mockLinear.updateWorkflowState).toHaveBeenCalled();

    // Проверка режима полной замены структуры колонок (recreateAllColumns)
    await engine.run({
      linearTeamKey: 'ENG',
      recreateAllColumns: true,
    });
    expect(mockLinear.createWorkflowState).toHaveBeenCalled();

    // Проверка повторного запуска со стратегией update_comments_only: поля задач пропускаются
    const commentsOnlyRun = await engine.run({
      linearTeamKey: 'ENG',
      syncStrategy: 'update_comments_only',
    });
    expect(commentsOnlyRun.summary.tasks.skipped).toBe(2);
    expect(commentsOnlyRun.summary.tasks.updated).toBe(0);
    expect(commentsOnlyRun.summary.tasks.created).toBe(0);
  });
});
