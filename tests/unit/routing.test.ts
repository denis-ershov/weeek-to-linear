import { describe, it, expect } from 'vitest';
import { mapTask, type MappingContext } from '../../src/core/mapper.js';
import type { WeeekTask } from '../../src/clients/weeek/types.js';
import type { LinearWorkflowState, LinearUser } from '../../src/clients/linear/types.js';

describe('core/routing', () => {
  const baseWorkflowStates: LinearWorkflowState[] = [
    { id: 'st_backlog', name: 'Backlog', type: 'backlog' },
    { id: 'st_started', name: 'In Progress', type: 'started' },
    { id: 'st_completed', name: 'Done', type: 'completed' },
  ];

  const baseLinearUsers: LinearUser[] = [
    { id: 'usr_admin', name: 'Admin Lead', email: 'lead@example.com' },
    { id: 'usr_dev1', name: 'Ivan Dev', email: 'ivan@example.com' },
    { id: 'usr_dev2', name: 'Olga QA', email: 'olga@example.com' },
  ];

  const baseContext: MappingContext = {
    teamId: 'team_eng',
    workflowStates: baseWorkflowStates,
    linearUsers: baseLinearUsers,
    linearLabelsByName: new Map([
      ['backend', 'lbl_backend'],
      ['bug', 'lbl_bug'],
      ['vip', 'lbl_vip'],
    ]),
    tasksStateMap: {},
  };

  describe('Fallback Assignee Strategies', () => {
    const unassignedTask: WeeekTask = {
      id: '101',
      title: 'Задача без исполнителя',
      description: 'Текст задачи',
      assignees: [],
      creatorId: 'w_author_1',
    };

    it('fallbackAssignee = "unassigned" оставляет задачу без исполнителя', () => {
      const result = mapTask(unassignedTask, {
        ...baseContext,
        fallbackAssignee: 'unassigned',
      });
      expect(result.createInput.assigneeId).toBeUndefined();
    });

    it('fallbackAssignee = "creator" назначает сопоставленного автора задачи', () => {
      const result = mapTask(unassignedTask, {
        ...baseContext,
        fallbackAssignee: 'creator',
        userMapping: {
          w_author_1: 'usr_dev1',
        },
      });
      expect(result.createInput.assigneeId).toBe('usr_dev1');
    });

    it('fallbackAssignee = "specific_user" назначает заданного сотрудника Linear', () => {
      const result = mapTask(unassignedTask, {
        ...baseContext,
        fallbackAssignee: 'specific_user',
        fallbackAssigneeUserId: 'usr_admin',
      });
      expect(result.createInput.assigneeId).toBe('usr_admin');
    });

    it('если исполнитель уже указан, fallbackAssignee не переопределяет его', () => {
      const assignedTask: WeeekTask = {
        ...unassignedTask,
        assignees: [{ id: 'w_dev2', email: 'olga@example.com' }],
      };
      const result = mapTask(assignedTask, {
        ...baseContext,
        fallbackAssignee: 'specific_user',
        fallbackAssigneeUserId: 'usr_admin',
      });
      expect(result.createInput.assigneeId).toBe('usr_dev2');
    });
  });

  describe('Creator Attribution Strategies', () => {
    const taskWithAuthor: WeeekTask = {
      id: '202',
      title: 'Задача от Product Owner',
      description: 'Важная бизнес-задача',
      creatorId: 'po@example.com',
      author: {
        id: 'po_1',
        name: 'Павел PM',
        email: 'po@example.com',
      },
    };

    it('creatorStrategy = "header" добавляет блок с автором в Markdown описание', () => {
      const result = mapTask(taskWithAuthor, {
        ...baseContext,
        creatorStrategy: 'header',
      });
      expect(result.createInput.description).toContain(
        '> 👤 **Создатель задачи (WEEEK):** Павел PM',
      );
      expect(result.subscriberUserIds).not.toContain('usr_dev1');
    });

    it('creatorStrategy = "subscriber" добавляет сопоставленного автора в наблюдатели', () => {
      const result = mapTask(taskWithAuthor, {
        ...baseContext,
        creatorStrategy: 'subscriber',
        userMapping: {
          'po@example.com': 'usr_dev2',
        },
      });
      expect(result.subscriberUserIds).toContain('usr_dev2');
      expect(result.createInput.description).not.toContain('Создатель задачи');
    });

    it('creatorStrategy = "both" добавляет и блок в описание, и автора в наблюдатели', () => {
      const result = mapTask(taskWithAuthor, {
        ...baseContext,
        creatorStrategy: 'both',
        userMapping: {
          'po@example.com': 'usr_dev2',
        },
      });
      expect(result.createInput.description).toContain('> 👤 **Создатель задачи (WEEEK):**');
      expect(result.subscriberUserIds).toContain('usr_dev2');
    });

    it('creatorStrategy = "none" не добавляет цитату и не подписывает автора', () => {
      const result = mapTask(taskWithAuthor, {
        ...baseContext,
        creatorStrategy: 'none',
        userMapping: {
          'po@example.com': 'usr_dev2',
        },
      });
      expect(result.createInput.description).toBe('Важная бизнес-задача');
      expect(result.subscriberUserIds).toEqual([]);
    });
  });

  describe('Conditional Task Routing Rules', () => {
    it('маршрутизирует исполнителя и метку по совпадению тега (tag equals / contains)', () => {
      const taggedTask: WeeekTask = {
        id: '301',
        title: 'Бэкенд сервис авторизации',
        tags: [{ id: 't_1', title: 'backend' }],
      };

      const result = mapTask(taggedTask, {
        ...baseContext,
        routingRules: [
          {
            id: 'rule_1',
            condition: { field: 'tag', operator: 'equals', value: 'backend' },
            action: {
              setAssigneeId: 'usr_dev1',
              addLabelId: 'lbl_backend',
            },
          },
        ],
      });

      expect(result.createInput.assigneeId).toBe('usr_dev1');
      expect(result.createInput.labelIds).toContain('lbl_backend');
    });

    it('маршрутизирует наблюдателя и команду по колонке канбан-доски', () => {
      const columnTask: WeeekTask = {
        id: '302',
        title: 'Фича на проверке QA',
        boardColumnId: 'col_qa_check',
      };

      const result = mapTask(columnTask, {
        ...baseContext,
        routingRules: [
          {
            id: 'rule_qa',
            condition: { field: 'column', operator: 'contains', value: 'col_qa' },
            action: {
              addSubscriberId: 'usr_dev2',
              targetTeamId: 'team_qa',
            },
          },
        ],
      });

      expect(result.subscriberUserIds).toContain('usr_dev2');
      expect(result.createInput.teamId).toBe('team_qa');
    });

    it('переопределяет приоритет задачи по правилу приоритета', () => {
      const highTask: WeeekTask = {
        id: '303',
        title: 'Критичный баг на проде',
        priority: 2, // High в WEEEK -> Linear priority 2
      };

      const result = mapTask(highTask, {
        ...baseContext,
        routingRules: [
          {
            id: 'rule_urgent',
            condition: { field: 'priority', operator: 'equals', value: '2' },
            action: {
              setPriority: 1, // Urgent в Linear
              addSubscriberId: 'usr_admin',
            },
          },
        ],
      });

      expect(result.createInput.priority).toBe(1);
      expect(result.subscriberUserIds).toContain('usr_admin');
    });
  });
});
