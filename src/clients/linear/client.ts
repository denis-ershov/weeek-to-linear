import { LinearClient as SdkLinearClient } from '@linear/sdk';
import type PQueue from 'p-queue';
import { logger } from '../../utils/logger.js';
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
  CreateProjectInput,
  CreateLabelInput,
  CreateIssueInput,
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
        logger.debug({ name: input.name, teamId: input.teamId }, 'Создание проекта в Linear');
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
        logger.debug({ name: input.name, teamId: input.teamId }, 'Создание метки в Linear');
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
        logger.debug({ title: input.title, teamId: input.teamId }, 'Создание задачи в Linear');
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
   * Обновление существующей задачи в Linear (для связывания родителей или статусов)
   */
  async updateIssue(issueId: string, input: UpdateIssueInput): Promise<void> {
    return this.queue.add(() =>
      withRetry(async () => {
        logger.debug({ issueId, input }, 'Обновление задачи в Linear');
        await this.sdk.updateIssue(issueId, {
          parentId: input.parentId,
          stateId: input.stateId,
          assigneeId: input.assigneeId,
          labelIds: input.labelIds,
          dueDate: input.dueDate,
          description: input.description,
        });
      }),
    ) as Promise<void>;
  }
}
