import type { IncomingMessage, ServerResponse } from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { CONSTANTS } from '../config/constants.js';
import { getAppConfig } from '../config/env.js';
import { WeeekClient } from '../clients/weeek/client.js';
import { LinearClient } from '../clients/linear/client.js';
import { MigrationEngine } from '../core/engine.js';
import { StateManager } from '../core/state.js';
import type {
  ServerStatusResponse,
  AuthTestRequest,
  AuthTestResponse,
  StartMigrationRequest,
  SseEventData,
} from './types.js';

export class SseManager {
  private clients: Set<ServerResponse> = new Set();

  public addClient(res: ServerResponse): void {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'Access-Control-Allow-Origin': '*',
    });
    res.write(': connected\n\n');
    this.clients.add(res);

    res.on('close', () => {
      this.clients.delete(res);
    });
  }

  public broadcast(event: SseEventData): void {
    const payload = `data: ${JSON.stringify(event)}\n\n`;
    for (const client of this.clients) {
      client.write(payload);
    }
  }

  public closeAll(): void {
    for (const client of this.clients) {
      client.end();
    }
    this.clients.clear();
  }
}

export class ApiRouter {
  private sseManager: SseManager;
  private currentEngine: MigrationEngine | null = null;
  private isMigrationRunning = false;

  constructor(sseManager: SseManager) {
    this.sseManager = sseManager;
  }

  /**
   * Разбор JSON тела запроса
   */
  private async parseJsonBody<T>(req: IncomingMessage): Promise<T> {
    return new Promise((resolve, reject) => {
      let body = '';
      req.on('data', chunk => {
        body += chunk;
        if (body.length > 1024 * 1024) {
          reject(new Error('Размер тела запроса превышает 1MB'));
        }
      });
      req.on('end', () => {
        try {
          resolve(body ? JSON.parse(body) : ({} as T));
        } catch (err) {
          reject(new Error(`Невалидный JSON: ${(err as Error).message}`));
        }
      });
      req.on('error', reject);
    });
  }

  private sendJson(res: ServerResponse, status: number, data: unknown): void {
    res.writeHead(status, {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    });
    res.end(JSON.stringify(data));
  }

  public async handleRequest(req: IncomingMessage, res: ServerResponse, url: URL): Promise<boolean> {
    const { pathname } = url;
    const method = req.method || 'GET';

    if (method === 'OPTIONS') {
      res.writeHead(204, {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      });
      res.end();
      return true;
    }

    // 1. GET /api/status
    if (pathname === '/api/status' && method === 'GET') {
      const config = getAppConfig();
      const response: ServerStatusResponse = {
        ok: true,
        version: CONSTANTS.APP_VERSION,
        hasEnvTokens: {
          weeek: Boolean(config.WEEEK_API_TOKEN),
          linear: Boolean(config.LINEAR_API_TOKEN),
        },
        defaultConfig: {
          logLevel: config.LOG_LEVEL,
          concurrency: config.API_CONCURRENCY,
          stateFile: config.STATE_FILE,
        },
      };
      this.sendJson(res, 200, response);
      return true;
    }

    // 2. POST /api/auth/test
    if (pathname === '/api/auth/test' && method === 'POST') {
      try {
        const body = await this.parseJsonBody<AuthTestRequest>(req);
        const config = getAppConfig();
        const weeekToken = body.weeekToken || config.WEEEK_API_TOKEN;
        const linearToken = body.linearToken || config.LINEAR_API_TOKEN;

        if (!weeekToken || !linearToken) {
          this.sendJson(res, 400, {
            success: false,
            error: 'Необходимо указать токены WEEEK и Linear',
          });
          return true;
        }

        const weeekClient = new WeeekClient({ apiToken: weeekToken });
        const linearClient = new LinearClient({ apiToken: linearToken });

        const [weeekUser, linearViewer] = await Promise.all([
          weeekClient.getMe(),
          linearClient.getViewer(),
        ]);

        const response: AuthTestResponse = {
          success: true,
          weeekUser: {
            id: weeekUser.id,
            name: weeekUser.name || 'Пользователь',
            email: weeekUser.email,
          },
          linearViewer: {
            id: linearViewer.id,
            name: linearViewer.name,
            email: linearViewer.email,
            organizationName: linearViewer.organizationName,
          },
        };

        this.sendJson(res, 200, response);
      } catch (err) {
        this.sendJson(res, 400, {
          success: false,
          error: (err as Error).message,
        });
      }
      return true;
    }

    // 3. GET /api/weeek/projects
    if (pathname === '/api/weeek/projects' && method === 'GET') {
      try {
        const token = url.searchParams.get('token') || getAppConfig().WEEEK_API_TOKEN;
        if (!token) {
          this.sendJson(res, 400, { error: 'WEEEK API токен не указан' });
          return true;
        }
        const client = new WeeekClient({ apiToken: token });
        const projects = await client.getProjects();
        this.sendJson(res, 200, { projects });
      } catch (err) {
        this.sendJson(res, 400, { error: (err as Error).message });
      }
      return true;
    }

    // 4. GET /api/linear/teams
    if (pathname === '/api/linear/teams' && method === 'GET') {
      try {
        const token = url.searchParams.get('token') || getAppConfig().LINEAR_API_TOKEN;
        if (!token) {
          this.sendJson(res, 400, { error: 'Linear API токен не указан' });
          return true;
        }
        const client = new LinearClient({ apiToken: token });
        const teams = await client.getTeams();
        this.sendJson(res, 200, { teams });
      } catch (err) {
        this.sendJson(res, 400, { error: (err as Error).message });
      }
      return true;
    }

    // 5. GET /api/linear/states
    if (pathname === '/api/linear/states' && method === 'GET') {
      try {
        const token = url.searchParams.get('token') || getAppConfig().LINEAR_API_TOKEN;
        const teamId = url.searchParams.get('teamId');
        if (!token || !teamId) {
          this.sendJson(res, 400, { error: 'Токен Linear и teamId обязательны' });
          return true;
        }
        const client = new LinearClient({ apiToken: token });
        const states = await client.getWorkflowStates(teamId);
        this.sendJson(res, 200, { states });
      } catch (err) {
        this.sendJson(res, 400, { error: (err as Error).message });
      }
      return true;
    }

    // 6. GET /api/linear/users
    if (pathname === '/api/linear/users' && method === 'GET') {
      try {
        const token = url.searchParams.get('token') || getAppConfig().LINEAR_API_TOKEN;
        if (!token) {
          this.sendJson(res, 400, { error: 'Linear API токен не указан' });
          return true;
        }
        const client = new LinearClient({ apiToken: token });
        const users = await client.getUsers();
        this.sendJson(res, 200, { users });
      } catch (err) {
        this.sendJson(res, 400, { error: (err as Error).message });
      }
      return true;
    }

    // 7. GET /api/migrate/stream (SSE)
    if (pathname === '/api/migrate/stream' && method === 'GET') {
      this.sseManager.addClient(res);
      return true;
    }

    // 8. POST /api/migrate/start
    if (pathname === '/api/migrate/start' && method === 'POST') {
      if (this.isMigrationRunning) {
        this.sendJson(res, 409, { error: 'Миграция уже выполняется' });
        return true;
      }

      try {
        const body = await this.parseJsonBody<StartMigrationRequest>(req);
        const config = getAppConfig();
        const weeekToken = body.weeekToken || config.WEEEK_API_TOKEN;
        const linearToken = body.linearToken || config.LINEAR_API_TOKEN;

        if (!weeekToken || !linearToken) {
          this.sendJson(res, 400, { error: 'Токены API обязательны' });
          return true;
        }

        const weeekClient = new WeeekClient({ apiToken: weeekToken });
        const linearClient = new LinearClient({ apiToken: linearToken });
        const stateManager = new StateManager(config.STATE_FILE);

        this.currentEngine = new MigrationEngine(weeekClient, linearClient, stateManager, {
          onStage: (stageNumber, stageName) => {
            this.sseManager.broadcast({
              type: 'stage',
              stageNumber,
              stageName,
              timestamp: new Date().toISOString(),
            });
          },
          onProgress: (progressType, current, total, itemName) => {
            this.sseManager.broadcast({
              type: 'progress',
              progressType,
              current,
              total,
              itemName,
              timestamp: new Date().toISOString(),
            });
          },
          onWarning: message => {
            this.sseManager.broadcast({
              type: 'warning',
              message,
              timestamp: new Date().toISOString(),
            });
          },
          onError: error => {
            this.sseManager.broadcast({
              type: 'error',
              error,
              timestamp: new Date().toISOString(),
            });
          },
        });

        this.isMigrationRunning = true;
        this.sendJson(res, 202, { success: true, message: 'Миграция запущена' });

        // Асинхронный запуск
        (async () => {
          try {
            const result = await this.currentEngine!.run({
              weeekProjectId: body.weeekProjectId,
              linearTeamKey: body.linearTeamKey,
              dryRun: body.dryRun,
              resume: body.resume,
              force: body.force,
              includeCompleted: body.includeCompleted ?? true,
              includeDeleted: body.includeDeleted ?? false,
              unmatchedUserStrategy: body.unmatchedUserStrategy ?? 'unassigned',
            });

            this.sseManager.broadcast({
              type: 'done',
              summary: result.summary,
              reportPaths: result.reportPaths,
              timestamp: new Date().toISOString(),
            });
          } catch (err) {
            this.sseManager.broadcast({
              type: 'error',
              message: (err as Error).message,
              timestamp: new Date().toISOString(),
            });
          } finally {
            this.isMigrationRunning = false;
            this.currentEngine = null;
          }
        })();

        return true;
      } catch (err) {
        this.isMigrationRunning = false;
        this.sendJson(res, 400, { error: (err as Error).message });
        return true;
      }
    }

    // 9. POST /api/migrate/stop
    if (pathname === '/api/migrate/stop' && method === 'POST') {
      if (this.isMigrationRunning) {
        this.isMigrationRunning = false;
        this.currentEngine = null;
        this.sseManager.broadcast({
          type: 'aborted',
          message: 'Миграция остановлена пользователем',
          timestamp: new Date().toISOString(),
        });
        this.sendJson(res, 200, { success: true, message: 'Процесс остановлен' });
      } else {
        this.sendJson(res, 200, { success: true, message: 'Нет активной миграции' });
      }
      return true;
    }

    // 10. GET /api/reports/latest
    if (pathname === '/api/reports/latest' && method === 'GET') {
      const mdPath = path.resolve('migration-report.md');
      const jsonPath = path.resolve('migration-report.json');

      const mdContent = fs.existsSync(mdPath) ? fs.readFileSync(mdPath, 'utf-8') : null;
      let jsonContent = null;
      if (fs.existsSync(jsonPath)) {
        try {
          jsonContent = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
        } catch {
          jsonContent = null;
        }
      }

      this.sendJson(res, 200, {
        hasReport: Boolean(mdContent || jsonContent),
        markdown: mdContent,
        json: jsonContent,
      });
      return true;
    }

    return false;
  }
}
