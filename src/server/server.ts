import http, { type IncomingMessage, type ServerResponse } from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SseManager, ApiRouter } from './routes.js';
import { logger } from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface ServerOptions {
  port?: number;
  host?: string;
  publicDir?: string;
}

export class WebServer {
  private server: http.Server | null = null;
  private sseManager: SseManager;
  private router: ApiRouter;
  private publicDir: string;
  private port: number;
  private host: string;

  constructor(options: ServerOptions = {}) {
    this.port = options.port || 3456;
    this.host = options.host || '127.0.0.1';
    this.sseManager = new SseManager();
    this.router = new ApiRouter(this.sseManager);

    // Определение директории со статикой (public)
    const localPublic = path.join(__dirname, 'public');
    const distPublic = path.join(__dirname, '../server/public');
    const rootPublic = path.resolve('src/server/public');

    if (options.publicDir && fs.existsSync(options.publicDir)) {
      this.publicDir = options.publicDir;
    } else if (fs.existsSync(localPublic)) {
      this.publicDir = localPublic;
    } else if (fs.existsSync(distPublic)) {
      this.publicDir = distPublic;
    } else {
      this.publicDir = rootPublic;
    }
  }

  /**
   * Отдача статических файлов SPA
   */
  private serveStatic(_req: IncomingMessage, res: ServerResponse, url: URL): void {
    let filePath = path.join(this.publicDir, url.pathname === '/' ? 'index.html' : url.pathname);

    if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      filePath = path.join(this.publicDir, 'index.html');
    }

    if (!fs.existsSync(filePath)) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('404 Not Found');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes: Record<string, string> = {
      '.html': 'text/html; charset=utf-8',
      '.css': 'text/css; charset=utf-8',
      '.js': 'application/javascript; charset=utf-8',
      '.json': 'application/json; charset=utf-8',
      '.png': 'image/png',
      '.svg': 'image/svg+xml',
      '.ico': 'image/x-icon',
    };

    const contentType = mimeTypes[ext] || 'application/octet-stream';
    const content = fs.readFileSync(filePath);

    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': 'no-cache',
      'X-Content-Type-Options': 'nosniff',
    });
    res.end(content);
  }

  /**
   * Запуск сервера
   */
  public async start(): Promise<{ port: number; url: string }> {
    return new Promise((resolve, reject) => {
      this.server = http.createServer(async (req, res) => {
        try {
          const rawHost = req.headers.host || `${this.host}:${this.port}`;
          const parsedUrl = new URL(req.url || '/', `http://${rawHost}`);

          const handled = await this.router.handleRequest(req, res, parsedUrl);
          if (!handled) {
            this.serveStatic(req, res, parsedUrl);
          }
        } catch (err) {
          logger.error(`Ошибка обработки запроса: ${(err as Error).message}`);
          if (!res.headersSent) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Внутренняя ошибка сервера' }));
          }
        }
      });

      this.server.on('error', (err: NodeJS.ErrnoException) => {
        if (err.code === 'EADDRINUSE') {
          // Если порт занят, пробуем следующий
          logger.warn(`Порт ${this.port} занят, пробуем ${this.port + 1}...`);
          this.port++;
          this.server?.close();
          this.start().then(resolve).catch(reject);
        } else {
          reject(err);
        }
      });

      this.server.listen(this.port, this.host, () => {
        const serverUrl = `http://${this.host === '127.0.0.1' ? 'localhost' : this.host}:${this.port}`;
        resolve({ port: this.port, url: serverUrl });
      });
    });
  }

  /**
   * Остановка сервера
   */
  public async stop(): Promise<void> {
    this.sseManager.closeAll();
    return new Promise(resolve => {
      if (this.server) {
        this.server.close(() => resolve());
      } else {
        resolve();
      }
    });
  }
}
