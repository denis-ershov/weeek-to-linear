import { LinearClient as SdkLinearClient } from '@linear/sdk';
import type PQueue from 'p-queue';
import { logger } from '../../utils/logger.js';
import { t } from '../../i18n/index.js';
import { ApiError, withRetry } from '../../utils/retry.js';
import { createConcurrencyQueue } from '../../utils/queue.js';
import type {
  LinearViewer,
  LinearTeam,
  LinearWorkflowState,
  LinearUser,
  LinearProject,
  LinearLabel,
  LinearIssue,
  LinearDocument,
  CreateWorkflowStateInput,
  UpdateWorkflowStateInput,
  CreateProjectInput,
  CreateLabelInput,
  CreateIssueInput,
  CreateDocumentInput,
  UpdateIssueInput,
} from './types.js';

export interface LinearClientOptions {
  apiToken: string;
  queue?: PQueue;
}

export class LinearClient {
  private readonly sdk: SdkLinearClient;
  private readonly queue: PQueue;

  constructor(options: LinearClientOptions) {
    if (!options.apiToken) {
      throw new Error('Linear API токен обязателен для инициализации LinearClient');
    }

    this.sdk = new SdkLinearClient({
      apiKey: options.apiToken,
    });
    this.queue = options.queue || createConcurrencyQueue();
  }

  /**
   * Проверка подключения и получение информации о пользователе и организации Linear
   */
  async getViewer(): Promise<LinearViewer> {
    return this.queue.add(() =>
      withRetry(async () => {
        try {
          const viewer = await this.sdk.viewer;
          const organization = await this.sdk.organization;
          return {
            id: viewer.id,
            name: viewer.name,
            email: viewer.email,
            organizationName: organization?.name,
          };
        } catch (err) {
          const msg = (err as Error).message;
          if (msg.includes('401') || msg.toLowerCase().includes('authentication') || msg.toLowerCase().includes('unauthorized')) {
            throw new ApiError('Неверный Linear API токен (401 Unauthorized)', {
              status: 401,
              isFatal: true,
            });
          }
          throw err;
        }
      }),
    ) as Promise<LinearViewer>;
  }

  /**
   * Получение списка всех команд организации Linear
   */
  async getTeams(): Promise<LinearTeam[]> {
    return this.queue.add(() =>
      withRetry(async () => {
        const teamsConnection = await this.sdk.teams();
        return teamsConnection.nodes.map(team => ({
          id: team.id,
          key: team.key,
          name: team.name,
        }));
      }),
    ) as Promise<LinearTeam[]>;
  }

  /**
   * Получение команды по ключу (например, 'ENG') или ID
   */
  async getTeam(keyOrId: string): Promise<LinearTeam | null> {
    const teams = await this.getTeams();
    return (
      teams.find(
        t => t.key.toLowerCase() === keyOrId.toLowerCase() || t.id.toLowerCase() === keyOrId.toLowerCase(),
      ) || null
    );
  }

  /**
   * Получение Workflow состояний (статусов) для выбранной команды
   */
  async getWorkflowStates(teamId: string): Promise<LinearWorkflowState[]> {
    return this.queue.add(() =>
      withRetry(async () => {
        const team = await this.sdk.team(teamId);
        const statesConnection = await team.states();
        return statesConnection.nodes.map(state => ({
          id: state.id,
          name: state.name,
          type: state.type,
          position: state.position,
        }));
      }),
    ) as Promise<LinearWorkflowState[]>;
  }

  /**
   * Создание нового Workflow состояния (статуса) для команды в Linear
   */
  async createWorkflowState(input: CreateWorkflowStateInput): Promise<LinearWorkflowState> {
    return this.queue.add(() =>
      withRetry(async () => {
        logger.debug({ input }, t('logs.linearClient.creatingState'));
        const payload = await this.sdk.createWorkflowState({
          teamId: input.teamId,
          name: input.name,
          type: input.type,
          color: input.color || '#5e6ad2',
          description: input.description,
          position: input.position,
        });

        const state = await payload.workflowState;
        if (!state) {
          throw new Error(`Не удалось получить созданный WorkflowState в Linear: ${input.name}`);
        }

        return {
          id: state.id,
          name: state.name,
          type: state.type,
          position: state.position,
        };
      }),
    ) as Promise<LinearWorkflowState>;
  }

  /**
   * Обновление существующего WorkflowState (название, цвет, позиция, тип)
   */
  async updateWorkflowState(
    id: string,
    input: UpdateWorkflowStateInput,
  ): Promise<LinearWorkflowState> {
    return this.queue.add(() =>
      withRetry(async () => {
        const payload = await this.sdk.updateWorkflowState(id, {
          name: input.name,
          color: input.color,
          description: input.description,
          position: input.position,
        });

        const state = await payload.workflowState;
        if (!state) {
          throw new Error(`Не удалось обновить WorkflowState в Linear: ${id}`);
        }

        return {
          id: state.id,
          name: state.name,
          type: state.type,
          position: state.position,
        };
      }),
    ) as Promise<LinearWorkflowState>;
  }

  /**
   * Архивирование статуса Linear
   */
  async archiveWorkflowState(id: string): Promise<void> {
    return this.queue.add(() =>
      withRetry(async () => {
        const payload = await this.sdk.archiveWorkflowState(id);
        if (!payload.success) {
          throw new Error(`Не удалось архивировать WorkflowState: ${id}`);
        }
      }),
    );
  }

  /**
   * Получение списка всех пользователей организации Linear
   */
  async getUsers(): Promise<LinearUser[]> {
    return this.queue.add(() =>
      withRetry(async () => {
        const usersConnection = await this.sdk.users();
        return usersConnection.nodes.map(user => ({
          id: user.id,
          name: user.name,
          email: user.email,
          displayName: user.displayName,
          active: user.active,
        }));
      }),
    ) as Promise<LinearUser[]>;
  }

  /**
   * Получение списка существующих меток (labels) команды
   */
  async getLabels(teamId: string): Promise<LinearLabel[]> {
    return this.queue.add(() =>
      withRetry(async () => {
        const team = await this.sdk.team(teamId);
        const labelsConnection = await team.labels();
        return labelsConnection.nodes.map(label => ({
          id: label.id,
          name: label.name,
          color: label.color,
        }));
      }),
    ) as Promise<LinearLabel[]>;
  }

  /**
   * Получение списка существующих проектов команды
   */
  async getProjects(teamId: string): Promise<LinearProject[]> {
    return this.queue.add(() =>
      withRetry(async () => {
        const team = await this.sdk.team(teamId);
        const projectsConnection = await team.projects();
        return projectsConnection.nodes.map(project => ({
          id: project.id,
          name: project.name,
          description: project.description,
          state: project.state,
        }));
      }),
    ) as Promise<LinearProject[]>;
  }

  /**
   * Создание нового проекта в Linear
   */
  async createProject(input: CreateProjectInput): Promise<LinearProject> {
    return this.queue.add(() =>
      withRetry(async () => {
        logger.debug({ name: input.name, teamId: input.teamId }, t('logs.linearClient.creatingProject'));
        const projectPayload = await this.sdk.createProject({
          name: input.name,
          description: input.description || undefined,
          teamIds: [input.teamId],
        });

        const project = await projectPayload.project;
        if (!project) {
          throw new Error(`Не удалось получить созданный проект Linear: ${input.name}`);
        }

        return {
          id: project.id,
          name: project.name,
          description: project.description,
          state: project.state,
        };
      }),
    ) as Promise<LinearProject>;
  }

  /**
   * Создание новой метки (Label) на уровне команды
   */
  async createLabel(input: CreateLabelInput): Promise<LinearLabel> {
    return this.queue.add(() =>
      withRetry(async () => {
        logger.debug({ name: input.name, teamId: input.teamId }, t('logs.linearClient.creatingLabel'));
        const labelPayload = await this.sdk.createIssueLabel({
          name: input.name,
          color: input.color,
          teamId: input.teamId,
        });

        const label = await labelPayload.issueLabel;
        if (!label) {
          throw new Error(`Не удалось получить созданную метку Linear: ${input.name}`);
        }

        return {
          id: label.id,
          name: label.name,
          color: label.color,
        };
      }),
    ) as Promise<LinearLabel>;
  }

  /**
   * Создание задачи (Issue) в Linear
   */
  async createIssue(input: CreateIssueInput): Promise<LinearIssue> {
    return this.queue.add(() =>
      withRetry(async () => {
        logger.debug({ title: input.title, teamId: input.teamId }, t('logs.linearClient.creatingIssue'));
        const issuePayload = await this.sdk.createIssue({
          teamId: input.teamId,
          title: input.title,
          description: input.description,
          priority: input.priority,
          stateId: input.stateId,
          dueDate: input.dueDate,
          assigneeId: input.assigneeId,
          labelIds: input.labelIds,
          projectId: input.projectId,
          parentId: input.parentId,
        });

        const issue = await issuePayload.issue;
        if (!issue) {
          throw new Error(`Не удалось получить созданную задачу Linear: ${input.title}`);
        }

        return {
          id: issue.id,
          identifier: issue.identifier,
          title: issue.title,
          description: issue.description,
          priority: issue.priority,
          url: issue.url,
        };
      }),
    ) as Promise<LinearIssue>;
  }

  /**
   * Создание проектного документа в Linear
   */
  async createDocument(input: CreateDocumentInput): Promise<LinearDocument> {
    return this.queue.add(() =>
      withRetry(async () => {
        logger.debug(
          { title: input.title, projectId: input.projectId, teamId: input.teamId },
          t('logs.linearClient.creatingDocument'),
        );
        const docPayload = await this.sdk.createDocument({
          title: input.title,
          content: input.content || '',
          projectId: input.projectId || undefined,
          teamId: input.teamId || undefined,
          icon: input.icon,
          color: input.color,
        });

        const doc = await docPayload.document;
        if (!doc) {
          throw new Error(`Не удалось получить созданный документ Linear: ${input.title}`);
        }

        return {
          id: doc.id,
          title: doc.title,
          content: doc.content,
          projectId: doc.projectId,
        };
      }),
    ) as Promise<LinearDocument>;
  }

  /**
   * Подписка пользователя на задачу в Linear в качестве наблюдателя (Subscriber)
   */
  async subscribeUser(issueId: string, userId: string): Promise<void> {
    return this.queue.add(() =>
      withRetry(async () => {
        logger.debug({ issueId, userId }, t('logs.linearClient.subscribingWatcher'));
        await this.sdk.issueSubscribe(issueId, { userId });
      }),
    ) as Promise<void>;
  }

  /**
   * Обновление существующей задачи в Linear
   */
  async updateIssue(issueId: string, input: UpdateIssueInput): Promise<void> {
    return this.queue.add(() =>
      withRetry(async () => {
        logger.debug({ issueId, input }, t('logs.linearClient.updatingIssue'));
        await this.sdk.updateIssue(issueId, {
          title: input.title,
          description: input.description,
          priority: input.priority,
          parentId: input.parentId,
          stateId: input.stateId,
          assigneeId: input.assigneeId,
          labelIds: input.labelIds,
          dueDate: input.dueDate,
          projectId: input.projectId,
        });
      }),
    ) as Promise<void>;
  }
}
