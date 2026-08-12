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
});
