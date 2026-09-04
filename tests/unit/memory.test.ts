import { describe, it, expect, vi } from 'vitest';
import { EventEmitter } from 'node:events';
import { SseManager } from '../../src/server/routes.js';
import type { ServerResponse } from 'node:http';

function createMockResponse(): ServerResponse & EventEmitter {
  const emitter = new EventEmitter() as ServerResponse & EventEmitter;
  emitter.writeHead = vi.fn().mockReturnValue(emitter);
  emitter.write = vi.fn().mockReturnValue(true);
  emitter.end = vi.fn().mockImplementation(() => {
    emitter.emit('close');
    return emitter;
  });
  return emitter;
}

describe('Memory Leak & Resource Lifecycle Audit', () => {
  it('должен корректно регистрировать клиентов и удалять их при событии close', () => {
    const sseManager = new SseManager();
    const res1 = createMockResponse();
    const res2 = createMockResponse();

    sseManager.addClient(res1);
    sseManager.addClient(res2);

    // Рассылаем тестовое событие
    sseManager.broadcast({
      type: 'heartbeat',
      timestamp: new Date().toISOString(),
    });
    expect(res1.write).toHaveBeenCalledWith(expect.stringContaining('"heartbeat"'));
    expect(res2.write).toHaveBeenCalledWith(expect.stringContaining('"heartbeat"'));

    // Симулируем разрыв соединения клиентом 1
    res1.emit('close');

    // Очищаем мок вызовов write
    vi.clearAllMocks();

    // Новая рассылка должна дойти только до res2
    sseManager.broadcast({
      type: 'progress',
      current: 10,
      total: 100,
      timestamp: new Date().toISOString(),
    });
    expect(res1.write).not.toHaveBeenCalled();
    expect(res2.write).toHaveBeenCalledWith(expect.stringContaining('"progress"'));

    // Закрываем все соединения
    sseManager.closeAll();
    expect(res2.end).toHaveBeenCalled();
  });

  it('должен выдерживать интенсивный поток из 1000 событий без накопления зависших ссылок', () => {
    const sseManager = new SseManager();
    const res = createMockResponse();
    sseManager.addClient(res);

    for (let i = 0; i < 1000; i++) {
      sseManager.broadcast({
        type: 'progress',
        progressType: 'tasks',
        current: i,
        total: 1000,
        timestamp: new Date().toISOString(),
      });
    }

    expect(res.write).toHaveBeenCalledTimes(1001); // 1 connect + 1000 events

    // Закрытие и освобождение
    sseManager.closeAll();
  });
});
