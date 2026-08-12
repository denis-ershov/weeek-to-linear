import { describe, it, expect } from 'vitest';
import {
  mapPriority,
  mapStatus,
  mapAssignee,
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

  it('mapAssignee должен находить пользователя Linear по email', () => {
    const linearUsers: LinearUser[] = [
      { id: 'usr_1', name: 'Denis', email: 'denis@example.com' },
      { id: 'usr_2', name: 'Alex', email: 'alex@example.com' },
    ];

    expect(mapAssignee('denis@example.com', linearUsers)).toEqual({
      assigneeId: 'usr_1',
    });
    expect(mapAssignee({ email: 'ALEX@EXAMPLE.COM' }, linearUsers)).toEqual({
      assigneeId: 'usr_2',
    });
    expect(mapAssignee('unknown@example.com', linearUsers).assigneeId).toBeUndefined();
    expect(mapAssignee('unknown@example.com', linearUsers).warning).toBeDefined();
  });

  it('mapProject должен корректно преобразовывать проект', () => {
    const input = { id: '1', name: '  My Project  ', description: '<p>Description</p>' };
    const mapped = mapProject(input, 'team_1');
    expect(mapped.teamId).toBe('team_1');
    expect(mapped.name).toBe('My Project');
    expect(mapped.description).toBe('Description');
  });

  it('mapTask должен формировать валидный CreateIssueInput', () => {
    const context: MappingContext = {
      teamId: 'team_1',
      linearProjectId: 'prj_1',
      workflowStates: [{ id: 'st_1', name: 'Todo', type: 'unstarted' }],
      linearUsers: [{ id: 'usr_1', name: 'Denis', email: 'denis@example.com' }],
      linearLabelsByName: new Map([['bug', 'lbl_bug'], ['hold', 'lbl_hold']]),
      tasksStateMap: { 'parent_10': { linearIssueId: 'lin_parent_10' } },
    };

    const task = {
      id: '100',
      parentId: 'parent_10',
      title: 'Fix issue',
      description: '<b>Details</b>',
      dateEnd: '2026-08-20',
      priority: 3, // Hold
      isCompleted: false,
      assignees: [{ email: 'denis@example.com' }],
      tags: [{ id: 't1', title: 'Bug' }],
    };

    const result = mapTask(task, context);
    expect(result.skip).toBe(false);
    expect(result.createInput.title).toBe('Fix issue');
    expect(result.createInput.description).toBe('**Details**');
    expect(result.createInput.dueDate).toBe('2026-08-20');
    expect(result.createInput.priority).toBe(0);
    expect(result.createInput.parentId).toBe('lin_parent_10');
    expect(result.createInput.assigneeId).toBe('usr_1');
    expect(result.createInput.labelIds).toContain('lbl_bug');
    expect(result.createInput.labelIds).toContain('lbl_hold');
  });
});
