import { WeeekClient } from '../clients/weeek/client.js';
import { LinearClient } from '../clients/linear/client.js';
import { StateManager } from './state.js';
import { PreflightValidator } from './validator.js';
import { RelationshipResolver } from './resolver.js';
import { ReportGenerator } from './reporter.js';
import {
  mapProject,
  mapTask,
  guessWorkflowStateType,
  type MappingContext,
} from './mapper.js';
import { CONSTANTS } from '../config/constants.js';
import { logger } from '../utils/logger.js';
import { t, tf } from '../i18n/index.js';
import type {
  MigrationOptions,
  MigrationSummary,
  PreflightValidationResult,
} from './types.js';
import type { WeeekTask, WeeekDocument, WeeekBoardColumn } from '../clients/weeek/types.js';

export interface MigrationEngineHooks {
  onStage?: (stageNumber: number, stageName: string) => void;
  onProgress?: (type: 'projects' | 'labels' | 'tasks' | 'documents', current: number, total: number, itemName?: string) => void;
  onWarning?: (message: string) => void;
  onError?: (error: { entityType: 'project' | 'task' | 'label' | 'relation' | 'auth' | 'document' | 'watcher' | 'state' | 'comment'; entityId: string; message: string }) => void;
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
      tasks: { total: 0, created: 0, updated: 0, skipped: 0, failed: 0, parentsResolved: 0, parentsFailed: 0 },
      labels: { total: 0, created: 0, reused: 0 },
      documents: { total: 0, created: 0, skipped: 0, failed: 0 },
      warnings: [],
      errors: [],
    };

    // Если указан --force, сбрасываем существующий стейт
    if (options.force) {
      this.stateManager.clear();
    }

    // 1. Аутентификация
    this.hooks.onStage?.(1, t('engine.stages.auth'));
    const [weeekMe, linearViewer] = await Promise.all([
      this.weeekClient.getMe(),
      this.linearClient.getViewer(),
    ]);

    logger.info(tf('logs.engine.weeekUser', weeekMe.name || '', weeekMe.email));
    logger.info(tf('logs.engine.linearOrg', linearViewer.organizationName || linearViewer.name));

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
      throw new Error(tf('engine.errors.teamNotFoundKey', options.linearTeamKey || ''));
    }

    this.stateManager.setTargetTeamId(targetTeam.id);

    // 2-5. Загрузка данных WEEEK
    this.hooks.onStage?.(2, t('engine.stages.loadingData'));
    const [allWeeekProjects, weeekUsers, weeekTags] = await Promise.all([
      options.weeekProjectId
        ? [await this.weeekClient.getProject(options.weeekProjectId)]
        : this.weeekClient.getProjects(),
      this.weeekClient.getUsers(),
      this.weeekClient.getTags(),
    ]);

    // 6-9. Загрузка данных Linear
    this.hooks.onStage?.(3, t('engine.stages.preflight'));
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
          this.stateManager.recordUser(wUser.id, matched.id, matched.name);
        }
      }
    }

    // 10. Загрузка задач, колонок и документов WEEEK
    this.hooks.onStage?.(4, t('engine.stages.loadingData'));
    const allWeeekTasks: WeeekTask[] = [];
    const allWeeekDocs: WeeekDocument[] = [];
    const allWeeekColumns: WeeekBoardColumn[] = [];

    // Документы WEEEK не запрашиваются из-за отсутствия общедоступных эндпоинтов в WEEEK API
    for (const project of allWeeekProjects) {
      const [tasks, cols] = await Promise.all([
        this.weeekClient.getTasks({
          projectId: project.id,
          includeCompleted: options.includeCompleted ?? true,
          includeDeleted: options.includeDeleted ?? false,
        }),
        this.weeekClient.getBoardColumns({ projectId: project.id }).catch(() => []),
      ]);

      allWeeekTasks.push(...tasks);
      allWeeekColumns.push(...cols);
    }

    summary.projects.total = allWeeekProjects.length;
    summary.tasks.total = allWeeekTasks.length;
    summary.labels.total = weeekTags.length;
    summary.documents.total = allWeeekDocs.length;

    // Режим DRY RUN: расчет без создания сущностей
    if (options.dryRun) {
      this.hooks.onStage?.(5, t('engine.stages.preflight'));
      for (const wTag of weeekTags) {
        const found = existingLinearLabels.some(l => l.name.toLowerCase() === wTag.title.toLowerCase());
        if (found) summary.labels.reused++;
        else summary.labels.created++;
      }

      summary.projects.created = allWeeekProjects.length;
      summary.tasks.created = allWeeekTasks.length;
      summary.documents.created = allWeeekDocs.length;

      summary.finishedAt = new Date().toISOString();
      summary.durationSeconds = (Date.now() - startTimeMs) / 1000;

      const reportPaths = {
        json: ReportGenerator.generateJsonReport(summary, this.stateManager.getState()),
        markdown: ReportGenerator.generateMarkdownReport(summary, this.stateManager.getState()),
      };

      return { summary, reportPaths };
    }

    // 11. Создание проектов Linear
    this.hooks.onStage?.(6, t('engine.stages.migratingProjects'));
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

    // 12. Создание документов базы знаний (Knowledge Base)
    // Внимание: В публичном API WEEEK отсутствуют общедоступные эндпоинты для получения документов,
    // поэтому опция переноса документов временно заблокирована.
    if (options.includeDocuments) {
      const warnMsg = 'Перенос документов базы знаний недоступен: в публичном API WEEEK отсутствует эндпоинт для работы с документами.';
      logger.warn(warnMsg);
      this.hooks.onWarning?.(warnMsg);
    }

    // 13. Создание меток (Labels)
    this.hooks.onStage?.(8, 'Перенос меток и тегов в Linear');
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
        logger.warn(tf('logs.engine.labelCreateError', wTag.title, (err as Error).message));
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

    // Создание, переименование или полное пересоздание Workflow состояний (статусов) в Linear
    const activeBoardColumnMapping: Record<string, string> = { ...(options.boardColumnMapping || {}) };

    if (!options.dryRun) {
      // 1. Режим полной замены структуры колонок (recreateAllColumns)
      if (options.recreateAllColumns && allWeeekColumns.length > 0) {
        const createdOrMatchedIds = new Set<string>();

        for (const col of allWeeekColumns) {
          const determinedType = guessWorkflowStateType(col.name);
          const existing = workflowStates.find(
            s => s.name.toLowerCase() === col.name.trim().toLowerCase(),
          );

          if (existing) {
            activeBoardColumnMapping[col.id] = existing.id;
            createdOrMatchedIds.add(existing.id);
            this.stateManager.recordBoardColumn(col.id, existing.id, existing.name);
          } else {
            try {
              const createdState = await this.linearClient.createWorkflowState({
                teamId: targetTeam.id,
                name: col.name.trim(),
                type: determinedType,
                color: col.color || undefined,
              });
              workflowStates.push(createdState);
              activeBoardColumnMapping[col.id] = createdState.id;
              createdOrMatchedIds.add(createdState.id);
              this.stateManager.recordBoardColumn(col.id, createdState.id, createdState.name);
              logger.info(tf('logs.engine.stateCreated', createdState.name, createdState.type));
            } catch (err) {
              logger.warn(tf('logs.engine.stateCreateError', col.name, (err as Error).message));
            }
          }
        }

        // Попытка архивировать лишние дефолтные статусы, которые не вошли в WEEEK
        for (const st of [...workflowStates]) {
          if (!createdOrMatchedIds.has(st.id)) {
            try {
              await this.linearClient.archiveWorkflowState(st.id);
              logger.info(tf('logs.engine.stateArchived', st.name));
            } catch {
              // Игнорируем, если Linear требует сохранения хотя бы одного статуса данного типа
            }
          }
        }
      } else {
        // 2. Обычный режим / создание недостающих статусов
        if (options.createMissingStates || Object.values(activeBoardColumnMapping).includes('__create_new__')) {
          for (const col of allWeeekColumns) {
            const explicitVal = activeBoardColumnMapping[col.id];
            const shouldCreate =
              explicitVal === '__create_new__' ||
              (options.createMissingStates && (!explicitVal || explicitVal === ''));

            if (shouldCreate) {
              const existing = workflowStates.find(
                s => s.name.toLowerCase() === col.name.trim().toLowerCase(),
              );

              if (existing) {
                activeBoardColumnMapping[col.id] = existing.id;
                this.stateManager.recordBoardColumn(col.id, existing.id, existing.name);
              } else {
                try {
                  const determinedType = guessWorkflowStateType(col.name);
                  const createdState = await this.linearClient.createWorkflowState({
                    teamId: targetTeam.id,
                    name: col.name.trim(),
                    type: determinedType,
                    color: col.color || undefined,
                  });
                  workflowStates.push(createdState);
                  activeBoardColumnMapping[col.id] = createdState.id;
                  this.stateManager.recordBoardColumn(col.id, createdState.id, createdState.name);
                  logger.info(tf('logs.engine.stateCreatedNew', createdState.name, createdState.type, col.name));
                } catch (err) {
                  logger.warn(tf('logs.engine.stateCreateNewError', col.name, (err as Error).message));
                  const errorRecord = {
                    entityType: 'state' as const,
                    entityId: col.id,
                    message: `Не удалось создать статус Linear для колонки "${col.name}": ${(err as Error).message}`,
                    recoverable: true,
                  };
                  summary.errors.push(errorRecord);
                  this.hooks.onError?.(errorRecord);
                }
              }
            }
          }
        }

        // 3. Переименование сопоставленных статусов в формат WEEEK (renameMatchedStates)
        if (options.renameMatchedStates) {
          for (const col of allWeeekColumns) {
            const mappedStateId = activeBoardColumnMapping[col.id];
            if (mappedStateId && mappedStateId !== '__create_new__') {
              const targetState = workflowStates.find(s => s.id === mappedStateId);
              if (targetState && targetState.name.trim() !== col.name.trim()) {
                try {
                  const updatedState = await this.linearClient.updateWorkflowState(mappedStateId, {
                    name: col.name.trim(),
                    color: col.color || undefined,
                  });
                  targetState.name = updatedState.name;
                  logger.info(tf('logs.engine.stateRenamed', targetState.name, col.name.trim()));
                } catch (err) {
                  logger.warn(tf('logs.engine.stateRenameError', mappedStateId, (err as Error).message));
                }
              }
            }
          }
        }
      }
    }

    // 14-16. Разрешение иерархии и перенос задач
    this.hooks.onStage?.(9, t('engine.stages.resolvingHierarchy'));
    const { rootTasks, nestedTasksByLevel } = RelationshipResolver.groupTasksByHierarchy(allWeeekTasks);

    const mappingContext: MappingContext = {
      teamId: targetTeam.id,
      workflowStates,
      linearUsers,
      linearLabelsByName,
      tasksStateMap: this.stateManager.getState().tasks,
      boardColumnMapping: activeBoardColumnMapping,
      userMapping: options.userMapping,
      watcherStrategy: options.watcherStrategy || 'none',
      globalWatcherUserId: options.globalWatcherUserId,
      unmatchedUserStrategy: options.unmatchedUserStrategy || 'unassigned',
      customFieldsStrategy: options.customFieldsStrategy ?? 'append_to_description',
      customFieldsMapping: options.customFieldsMapping,
      ignoredCustomFields: options.ignoredCustomFields,
    };

    let processedTasksCount = 0;
    const totalTasksToMigrate = allWeeekTasks.length;
    const syncStrategy = options.syncStrategy || 'skip';

    // Вспомогательная функция миграции одной задачи
    const migrateSingleTask = async (task: WeeekTask) => {
      processedTasksCount++;
      this.hooks.onProgress?.('tasks', processedTasksCount, totalTasksToMigrate, task.title);

      const isMigrated = this.stateManager.isTaskMigrated(task.id);
      const existingIssueId = this.stateManager.getLinearTaskId(task.id);

      // Определяем Linear Project ID
      const linearProjectId = task.projectId
        ? this.stateManager.getLinearProjectId(task.projectId)
        : undefined;

      const taskContext: MappingContext = {
        ...mappingContext,
        linearProjectId,
        tasksStateMap: this.stateManager.getState().tasks,
      };

      const { createInput, subscriberUserIds, warnings, skip } = mapTask(task, taskContext);
      if (warnings.length > 0) {
        summary.warnings.push(...warnings);
        for (const w of warnings) this.hooks.onWarning?.(w);
      }

      if (skip) {
        summary.tasks.skipped++;
        return;
      }

      // Обработка уже перенесенных задач в зависимости от syncStrategy
      if (isMigrated && existingIssueId) {
        if (syncStrategy === 'skip' || syncStrategy === 'update_comments_only') {
          summary.tasks.skipped++;
          return;
        }

        try {
          if (syncStrategy === 'update_all') {
            await this.linearClient.updateIssue(existingIssueId, {
              title: createInput.title,
              description: createInput.description,
              priority: createInput.priority,
              stateId: createInput.stateId,
              dueDate: createInput.dueDate,
              assigneeId: createInput.assigneeId,
              labelIds: createInput.labelIds,
              projectId: createInput.projectId,
              parentId: createInput.parentId,
            });
            summary.tasks.updated++;
          } else if (syncStrategy === 'update_status_only') {
            await this.linearClient.updateIssue(existingIssueId, {
              stateId: createInput.stateId,
              dueDate: createInput.dueDate,
              priority: createInput.priority,
            });
            summary.tasks.updated++;
          }
          return;
        } catch (err) {
          logger.warn(tf('logs.engine.taskUpdateError', task.id, (err as Error).message));
        }
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

        // Подписка наблюдателей (Subscribers)
        if (subscriberUserIds.length > 0) {
          for (const subId of subscriberUserIds) {
            try {
              await this.linearClient.subscribeUser(createdIssue.id, subId);
            } catch {
              // Игнорируем ошибку добавления наблюдателя
            }
          }
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

    // 14. Фаза 1: Перенос корневых задач
    this.hooks.onStage?.(10, t('engine.stages.migratingTasks'));
    for (const rootTask of rootTasks) {
      await migrateSingleTask(rootTask);
    }

    // 15. Фаза 2: Перенос подзадач по уровням вложенности
    this.hooks.onStage?.(11, t('engine.stages.migratingTasks'));
    for (const levelTasks of nestedTasksByLevel) {
      for (const nestedTask of levelTasks) {
        await migrateSingleTask(nestedTask);
      }
    }

    // 16. Перенос комментариев к задачам (если включена опция)
    // Внимание: В публичном API WEEEK отсутствуют эндпоинты для работы с комментариями к задачам,
    // поэтому перенос комментариев недоступен.
    const commentStrategy = options.commentStrategy || 'none';
    if (commentStrategy !== 'none') {
      const warnMsg = 'Перенос комментариев недоступен: в публичном API WEEEK отсутствует REST-эндпоинт комментариев к задачам.';
      logger.warn(warnMsg);
      this.hooks.onWarning?.(warnMsg);
    }

    // 20. Генерация отчетов
    this.hooks.onStage?.(13, t('engine.stages.generatingReport'));
    summary.finishedAt = new Date().toISOString();
    summary.durationSeconds = (Date.now() - startTimeMs) / 1000;

    const reportPaths = {
      json: ReportGenerator.generateJsonReport(summary, this.stateManager.getState()),
      markdown: ReportGenerator.generateMarkdownReport(summary, this.stateManager.getState()),
    };

    return { summary, reportPaths };
  }
}
