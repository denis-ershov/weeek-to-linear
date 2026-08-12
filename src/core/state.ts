import fs from 'node:fs';
import path from 'node:path';
import { CONSTANTS } from '../config/constants.js';
import { logger } from '../utils/logger.js';
import type { MigrationState } from './types.js';

export class StateManager {
  private readonly filePath: string;
  private state: MigrationState;

  constructor(customFilePath?: string) {
    this.filePath = customFilePath || CONSTANTS.DEFAULT_STATE_FILE;
    this.state = this.loadState();
  }

  /**
   * Инициализация пустого состояния
   */
  private createEmptyState(): MigrationState {
    const now = new Date().toISOString();
    return {
      version: 1,
      source: 'weeek',
      target: 'linear',
      startedAt: now,
      updatedAt: now,
      projects: {},
      labels: {},
      users: {},
      tasks: {},
    };
  }

  /**
   * Загрузка состояния с диска или создание нового
   */
  public loadState(): MigrationState {
    try {
      if (fs.existsSync(this.filePath)) {
        const content = fs.readFileSync(this.filePath, 'utf-8');
        const parsed = JSON.parse(content) as MigrationState;
        this.state = {
          version: parsed.version || 1,
          source: 'weeek',
          target: 'linear',
          startedAt: parsed.startedAt || new Date().toISOString(),
          updatedAt: parsed.updatedAt || new Date().toISOString(),
          targetTeamId: parsed.targetTeamId,
          projects: parsed.projects || {},
          labels: parsed.labels || {},
          users: parsed.users || {},
          tasks: parsed.tasks || {},
        };
        return this.state;
      }
    } catch (err) {
      logger.warn(`Не удалось прочитать файл состояния ${this.filePath}: ${(err as Error).message}. Инициализируется пустое состояние.`);
    }

    this.state = this.createEmptyState();
    return this.state;
  }

  /**
   * Атомарное сохранение состояния на диск (через tmp файл)
   */
  public saveState(): void {
    try {
      const dir = path.dirname(this.filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      this.state.updatedAt = new Date().toISOString();
      const jsonContent = JSON.stringify(this.state, null, 2);
      const tmpPath = `${this.filePath}.tmp`;

      fs.writeFileSync(tmpPath, jsonContent, 'utf-8');
      fs.renameSync(tmpPath, this.filePath);
    } catch (err) {
      logger.error(`Ошибка при сохранении файла состояния ${this.filePath}: ${(err as Error).message}`);
    }
  }

  public getState(): MigrationState {
    return this.state;
  }

  public setTargetTeamId(teamId: string): void {
    this.state.targetTeamId = teamId;
    this.saveState();
  }

  public recordProject(weeekId: string, linearProjectId: string, name: string): void {
    this.state.projects[String(weeekId)] = {
      linearProjectId,
      name,
      migratedAt: new Date().toISOString(),
    };
    this.saveState();
  }

  public recordLabel(weeekTagId: string, linearLabelId: string, name: string): void {
    this.state.labels[String(weeekTagId)] = {
      linearLabelId,
      name,
    };
    this.saveState();
  }

  public recordUser(weeekEmail: string, linearUserId: string, name: string): void {
    this.state.users[weeekEmail.toLowerCase()] = {
      linearUserId,
      name,
    };
    this.saveState();
  }

  public recordTask(
    weeekTaskId: string,
    linearIssueId: string,
    title: string,
    parentId?: string | null,
    linearIssueKey?: string,
  ): void {
    this.state.tasks[String(weeekTaskId)] = {
      linearIssueId,
      linearIssueKey,
      title,
      parentId,
      migratedAt: new Date().toISOString(),
    };
    this.saveState();
  }

  public isProjectMigrated(weeekProjectId: string): boolean {
    return Boolean(this.state.projects[String(weeekProjectId)]);
  }

  public isTaskMigrated(weeekTaskId: string): boolean {
    return Boolean(this.state.tasks[String(weeekTaskId)]);
  }

  public isLabelMigrated(weeekTagId: string): boolean {
    return Boolean(this.state.labels[String(weeekTagId)]);
  }

  public getLinearProjectId(weeekProjectId: string): string | undefined {
    return this.state.projects[String(weeekProjectId)]?.linearProjectId;
  }

  public getLinearTaskId(weeekTaskId: string): string | undefined {
    return this.state.tasks[String(weeekTaskId)]?.linearIssueId;
  }

  public getLinearLabelId(weeekTagId: string): string | undefined {
    return this.state.labels[String(weeekTagId)]?.linearLabelId;
  }

  public clear(): void {
    this.state = this.createEmptyState();
    try {
      if (fs.existsSync(this.filePath)) {
        fs.unlinkSync(this.filePath);
      }
    } catch {
      // Игнорируем ошибку удаления, если файла нет
    }
  }
}
