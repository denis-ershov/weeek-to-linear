import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { WebServer } from '../../src/server/server.js';

describe('server/server', () => {
  let server: WebServer;
  let serverUrl: string;

  beforeEach(async () => {
    // Запуск на динамическом порту
    server = new WebServer({ port: 3499 });
    const res = await server.start();
    serverUrl = res.url;
  });

  afterEach(async () => {
    await server.stop();
  });

  it('должен отдавать статус сервера по GET /api/status', async () => {
    const res = await fetch(`${serverUrl}/api/status`);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(data.version).toBe('0.1.0');
    expect(data.hasEnvTokens).toBeDefined();
  });

  it('должен отдавать статический index.html по корневому пути GET /', async () => {
    const res = await fetch(`${serverUrl}/`);
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('text/html');

    const html = await res.text();
    expect(html).toContain('WEEEK → Linear');
  });

  it('должен возвращать 400 на POST /api/auth/test без токенов', async () => {
    const res = await fetch(`${serverUrl}/api/auth/test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ weeekToken: '', linearToken: '' }),
    });

    const data = await res.json();
    if (!process.env['WEEEK_API_TOKEN']) {
      expect(res.status).toBe(400);
      expect(data.success).toBe(false);
    }
  });
});
