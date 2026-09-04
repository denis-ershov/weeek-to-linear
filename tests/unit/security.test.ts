import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'node:http';
import { WebServer } from '../../src/server/server.js';
import { redactSensitiveData } from '../../src/utils/logger.js';

describe('Security & SecOps Audit Tests', () => {
  let server: WebServer;
  let serverUrl: string;

  beforeAll(async () => {
    server = new WebServer({ port: 0, host: '127.0.0.1' });
    const info = await server.start();
    serverUrl = info.url;
  });

  afterAll(async () => {
    await server.stop();
  });

  describe('Path Traversal Protection (serveStatic)', () => {
    it('должен блокировать попытку Path Traversal через %2e%2e и возвращать 403', async () => {
      const parsed = new URL(serverUrl);
      const res = await new Promise<{ status: number; body: string }>(resolve => {
        const req = http.request(
          {
            host: parsed.hostname,
            port: Number(parsed.port),
            path: '/%2e%2e/%2e%2e/package.json',
            method: 'GET',
          },
          r => {
            let data = '';
            r.on('data', chunk => (data += chunk));
            r.on('end', () => resolve({ status: r.statusCode || 0, body: data }));
          },
        );
        req.end();
      });
      expect(res.status).toBe(403);
      expect(res.body).toContain('403 Forbidden');
    });

    it('должен блокировать прямой переход .. за пределы каталога статики', async () => {
      const reqRes = await new Promise<{ status: number; body: string }>(resolve => {
        const req = http.request(`${serverUrl}/../../package.json`, { method: 'GET' }, r => {
          let data = '';
          r.on('data', chunk => (data += chunk));
          r.on('end', () => resolve({ status: r.statusCode || 0, body: data }));
        });
        req.end();
      });
      // Либо 403 Forbidden, либо SPA fallback на 200 (index.html) без утечки package.json
      expect([403, 404, 200]).toContain(reqRes.status);
      if (reqRes.status === 200) {
        expect(reqRes.body).not.toContain('"name": "weeek-to-linear"');
        expect(reqRes.body).toContain('<!DOCTYPE html>');
      }
    });

    it('должен возвращать security-заголовки при отдаче статики', async () => {
      const res = await fetch(`${serverUrl}/`);
      expect(res.headers.get('x-content-type-options')).toBe('nosniff');
      expect(res.headers.get('x-frame-options')).toBe('DENY');
      expect(res.headers.get('referrer-policy')).toBe('no-referrer');
    });
  });

  describe('CORS & Origin Hardening', () => {
    it('не должен разрешать произвольный Origin (evil.com) в Access-Control-Allow-Origin', async () => {
      const res = await fetch(`${serverUrl}/api/status`, {
        headers: { Origin: 'https://evil.com' },
      });
      expect(res.status).toBe(200);
      const allowOrigin = res.headers.get('access-control-allow-origin');
      expect(allowOrigin).not.toBe('https://evil.com');
      expect(allowOrigin).not.toBe('*');
    });

    it('должен разрешать доверенный Origin localhost / 127.0.0.1', async () => {
      const res = await fetch(`${serverUrl}/api/status`, {
        headers: { Origin: 'http://localhost:3456' },
      });
      expect(res.status).toBe(200);
      expect(res.headers.get('access-control-allow-origin')).toBe('http://localhost:3456');
    });
  });

  describe('Zero-Leak Token Masking', () => {
    it('должен маскировать реальные API токены в выводе логов', () => {
      const rawSecret1 = 'lin_api_abcdef1234567890abcdef1234567890';
      const rawSecret2 = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.secretpayload.sig';

      const redacted1 = redactSensitiveData(`Connecting with token ${rawSecret1}`);
      const redacted2 = redactSensitiveData(`WEEEK token: Bearer ${rawSecret2}`);

      expect(redacted1).not.toContain(rawSecret1);
      expect(redacted1).toContain('[REDACTED]');

      expect(redacted2).not.toContain(rawSecret2);
      expect(redacted2).toContain('[REDACTED]');
    });
  });
});
