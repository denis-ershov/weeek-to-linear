import { describe, it, expect } from 'vitest';
import {
  mapPriority,
  mapStatus,
  mapBoardColumnToWorkflowState,
  guessWorkflowStateType,
  resolveAssignee,
  resolveSubscribers,
  mapTask,
  mapProject,
  type MappingContext,
} from '../../src/core/mapper.js';
import type { LinearWorkflowState, LinearUser } from '../../src/clients/linear/types.js';

describe('core/mapper', () => {
  it('mapPriority должен корректно трансформировать приоритеты', () => {
    // 0 = Low -> Linear 4
    expect(mapPriority(0)).toEqual({ linearPriority: 4, needsHoldLabel: false });
    // 1 = Medium -> Linear 3
    expect(mapPriority(1)).toEqual({ linearPriority: 3, needsHoldLabel: false });
    // 2 = High -> Linear 2
    expect(mapPriority(2)).toEqual({ linearPriority: 2, needsHoldLabel: false });
    // 3 = Hold -> Linear 0 + needsHoldLabel: true
    expect(mapPriority(3)).toEqual({ linearPriority: 0, needsHoldLabel: true });
    // undefined -> Linear 0
    expect(mapPriority(undefined)).toEqual({ linearPriority: 0, needsHoldLabel: false });
  });

  it('mapStatus должен сопоставлять завершенные задачи со статусом Completed', () => {
    const states: LinearWorkflowState[] = [
      { id: 'st_backlog', name: 'Backlog', type: 'backlog' },
      { id: 'st_unstarted', name: 'Todo', type: 'unstarted' },
      { id: 'st_completed', name: 'Done', type: 'completed' },
    ];

    expect(mapStatus(true, states)).toBe('st_completed');
    expect(mapStatus(false, states)).toBe('st_unstarted');
  });

  it('mapBoardColumnToWorkflowState должен сопоставлять колонки по явному маппингу и эвристике', () => {
    const states: LinearWorkflowState[] = [
      { id: 'st_backlog', name: 'Backlog', type: 'backlog' },
      { id: 'st_unstarted', name: 'Todo', type: 'unstarted' },
      { id: 'st_started', name: 'In Progress', type: 'started' },
      { id: 'st_review', name: 'Review / QA', type: 'started' },
      { id: 'st_completed', name: 'Done', type: 'completed' },
      { id: 'st_canceled', name: 'Canceled', type: 'canceled' },
    ];

    // Явный маппинг
    const mapping = { col_123: 'st_review' };
    expect(mapBoardColumnToWorkflowState('col_123', 'Любое имя', mapping, states)).toBe('st_review');

    // Эвристика по названиям колонок
    expect(mapBoardColumnToWorkflowState(null, '👾 В работе', undefined, states)).toBe('st_started');
    expect(mapBoardColumnToWorkflowState(null, '❓ Тестирование', undefined, states)).toBe('st_review');
    expect(mapBoardColumnToWorkflowState(null, '‼️ Закрыто', undefined, states)).toBe('st_completed');
    expect(mapBoardColumnToWorkflowState(null, '📁 Архив', undefined, states)).toBe('st_canceled');
    expect(mapBoardColumnToWorkflowState(null, '💡 Важное', undefined, states)).toBe('st_backlog');
    expect(mapBoardColumnToWorkflowState(null, '⏱ Запланировано', undefined, states)).toBe('st_unstarted');
  });

  it('guessWorkflowStateType должен определять правильный базовый тип Linear статуса', () => {
    expect(guessWorkflowStateType('💡 Важное / Идеи')).toBe('backlog');
    expect(guessWorkflowStateType('⏱ Запланировано')).toBe('unstarted');
    expect(guessWorkflowStateType('👾 В процессе разработки')).toBe('started');
    expect(guessWorkflowStateType('❓ Тестирование / QA')).toBe('started');
    expect(guessWorkflowStateType('⁉️ Доработать')).toBe('started');
    expect(guessWorkflowStateType('‼️ Закрыто')).toBe('completed');
    expect(guessWorkflowStateType('📁 Архив')).toBe('canceled');
  });

  it('resolveAssignee должен находить пользователя Linear или применять правила fallback', () => {
    const linearUsers: LinearUser[] = [
      { id: 'usr_1', name: 'Denis', email: 'denis@example.com' },
      { id: 'usr_2', name: 'Alex', email: 'alex@example.com' },
    ];

    // По email
    expect(resolveAssignee({ email: 'denis@example.com' }, linearUsers)).toEqual({
      assigneeId: 'usr_1',
    });

    // Персональный маппинг на другого сотрудника
    expect(
      resolveAssignee({ id: 'w_user_99', email: 'unknown@example.com' }, linearUsers, {
        w_user_99: 'usr_2',
      }),
    ).toEqual({ assigneeId: 'usr_2' });

    // Персональный маппинг: unassigned
    expect(
      resolveAssignee({ id: 'w_user_99' }, linearUsers, {
        w_user_99: 'unassigned',
      }),
    ).toEqual({});

    // Персональный маппинг: skip
    expect(
      resolveAssignee({ id: 'w_user_99' }, linearUsers, {
        w_user_99: 'skip',
      }),
    ).toEqual({ shouldSkip: true });
  });

  it('resolveSubscribers должен формировать список наблюдателей по заданной стратегии', () => {
    const linearUsers: LinearUser[] = [
      { id: 'usr_1', name: 'Denis', email: 'denis@example.com' },
      { id: 'usr_2', name: 'Alex', email: 'alex@example.com' },
      { id: 'usr_lead', name: 'Lead', email: 'lead@example.com' },
    ];

    const assignees = [
      { id: 'w1', email: 'denis@example.com' },
      { id: 'w2', email: 'alex@example.com' },
    ];

    // 1. None
    expect(
      resolveSubscribers(assignees, linearUsers, undefined, 'none', 'usr_lead', 'usr_1'),
    ).toEqual([]);

    // 2. Global Watcher
    expect(
      resolveSubscribers(assignees, linearUsers, undefined, 'global_watcher', 'usr_lead', 'usr_1'),
    ).toEqual(['usr_lead']);

    // 3. Secondary Assignees (Alex становится наблюдателем, Denis - основной)
    expect(
      resolveSubscribers(assignees, linearUsers, undefined, 'secondary_assignees', undefined, 'usr_1'),
    ).toEqual(['usr_2']);

    // 4. Both (Alex + Lead)
    const both = resolveSubscribers(assignees, linearUsers, undefined, 'both', 'usr_lead', 'usr_1');
    expect(both).toContain('usr_2');
    expect(both).toContain('usr_lead');
    expect(both).not.toContain('usr_1');
  });

  it('mapProject должен корректно преобразовывать проект', () => {
    const input = { id: '1', name: '  My Project  ', description: '<p>Description</p>' };
    const mapped = mapProject(input, 'team_1');
    expect(mapped.teamId).toBe('team_1');
    expect(mapped.name).toBe('My Project');
    expect(mapped.description).toBe('Description');
  });

  it('mapTask должен формировать валидный CreateIssueInput с наблюдателями и канбан-колонками', () => {
    const context: MappingContext = {
      teamId: 'team_1',
      linearProjectId: 'prj_1',
      workflowStates: [
        { id: 'st_1', name: 'Todo', type: 'unstarted' },
        { id: 'st_started', name: 'In Progress', type: 'started' },
      ],
      linearUsers: [
        { id: 'usr_1', name: 'Denis', email: 'denis@example.com' },
        { id: 'usr_2', name: 'Alex', email: 'alex@example.com' },
        { id: 'usr_lead', name: 'Lead', email: 'lead@example.com' },
      ],
      linearLabelsByName: new Map([['bug', 'lbl_bug'], ['hold', 'lbl_hold']]),
      tasksStateMap: { 'parent_10': { linearIssueId: 'lin_parent_10' } },
      boardColumnMapping: { col_progress: 'st_started' },
      watcherStrategy: 'both',
      globalWatcherUserId: 'usr_lead',
    };

    const task = {
      id: '100',
      boardColumnId: 'col_progress',
      parentId: 'parent_10',
      title: 'Fix issue',
      description: '<b>Details</b>',
      dateEnd: '2026-08-20',
      priority: 3, // Hold
      isCompleted: false,
      assignees: [{ email: 'denis@example.com' }, { email: 'alex@example.com' }],
      tags: [{ id: 't1', title: 'Bug' }],
    };

    const result = mapTask(task, context);
    expect(result.skip).toBe(false);
    expect(result.createInput.title).toBe('Fix issue');
    expect(result.createInput.stateId).toBe('st_started');
    expect(result.createInput.description).toBe('**Details**');
    expect(result.createInput.dueDate).toBe('2026-08-20');
    expect(result.createInput.priority).toBe(0);
    expect(result.createInput.parentId).toBe('lin_parent_10');
    expect(result.createInput.assigneeId).toBe('usr_1');
    expect(result.createInput.labelIds).toContain('lbl_bug');
    expect(result.createInput.labelIds).toContain('lbl_hold');
    expect(result.subscriberUserIds).toContain('usr_2');
    expect(result.subscriberUserIds).toContain('usr_lead');
    expect(result.subscriberUserIds).not.toContain('usr_1');
  });
});
