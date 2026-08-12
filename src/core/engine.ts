import { WeeekClient } from '../clients/weeek/client.js';
import { LinearClient } from '../clients/linear/client.js';
import { StateManager } from './state.js';
import { PreflightValidator } from './validator.js';
import { RelationshipResolver } from './resolver.js';
import { ReportGenerator } from './reporter.js';
import { mapProject, mapTask, type MappingContext } from './mapper.js';
import { CONSTANTS } from '../config/constants.js';
import { logger } from '../utils/logger.js';
import type {
  MigrationOptions,
  MigrationSummary,
  PreflightValidationResult,
} from './types.js';
import type { WeeekTask } from '../clients/weeek/types.js';

export interface MigrationEngineHooks {
  onStage?: (stageNumber: number, stageName: string) => void;
  onProgress?: (type: 'projects' | 'labels' | 'tasks', current: number, total: number, itemName?: string) => void;
  onWarning?: (message: string) => void;
  onError?: (error: { entityType: 'project' | 'task' | 'label' | 'relation' | 'auth'; entityId: string; message: string }) => void;
}

export class MigrationEngine {
  private readonly weeekClient: WeeekClient;
  private readonly linearClient: LinearClient;
  private readonly stateManager: StateManager;
  private readonly hooks: MigrationEngineHooks;

  constructor(
    weeekClient: WeeekClient,
    linearClient: LinearClient,
    stateManager?: StateManager,
    hooks?: MigrationEngineHooks,
  ) {
    this.weeekClient = weeekClient;
    this.linearClient = linearClient;
    this.stateManager = stateManager || new StateManager();
    this.hooks = hooks || {};
  }

  /**
   * Выполнение предварительной валидации (Preflight)
   */
  public async validate(
    targetTeamId: string,
    weeekProjectId?: string,
    includeCompleted = true,
  ): Promise<PreflightValidationResult> {
    this.hooks.onStage?.(1, 'Валидация подключения и данных перед миграцией');
    return PreflightValidator.validate({
      weeekClient: this.weeekClient,
      linearClient: this.linearClient,
      weeekProjectId,
      linearTeamId: targetTeamId,
      includeCompleted,
    });
  }

  /**
   * Основной запуск конвейера миграции
   */
  public async run(options: MigrationOptions): Promise<{
    summary: MigrationSummary;
    reportPaths: { json: string; markdown: string };
  }> {
    const startedAt = new Date().toISOString();
    const startTimeMs = Date.now();

    const summary: MigrationSummary = {
      startedAt,
      finishedAt: '',
      durationSeconds: 0,
      projects: { total: 0, created: 0, skipped: 0, failed: 0 },
      tasks: { total: 0, created: 0, skipped: 0, failed: 0, parentsResolved: 0, parentsFailed: 0 },
      labels: { total: 0, created: 0, reused: 0 },
      warnings: [],
      errors: [],
    };

    // Если указан --force, сбрасываем существующий стейт
    if (options.force) {
      this.stateManager.clear();
    }

    // 1. Аутентификация
    this.hooks.onStage?.(1, 'Аутентификация в API WEEEK и Linear');
    const [weeekMe, linearViewer] = await Promise.all([
      this.weeekClient.getMe(),
      this.linearClient.getViewer(),
    ]);

    logger.info(`WEEEK пользователь: ${weeekMe.name} (${weeekMe.email})`);
    logger.info(`Linear организация: ${linearViewer.organizationName || linearViewer.name}`);

    // Получение целевой команды Linear
    const linearTeams = await this.linearClient.getTeams();
    const targetTeam = options.linearTeamKey
      ? linearTeams.find(
          t =>
            t.key.toLowerCase() === options.linearTeamKey?.toLowerCase() ||
            t.id.toLowerCase() === options.linearTeamKey?.toLowerCase(),
        )
      : linearTeams[0];

    if (!targetTeam) {
      throw new Error(`Целевая команда Linear не найдена: ${options.linearTeamKey || 'список пуст'}`);
    }

    this.stateManager.setTargetTeamId(targetTeam.id);

    // 2-5. Загрузка данных WEEEK
    this.hooks.onStage?.(2, 'Загрузка проектов и метаданных из WEEEK');
    const [allWeeekProjects, weeekUsers, weeekTags] = await Promise.all([
      options.weeekProjectId
        ? [await this.weeekClient.getProject(options.weeekProjectId)]
        : this.weeekClient.getProjects(),
      this.weeekClient.getUsers(),
      this.weeekClient.getTags(),
    ]);

    // 6-9. Загрузка данных Linear
    this.hooks.onStage?.(3, 'Загрузка команды, статусов и пользователей из Linear');
    const [workflowStates, linearUsers, existingLinearLabels, existingLinearProjects] =
      await Promise.all([
        this.linearClient.getWorkflowStates(targetTeam.id),
        this.linearClient.getUsers(),
        this.linearClient.getLabels(targetTeam.id),
        this.linearClient.getProjects(targetTeam.id),
      ]);

    // Сохранение маппинга найденных пользователей
    for (const wUser of weeekUsers) {
      if (wUser.email) {
        const matched = linearUsers.find(
          u => u.email.toLowerCase() === wUser.email.toLowerCase(),
        );
        if (matched) {
          this.stateManager.recordUser(wUser.email, matched.id, matched.name);
        }
      }
    }

    // 10. Загрузка всех задач WEEEK
    this.hooks.onStage?.(4, 'Загрузка задач из WEEEK');
    const allWeeekTasks: WeeekTask[] = [];
    for (const project of allWeeekProjects) {
      const tasks = await this.weeekClient.getTasks({
        projectId: project.id,
        includeCompleted: options.includeCompleted ?? true,
        includeDeleted: options.includeDeleted ?? false,
      });
      allWeeekTasks.push(...tasks);
    }

    summary.projects.total = allWeeekProjects.length;
    summary.tasks.total = allWeeekTasks.length;
    summary.labels.total = weeekTags.length;

    // Режим DRY RUN: расчет без создания сущностей
    if (options.dryRun) {
      this.hooks.onStage?.(5, 'Режим DRY RUN: Проверка соответствия данных без отправки изменений');
      for (const wTag of weeekTags) {
        const found = existingLinearLabels.some(l => l.name.toLowerCase() === wTag.title.toLowerCase());
        if (found) summary.labels.reused++;
        else summary.labels.created++;
      }

      summary.projects.created = allWeeekProjects.length;
      summary.tasks.created = allWeeekTasks.length;

      summary.finishedAt = new Date().toISOString();
      summary.durationSeconds = (Date.now() - startTimeMs) / 1000;

      const reportPaths = {
        json: ReportGenerator.generateJsonReport(summary, this.stateManager.getState()),
        markdown: ReportGenerator.generateMarkdownReport(summary, this.stateManager.getState()),
      };

      return { summary, reportPaths };
    }

    // 11. Создание проектов Linear
    this.hooks.onStage?.(6, 'Перенос проектов в Linear');
    let projectIndex = 0;
    for (const wProject of allWeeekProjects) {
      projectIndex++;
      this.hooks.onProgress?.('projects', projectIndex, allWeeekProjects.length, wProject.name);

      if (this.stateManager.isProjectMigrated(wProject.id)) {
        summary.projects.skipped++;
        continue;
      }

      // Проверка на существующий проект с таким же именем
      const existing = existingLinearProjects.find(
        p => p.name.toLowerCase() === wProject.name.trim().toLowerCase(),
      );

      if (existing) {
        this.stateManager.recordProject(wProject.id, existing.id, existing.name);
        summary.projects.skipped++;
        continue;
      }

      try {
        const input = mapProject(wProject, targetTeam.id);
        const createdProject = await this.linearClient.createProject(input);
        this.stateManager.recordProject(wProject.id, createdProject.id, createdProject.name);
        summary.projects.created++;
      } catch (err) {
        summary.projects.failed++;
        const errorRecord = {
          entityType: 'project' as const,
          entityId: wProject.id,
          message: (err as Error).message,
          recoverable: true,
        };
        summary.errors.push(errorRecord);
        this.hooks.onError?.(errorRecord);
      }
    }

    // 12. Создание меток (Labels)
    this.hooks.onStage?.(7, 'Перенос меток и тегов в Linear');
    const linearLabelsByName = new Map<string, string>();
    for (const l of existingLinearLabels) {
      linearLabelsByName.set(l.name.trim().toLowerCase(), l.id);
    }

    let labelIndex = 0;
    for (const wTag of weeekTags) {
      labelIndex++;
      this.hooks.onProgress?.('labels', labelIndex, weeekTags.length, wTag.title);

      const lowerName = wTag.title.trim().toLowerCase();
      if (linearLabelsByName.has(lowerName)) {
        const labelId = linearLabelsByName.get(lowerName)!;
        this.stateManager.recordLabel(wTag.id, labelId, wTag.title);
        summary.labels.reused++;
        continue;
      }

      try {
        const createdLabel = await this.linearClient.createLabel({
          teamId: targetTeam.id,
          name: wTag.title.trim(),
          color: wTag.color || undefined,
        });
        linearLabelsByName.set(lowerName, createdLabel.id);
        this.stateManager.recordLabel(wTag.id, createdLabel.id, createdLabel.name);
        summary.labels.created++;
      } catch (err) {
        logger.warn(`Не удалось создать метку "${wTag.title}": ${(err as Error).message}`);
      }
    }

    // Гарантированное создание метки 'hold'
    if (!linearLabelsByName.has(CONSTANTS.HOLD_LABEL_NAME)) {
      try {
        const holdLabel = await this.linearClient.createLabel({
          teamId: targetTeam.id,
          name: CONSTANTS.HOLD_LABEL_NAME,
          color: CONSTANTS.HOLD_LABEL_COLOR,
        });
        linearLabelsByName.set(CONSTANTS.HOLD_LABEL_NAME, holdLabel.id);
      } catch {
        // Игнорируем, если уже существует
      }
    }

    // 13-15. Разрешение иерархии и перенос задач
    this.hooks.onStage?.(8, 'Топологическая сортировка задач и подзадач');
    const { rootTasks, nestedTasksByLevel } = RelationshipResolver.groupTasksByHierarchy(allWeeekTasks);

    const mappingContext: MappingContext = {
      teamId: targetTeam.id,
      workflowStates,
      linearUsers,
      linearLabelsByName,
      tasksStateMap: this.stateManager.getState().tasks,
      unmatchedUserStrategy: options.unmatchedUserStrategy || 'unassigned',
    };

    let processedTasksCount = 0;
    const totalTasksToMigrate = allWeeekTasks.length;

    // Вспомогательная функция миграции одной задачи
    const migrateSingleTask = async (task: WeeekTask) => {
      processedTasksCount++;
      this.hooks.onProgress?.('tasks', processedTasksCount, totalTasksToMigrate, task.title);

      if (this.stateManager.isTaskMigrated(task.id)) {
        summary.tasks.skipped++;
        return;
      }

      // Определяем Linear Project ID
      const linearProjectId = task.projectId
        ? this.stateManager.getLinearProjectId(task.projectId)
        : undefined;

      const taskContext: MappingContext = {
        ...mappingContext,
        linearProjectId,
        tasksStateMap: this.stateManager.getState().tasks,
      };

      const { createInput, warnings, skip } = mapTask(task, taskContext);
      if (warnings.length > 0) {
        summary.warnings.push(...warnings);
        for (const w of warnings) this.hooks.onWarning?.(w);
      }

      if (skip) {
        summary.tasks.skipped++;
        return;
      }

      try {
        const createdIssue = await this.linearClient.createIssue(createInput);
        this.stateManager.recordTask(
          task.id,
          createdIssue.id,
          task.title,
          task.parentId,
          createdIssue.identifier,
        );
        summary.tasks.created++;

        if (task.parentId) {
          summary.tasks.parentsResolved++;
        }
      } catch (err) {
        summary.tasks.failed++;
        const errorRecord = {
          entityType: 'task' as const,
          entityId: task.id,
          message: (err as Error).message,
          recoverable: true,
        };
        summary.errors.push(errorRecord);
        this.hooks.onError?.(errorRecord);
      }
    };

    // 13. Фаза 1: Перенос корневых задач
    this.hooks.onStage?.(9, 'Создание корневых задач в Linear');
    for (const rootTask of rootTasks) {
      await migrateSingleTask(rootTask);
    }

    // 14. Фаза 2: Перенос подзадач по уровням вложенности
    this.hooks.onStage?.(10, 'Создание подзадач с сохранением связей');
    for (const levelTasks of nestedTasksByLevel) {
      for (const nestedTask of levelTasks) {
        await migrateSingleTask(nestedTask);
      }
    }

    // 20. Генерация отчетов
    this.hooks.onStage?.(11, 'Генерация отчетов миграции');
    summary.finishedAt = new Date().toISOString();
    summary.durationSeconds = (Date.now() - startTimeMs) / 1000;

    const reportPaths = {
      json: ReportGenerator.generateJsonReport(summary, this.stateManager.getState()),
      markdown: ReportGenerator.generateMarkdownReport(summary, this.stateManager.getState()),
    };

    return { summary, reportPaths };
  }
}
