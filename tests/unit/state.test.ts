import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { StateManager } from '../../src/core/state.js';

describe('core/state', () => {
  const testStatePath = path.resolve('.weeek-linear/test-state.json');

  beforeEach(() => {
    if (fs.existsSync(testStatePath)) {
      fs.unlinkSync(testStatePath);
    }
  });

  afterEach(() => {
    if (fs.existsSync(testStatePath)) {
      fs.unlinkSync(testStatePath);
    }
  });

  it('должен создавать пустое состояние при отсутствии файла', () => {
    const manager = new StateManager(testStatePath);
    const state = manager.getState();
    expect(state.version).toBe(1);
    expect(state.projects).toEqual({});
    expect(state.tasks).toEqual({});
  });

  it('должен атомарно сохранять и загружать записи сущностей', () => {
    const manager = new StateManager(testStatePath);
    manager.setTargetTeamId('team_123');
    manager.recordProject('w_prj_1', 'lin_prj_1', 'Project 1');
    manager.recordTask('w_tsk_1', 'lin_iss_1', 'Task 1', null, 'ENG-1');
    manager.recordLabel('w_tag_1', 'lin_lbl_1', 'Bug');

    expect(manager.isProjectMigrated('w_prj_1')).toBe(true);
    expect(manager.isTaskMigrated('w_tsk_1')).toBe(true);
    expect(manager.isLabelMigrated('w_tag_1')).toBe(true);
    expect(manager.getLinearTaskId('w_tsk_1')).toBe('lin_iss_1');
    expect(manager.getLinearProjectId('w_prj_1')).toBe('lin_prj_1');

    // Проверяем чтение новым экземпляром
    const newManager = new StateManager(testStatePath);
    expect(newManager.isTaskMigrated('w_tsk_1')).toBe(true);
    expect(newManager.getState().targetTeamId).toBe('team_123');
  });
});
