import type { WeeekTask } from '../clients/weeek/types.js';

export interface TaskHierarchyLevels {
  rootTasks: WeeekTask[];
  nestedTasksByLevel: WeeekTask[][];
}

export class RelationshipResolver {
  /**
   * Топологическая группировка задач по уровням вложенности:
   * Уровень 0 (корневые задачи), Уровень 1 (прямые подзадачи), Уровень 2+ (вложенные подзадачи).
   */
  public static groupTasksByHierarchy(tasks: WeeekTask[]): TaskHierarchyLevels {
    const taskMap = new Map<string, WeeekTask>();
    for (const task of tasks) {
      taskMap.set(String(task.id), task);
    }

    const rootTasks: WeeekTask[] = [];
    const childTasks: WeeekTask[] = [];

    for (const task of tasks) {
      if (!task.parentId || !taskMap.has(String(task.parentId))) {
        rootTasks.push(task);
      } else {
        childTasks.push(task);
      }
    }

    // Вычисление глубины вложенности для дочерних задач
    const getDepth = (t: WeeekTask, visited = new Set<string>()): number => {
      if (!t.parentId || visited.has(String(t.id))) return 0;
      visited.add(String(t.id));
      const parent = taskMap.get(String(t.parentId));
      if (!parent) return 0;
      return 1 + getDepth(parent, visited);
    };

    const maxDepth = 10;
    const nestedTasksByLevel: WeeekTask[][] = [];

    for (let level = 1; level <= maxDepth; level++) {
      const levelTasks = childTasks.filter(t => getDepth(t) === level);
      if (levelTasks.length > 0) {
        nestedTasksByLevel.push(levelTasks);
      } else {
        break;
      }
    }

    // Если есть задачи с циклической зависимостью или превышением глубины, добавляем их в последний уровень
    const groupedIds = new Set([
      ...rootTasks.map(t => String(t.id)),
      ...nestedTasksByLevel.flatMap(lvl => lvl.map(t => String(t.id))),
    ]);

    const remainingTasks = childTasks.filter(t => !groupedIds.has(String(t.id)));
    if (remainingTasks.length > 0) {
      nestedTasksByLevel.push(remainingTasks);
    }

    return {
      rootTasks,
      nestedTasksByLevel,
    };
  }
}
