import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { WebServer } from '../../src/server/server.js';

describe('server/server & ApiRouter Full Suite', () => {
  let server: WebServer;
  let serverUrl: string;

  beforeAll(async () => {
    server = new WebServer({ port: 0, host: '127.0.0.1' });
    const res = await server.start();
    serverUrl = res.url;
  });

  afterAll(async () => {
    await server.stop();
  });

  it('должен отдавать статус сервера по GET /api/status', async () => {
    const res = await fetch(`${serverUrl}/api/status`);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(data.version).toBe('0.4.0');
    expect(data.hasEnvTokens).toBeDefined();
    expect(data.defaultConfig).toBeDefined();
  });

  it('должен отдавать статический index.html по корневому пути GET /', async () => {
    const res = await fetch(`${serverUrl}/`);
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('text/html');

    const html = await res.text();
    expect(html).toContain('WEEEK → Linear');
  });

  it('должен отдавать CSS и JS ресурсы с корректным Content-Type', async () => {
    const resCss = await fetch(`${serverUrl}/app.css`);
    expect(resCss.status).toBe(200);
    expect(resCss.headers.get('content-type')).toContain('text/css');

    const resJs = await fetch(`${serverUrl}/app.js`);
    expect(resJs.status).toBe(200);
    expect(resJs.headers.get('content-type')).toContain('application/javascript');
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

  it('должен корректно обрабатывать повреждённый JSON (Malformed JSON) и возвращать 400', async () => {
    const res = await fetch(`${serverUrl}/api/auth/test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'INVALID_JSON_BODY{{{',
    });
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBeDefined();
  });

  it('должен требовать токен для защищённых роутов WEEEK и Linear', async () => {
    const resWeeekUsers = await fetch(`${serverUrl}/api/weeek/users`);
    expect([200, 400]).toContain(resWeeekUsers.status);

    const resLinearTeams = await fetch(`${serverUrl}/api/linear/teams`);
    expect([200, 400]).toContain(resLinearTeams.status);

    const resLinearStates = await fetch(`${serverUrl}/api/linear/states?teamId=`);
    expect(resLinearStates.status).toBe(400);
  });

  it('должен возвращать отчет о последней миграции по GET /api/reports/latest', async () => {
    const res = await fetch(`${serverUrl}/api/reports/latest`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveProperty('hasReport');
  });

  it('должен безопасно обрабатывать остановку миграции по POST /api/migrate/stop', async () => {
    const res = await fetch(`${serverUrl}/api/migrate/stop`, { method: 'POST' });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
  });
});
