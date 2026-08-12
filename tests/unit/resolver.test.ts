import { describe, it, expect } from 'vitest';
import { RelationshipResolver } from '../../src/core/resolver.js';
import type { WeeekTask } from '../../src/clients/weeek/types.js';

describe('core/resolver', () => {
  it('должен правильно распределять корневые задачи и подзадачи по уровням', () => {
    const tasks: WeeekTask[] = [
      { id: '1', title: 'Root Task 1', parentId: null },
      { id: '2', title: 'Root Task 2', parentId: null },
      { id: '3', title: 'Subtask 1.1', parentId: '1' },
      { id: '4', title: 'Subtask 1.2', parentId: '1' },
      { id: '5', title: 'Subtask 1.1.1 (Deep)', parentId: '3' },
    ];

    const { rootTasks, nestedTasksByLevel } = RelationshipResolver.groupTasksByHierarchy(tasks);

    expect(rootTasks).toHaveLength(2);
    expect(rootTasks.map(t => t.id)).toEqual(['1', '2']);

    expect(nestedTasksByLevel).toHaveLength(2);
    // Level 1: direct subtasks of 1
    expect(nestedTasksByLevel[0]?.map(t => t.id)).toEqual(['3', '4']);
    // Level 2: deep subtasks of 3
    expect(nestedTasksByLevel[1]?.map(t => t.id)).toEqual(['5']);
  });

  it('должен обрабатывать осиротевшие задачи как корневые', () => {
    const tasks: WeeekTask[] = [
      { id: '1', title: 'Root 1', parentId: null },
      { id: '2', title: 'Orphaned Task', parentId: 'non_existent_parent' },
    ];

    const { rootTasks } = RelationshipResolver.groupTasksByHierarchy(tasks);
    expect(rootTasks).toHaveLength(2);
    expect(rootTasks.map(t => t.id)).toContain('2');
  });
});
