import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LinearClient } from '../../src/clients/linear/client.js';

// Создаем типизированные моки для методов SDK Linear
const mockSdkInstance = {
  viewer: Promise.resolve({ id: 'usr_1', name: 'Denis', email: 'denis@example.com' }),
  organization: Promise.resolve({ name: 'My Org' }),
  teams: vi.fn().mockResolvedValue({
    nodes: [{ id: 'team_1', key: 'ENG', name: 'Engineering' }],
  }),
  team: vi.fn().mockResolvedValue({
    labels: vi.fn().mockResolvedValue({
      nodes: [{ id: 'lbl_1', name: 'bug', color: '#ff0000' }],
    }),
    projects: vi.fn().mockResolvedValue({
      nodes: [{ id: 'proj_1', name: 'Migration', description: 'desc', state: 'started' }],
    }),
    states: vi.fn().mockResolvedValue({
      nodes: [
        { id: 'st_1', name: 'Todo', type: 'unstarted', color: '#888888', position: 1 },
        { id: 'st_2', name: 'In Progress', type: 'started', color: '#0088ff', position: 2 },
      ],
    }),
  }),
  users: vi.fn().mockResolvedValue({
    nodes: [{ id: 'usr_1', name: 'Denis', email: 'denis@example.com', active: true }],
  }),
  createProject: vi.fn().mockResolvedValue({
    project: Promise.resolve({ id: 'proj_new', name: 'New Project', state: 'planned' }),
  }),
  createIssueLabel: vi.fn().mockResolvedValue({
    issueLabel: Promise.resolve({ id: 'lbl_new', name: 'feature', color: '#00ff00' }),
  }),
  createWorkflowState: vi.fn().mockResolvedValue({
    workflowState: Promise.resolve({
      id: 'st_new',
      name: 'Review',
      type: 'started',
      color: '#ffbb00',
    }),
  }),
  updateWorkflowState: vi.fn().mockResolvedValue({
    workflowState: Promise.resolve({
      id: 'st_1',
      name: 'To Do Renamed',
      color: '#111111',
      type: 'started',
    }),
  }),
  archiveWorkflowState: vi.fn().mockResolvedValue({ success: true }),
  createIssue: vi.fn().mockResolvedValue({
    issue: Promise.resolve({
      id: 'iss_1',
      identifier: 'ENG-1',
      title: 'First task',
      description: 'Test',
      priority: 2,
      url: 'https://linear.app/issue/ENG-1',
    }),
  }),
  updateIssue: vi.fn().mockResolvedValue({}),
  createComment: vi.fn().mockResolvedValue({
    comment: Promise.resolve({ id: 'com_1', body: 'Test comment' }),
  }),
  issueSubscribe: vi.fn().mockResolvedValue({}),
  createDocument: vi.fn().mockResolvedValue({
    document: Promise.resolve({ id: 'doc_1', title: 'Doc Title', content: 'Doc Content' }),
  }),
};

vi.mock('@linear/sdk', () => {
  return {
    LinearClient: vi.fn().mockImplementation(() => mockSdkInstance),
  };
});

describe('clients/linear/client (Full Suite)', () => {
  let client: LinearClient;

  beforeEach(() => {
    vi.clearAllMocks();
    client = new LinearClient({ apiToken: 'lin_api_valid_token' });
  });

  it('должен выбрасывать ошибку, если токен не передан', () => {
    expect(() => new LinearClient({ apiToken: '' })).toThrow('Linear API токен обязателен');
  });

  it('должен возвращать информацию о текущем пользователе и организации (getViewer)', async () => {
    const viewer = await client.getViewer();
    expect(viewer.id).toBe('usr_1');
    expect(viewer.name).toBe('Denis');
    expect(viewer.organizationName).toBe('My Org');
  });

  it('должен получать список команд организации (getTeams)', async () => {
    const teams = await client.getTeams();
    expect(teams).toHaveLength(1);
    expect(teams[0].key).toBe('ENG');
  });

  it('должен находить команду по ключу (getTeam)', async () => {
    const team = await client.getTeam('ENG');
    expect(team).not.toBeNull();
    expect(team?.id).toBe('team_1');

    const notFound = await client.getTeam('UNKNOWN');
    expect(notFound).toBeNull();
  });

  it('должен получать статусы команды (getWorkflowStates)', async () => {
    const states = await client.getWorkflowStates('team_1');
    expect(states).toHaveLength(2);
    expect(states[0].name).toBe('Todo');
  });

  it('должен создавать новый статус в команде (createWorkflowState)', async () => {
    const state = await client.createWorkflowState({
      teamId: 'team_1',
      name: 'Review',
      type: 'started',
      color: '#ffbb00',
    });
    expect(state.name).toBe('Review');
    expect(mockSdkInstance.createWorkflowState).toHaveBeenCalled();
  });

  it('должен обновлять статус (updateWorkflowState)', async () => {
    await client.updateWorkflowState('st_1', { name: 'To Do Renamed', color: '#111111' });
    expect(mockSdkInstance.updateWorkflowState).toHaveBeenCalledWith('st_1', {
      name: 'To Do Renamed',
      color: '#111111',
    });
  });

  it('должен архивировать статус (archiveWorkflowState)', async () => {
    await client.archiveWorkflowState('st_1');
    expect(mockSdkInstance.archiveWorkflowState).toHaveBeenCalledWith('st_1');
  });

  it('должен получать список пользователей Linear (getUsers)', async () => {
    const users = await client.getUsers();
    expect(users).toHaveLength(1);
    expect(users[0].email).toBe('denis@example.com');
  });

  it('должен получать метки команды (getLabels) и создавать новую метку (createLabel)', async () => {
    const labels = await client.getLabels('team_1');
    expect(labels).toHaveLength(1);
    expect(labels[0].name).toBe('bug');

    const newLabel = await client.createLabel({
      teamId: 'team_1',
      name: 'feature',
      color: '#00ff00',
    });
    expect(newLabel.name).toBe('feature');
    expect(mockSdkInstance.createIssueLabel).toHaveBeenCalled();
  });

  it('должен получать проекты (getProjects) и создавать новый проект (createProject)', async () => {
    const projects = await client.getProjects('team_1');
    expect(projects).toHaveLength(1);
    expect(projects[0].name).toBe('Migration');

    const created = await client.createProject({ teamId: 'team_1', name: 'New Project' });
    expect(created.id).toBe('proj_new');
    expect(mockSdkInstance.createProject).toHaveBeenCalled();
  });

  it('должен создавать задачу (createIssue) и обновлять задачу (updateIssue)', async () => {
    const issue = await client.createIssue({
      teamId: 'team_1',
      title: 'First task',
      description: 'Test description',
      priority: 2,
    });
    expect(issue.identifier).toBe('ENG-1');
    expect(mockSdkInstance.createIssue).toHaveBeenCalled();

    await client.updateIssue('iss_1', { title: 'Updated task' });
    expect(mockSdkInstance.updateIssue).toHaveBeenCalledWith('iss_1', {
      title: 'Updated task',
      description: undefined,
      priority: undefined,
      parentId: undefined,
      stateId: undefined,
      assigneeId: undefined,
      labelIds: undefined,
      dueDate: undefined,
      projectId: undefined,
    });
  });

  it('должен безопасно создавать комментарий для Personal API Key (пропуская createAsUser во избежание actor=app ошибок)', async () => {
    const comment = await client.createComment({
      issueId: 'iss_1',
      body: 'Test comment content',
      createAsUser: 'Denis Author',
    });
    expect(comment.id).toBe('com_1');
    expect(comment.body).toBe('Test comment');
    expect(mockSdkInstance.createComment).toHaveBeenCalledWith({
      issueId: 'iss_1',
      body: 'Test comment content',
      createAsUser: undefined,
      displayIconUrl: undefined,
    });
  });

  it('должен передавать createAsUser для токена с поддержкой OAuth actor=app', async () => {
    const oauthClient = new LinearClient({
      apiToken: 'oauth_token_123',
      supportsActorApp: true,
    });
    const comment = await oauthClient.createComment({
      issueId: 'iss_1',
      body: 'OAuth comment content',
      createAsUser: 'Denis Author',
    });
    expect(comment.id).toBe('com_1');
    expect(mockSdkInstance.createComment).toHaveBeenCalledWith({
      issueId: 'iss_1',
      body: 'OAuth comment content',
      createAsUser: 'Denis Author',
      displayIconUrl: undefined,
    });
  });

  it('должен перехватывать ошибку createAsUser actor=app mode и выполнять fallback без потери автора', async () => {
    const oauthClient = new LinearClient({
      apiToken: 'oauth_token_invalid_app',
      supportsActorApp: true,
    });

    mockSdkInstance.createComment
      .mockRejectedValueOnce(new Error('`createAsUser` used without OAuth `actor=app` mode'))
      .mockResolvedValueOnce({
        comment: Promise.resolve({ id: 'com_fallback', body: '> 💬 **Denis Author**:\n\nFallback comment' }),
      });

    const comment = await oauthClient.createComment({
      issueId: 'iss_1',
      body: 'Fallback comment',
      createAsUser: 'Denis Author',
    });

    expect(comment.id).toBe('com_fallback');
    expect(oauthClient.canUseCreateAsUser()).toBe(false);
    expect(mockSdkInstance.createComment).toHaveBeenCalledTimes(2);
  });

  it('должен подписывать пользователя как наблюдателя (subscribeUser)', async () => {
    await client.subscribeUser('iss_1', 'usr_1');
    expect(mockSdkInstance.issueSubscribe).toHaveBeenCalledWith('iss_1', { userId: 'usr_1' });
  });

  it('должен создавать проектный документ (createDocument)', async () => {
    const doc = await client.createDocument({
      teamId: 'team_1',
      title: 'Doc Title',
      content: 'Doc Content',
    });
    expect(doc.id).toBe('doc_1');
    expect(mockSdkInstance.createDocument).toHaveBeenCalled();
  });
});
