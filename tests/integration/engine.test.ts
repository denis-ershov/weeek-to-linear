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

  it('должен успешно выполнять полную миграцию проектов, тегов, задач и подзадач', async () => {
    // 1. Мок WEEEK
    const mockWeeek = {
      getMe: vi.fn().mockResolvedValue({ id: '1', email: 'denis@example.com', name: 'Denis' }),
      getProjects: vi.fn().mockResolvedValue([
        { id: 'wp_1', name: 'Alpha Project', description: 'Desc 1' },
      ]),
      getProject: vi.fn(),
      getUsers: vi.fn().mockResolvedValue([
        { id: 'wu_1', email: 'denis@example.com', name: 'Denis' },
      ]),
      getTags: vi.fn().mockResolvedValue([
        { id: 'wt_1', title: 'Bug', color: '#ff0000' },
      ]),
      getTasks: vi.fn().mockResolvedValue([
        { id: 'wtk_1', title: 'Parent Task', parentId: null, isCompleted: false, priority: 1 },
        { id: 'wtk_2', title: 'Child Task', parentId: 'wtk_1', isCompleted: true, priority: 2 },
      ]),
    } as unknown as WeeekClient;

    // 2. Мок Linear
    const mockLinear = {
      getViewer: vi.fn().mockResolvedValue({ id: 'lu_1', name: 'Denis', email: 'denis@example.com', organizationName: 'My Org' }),
      getTeams: vi.fn().mockResolvedValue([{ id: 'lt_1', key: 'ENG', name: 'Engineering' }]),
      getTeam: vi.fn().mockResolvedValue({ id: 'lt_1', key: 'ENG', name: 'Engineering' }),
      getWorkflowStates: vi.fn().mockResolvedValue([
        { id: 'ls_todo', name: 'Todo', type: 'unstarted' },
        { id: 'ls_done', name: 'Done', type: 'completed' },
      ]),
      getUsers: vi.fn().mockResolvedValue([
        { id: 'lu_1', name: 'Denis', email: 'denis@example.com' },
      ]),
      getLabels: vi.fn().mockResolvedValue([]),
      getProjects: vi.fn().mockResolvedValue([]),
      createProject: vi.fn().mockResolvedValue({ id: 'lp_1', name: 'Alpha Project' }),
      createLabel: vi.fn().mockResolvedValue({ id: 'll_1', name: 'Bug' }),
      createIssue: vi.fn()
        .mockResolvedValueOnce({ id: 'li_1', identifier: 'ENG-1', title: 'Parent Task' })
        .mockResolvedValueOnce({ id: 'li_2', identifier: 'ENG-2', title: 'Child Task' }),
      updateIssue: vi.fn().mockResolvedValue(undefined),
    } as unknown as LinearClient;

    const engine = new MigrationEngine(mockWeeek, mockLinear, stateManager);

    // Запуск миграции
    const { summary } = await engine.run({
      linearTeamKey: 'ENG',
    });

    expect(summary.projects.created).toBe(1);
    expect(summary.labels.created).toBe(1);
    expect(summary.tasks.created).toBe(2);
    expect(summary.tasks.parentsResolved).toBe(1);
    expect(stateManager.isTaskMigrated('wtk_1')).toBe(true);
    expect(stateManager.isTaskMigrated('wtk_2')).toBe(true);

    // Проверка повторного запуска (идемпотентность): ничего не должно дублироваться
    const secondRun = await engine.run({
      linearTeamKey: 'ENG',
    });

    expect(secondRun.summary.projects.skipped).toBe(1);
    expect(secondRun.summary.tasks.skipped).toBe(2);
    expect(secondRun.summary.projects.created).toBe(0);
    expect(secondRun.summary.tasks.created).toBe(0);
  });
});
