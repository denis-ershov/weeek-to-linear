import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WeeekClient } from '../../src/clients/weeek/client.js';

describe('clients/weeek/client', () => {
  const mockToken = 'mock_weeek_token';
  let client: WeeekClient;

  beforeEach(() => {
    vi.restoreAllMocks();
    client = new WeeekClient({ apiToken: mockToken });
  });

  it('должен выбрасывать ошибку, если токен не передан', () => {
    expect(() => new WeeekClient({ apiToken: '' })).toThrow(
      'WEEEK API токен обязателен',
    );
  });

  it('getMe() должен возвращать распарсенного пользователя', async () => {
    const mockUserResponse = {
      user: {
        id: 123,
        email: 'denis@example.com',
        name: 'Denis',
        avatarUrl: null,
      },
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockUserResponse,
    });

    const user = await client.getMe();
    expect(user.id).toBe('123');
    expect(user.email).toBe('denis@example.com');
    expect(user.name).toBe('Denis');
  });

  it('getTasks() должен автоматически объединять страницы пагинации', async () => {
    const page1 = {
      tasks: [
        { id: 1, title: 'Task 1', isCompleted: false, priority: 0 },
        { id: 2, title: 'Task 2', isCompleted: false, priority: 1 },
      ],
      hasMore: true,
    };

    const page2 = {
      tasks: [
        { id: 3, title: 'Task 3', isCompleted: true, priority: 2 },
      ],
      hasMore: false,
    };

    global.fetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => page1,
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => page2,
      });

    const tasks = await client.getTasks({ projectId: '10', perPage: 2 });
    expect(tasks).toHaveLength(3);
    expect(tasks[0]?.id).toBe('1');
    expect(tasks[1]?.id).toBe('2');
    expect(tasks[2]?.id).toBe('3');
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it('getTasks() должен корректно обрабатывать задачи с null priority и пустыми полями', async () => {
    const rawData = {
      tasks: [
        {
          id: 101,
          title: null,
          priority: null,
          isCompleted: null,
          date: null,
          tags: null,
          assignees: null,
        },
      ],
      hasMore: false,
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => rawData,
    });

    const tasks = await client.getTasks();
    expect(tasks).toHaveLength(1);
    expect(tasks[0]?.id).toBe('101');
    expect(tasks[0]?.title).toBe('Untitled task');
    expect(tasks[0]?.priority).toBe(0);
    expect(tasks[0]?.isCompleted).toBe(false);
    expect(tasks[0]?.assignees).toEqual([]);
    expect(tasks[0]?.tags).toEqual([]);
  });

  it('getBoards() и getBoardColumns() должны загружать доски и колонки через API', async () => {
    const mockBoards = {
      boards: [
        { id: 1, name: 'Основная доска', projectId: 10 },
      ],
    };

    const mockColumns = {
      boardColumns: [
        { id: 101, name: '💡 Важное', boardId: 1 },
        { id: 102, name: '👾 В работе', boardId: 1 },
        { id: 103, name: '‼️ Закрыто', boardId: 1 },
      ],
    };

    global.fetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockBoards,
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockColumns,
      });

    const columns = await client.getBoardColumns({ projectId: '10' });
    expect(columns).toHaveLength(3);
    expect(columns[0]?.name).toBe('💡 Важное');
    expect(columns[1]?.name).toBe('👾 В работе');
    expect(columns[2]?.name).toBe('‼️ Закрыто');
  });

  it('getDocuments() должен загружать документы базы знаний и парсить EditorJS/HTML контент', async () => {
    const mockDocsResponse = {
      articles: [
        {
          id: 501,
          name: 'Онбординг разработчика',
          body: {
            blocks: [
              { type: 'header', data: { text: 'Добро пожаловать', level: 1 } },
              { type: 'paragraph', data: { text: 'Инструкция по развертыванию' } },
            ],
          },
          projectId: 10,
        },
      ],
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockDocsResponse,
    });

    const docs = await client.getDocuments({ projectId: '10' });
    expect(docs).toHaveLength(1);
    expect(docs[0]?.id).toBe('501');
    expect(docs[0]?.title).toBe('Онбординг разработчика');
    expect(docs[0]?.content).toContain('# Добро пожаловать');
    expect(docs[0]?.content).toContain('Инструкция по развертыванию');
  });

  it('getSingleDocument() должен запрашивать тело статьи, если оно пустое в списке', async () => {
    const mockArticle = {
      article: {
        id: 502,
        name: 'Детальная статья',
        content: '<h1>Заголовок статьи</h1><p>Текст статьи</p>',
      },
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockArticle,
    });

    const doc = await client.getSingleDocument('502');
    expect(doc).not.toBeNull();
    expect(doc?.id).toBe('502');
    expect(doc?.title).toBe('Детальная статья');
    expect(doc?.content).toContain('# Заголовок статьи');
  });

  it('getTaskComments() должен запрашивать и парсить комментарии к задаче', async () => {
    const mockComments = {
      comments: [
        {
          id: 1001,
          taskId: 2001,
          text: 'Первый комментарий',
          authorId: 'usr-1',
          author: { name: 'Алексей', email: 'alex@example.com' },
          createdAt: '2026-08-13T10:00:00Z',
        },
      ],
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockComments,
    });

    const comments = await client.getTaskComments('2001');
    expect(comments).toHaveLength(1);
    expect(comments[0]?.id).toBe('1001');
    expect(comments[0]?.text).toBe('Первый комментарий');
    expect(comments[0]?.author?.name).toBe('Алексей');
  });
});
