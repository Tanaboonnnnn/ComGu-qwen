import { randomBytes, timingSafeEqual } from 'node:crypto';
import http from 'node:http';
import { createMcpHandler } from '@modelcontextprotocol/server';
import { localhostHostValidation, localhostOriginValidation, toNodeHandler } from '@modelcontextprotocol/node';
import type { ToolContext } from '../mcp/kernel.js';
import { buildQwenServer } from './tools.js';

const MAX_BODY_BYTES = 8 * 1024 * 1024;

export interface QwenMcpEndpoint {
  port: number;
  url: string;
  stop: () => Promise<void>;
}

function safeEqual(a: string, b: string): boolean {
  const aa = Buffer.from(a, 'utf8');
  const bb = Buffer.from(b, 'utf8');
  return aa.length === bb.length && timingSafeEqual(aa, bb);
}

function jsonError(res: http.ServerResponse, status: number, error: string): void {
  const body = JSON.stringify({ error });
  res.writeHead(status, {
    'content-type': 'application/json',
    'content-length': Buffer.byteLength(body)
  });
  res.end(body);
}

function readBoundedJsonBody(
  req: http.IncomingMessage
): Promise<{ body?: unknown; error?: 'payload_too_large' | 'invalid_json' }> {
  return new Promise((resolve) => {
    const chunks: Buffer[] = [];
    let total = 0;
    let done = false;
    const finish = (value: { body?: unknown; error?: 'payload_too_large' | 'invalid_json' }): void => {
      if (done) return;
      done = true;
      req.off('data', onData);
      req.off('end', onEnd);
      req.off('error', onError);
      resolve(value);
    };
    const onData = (chunk: Buffer | string): void => {
      const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      total += bytes.length;
      if (total > MAX_BODY_BYTES) {
        finish({ error: 'payload_too_large' });
        req.resume();
        return;
      }
      chunks.push(bytes);
    };
    const onEnd = (): void => {
      try {
        const text = Buffer.concat(chunks, total).toString('utf8');
        finish({ body: text.length === 0 ? undefined : JSON.parse(text) });
      } catch {
        finish({ error: 'invalid_json' });
      }
    };
    const onError = (): void => finish({ error: 'invalid_json' });
    req.on('data', onData);
    req.on('end', onEnd);
    req.on('error', onError);
  });
}

export async function startQwenMcpServer(getContext: () => ToolContext): Promise<QwenMcpEndpoint> {
  const basePath = `/mcp/qwen/${randomBytes(32).toString('base64url')}`;
  let exposedCaps: ToolContext['caps'] | null = null;
  let exposedFind: boolean | null = null;

  const stableContext = (): ToolContext => {
    const live = getContext();
    if (exposedCaps === null) exposedCaps = { ...live.caps };
    else {
      for (const key of Object.keys(live.caps) as Array<keyof ToolContext['caps']>) {
        if (live.caps[key]) exposedCaps[key] = true;
      }
    }
    if (exposedFind === null) exposedFind = !live.caps.command && live.caps.search;
    return {
      ...live,
      exposedCaps: { ...exposedCaps },
      exposedFind,
      sessionTools: false,
      agentTools: false,
      exposedSessionTools: false,
      exposedAgentTools: false
    };
  };

  const handler = toNodeHandler(createMcpHandler(() => buildQwenServer(stableContext())));
  const checkHost = localhostHostValidation();
  const checkOrigin = localhostOriginValidation();
  const server = http.createServer((req, res) => {
    const pathOnly = (req.url ?? '').split('?')[0] ?? '';
    if (!safeEqual(pathOnly, basePath)) {
      jsonError(res, 404, 'not_found');
      return;
    }
    if (!checkHost(req, res)) return;
    if (!checkOrigin(req, res)) return;

    const declaredHeader = req.headers['content-length'];
    const declared = Number(declaredHeader ?? 0);
    if (Number.isFinite(declared) && declared > MAX_BODY_BYTES) {
      jsonError(res, 413, 'payload_too_large');
      return;
    }

    if (req.method === 'POST' && declaredHeader === undefined) {
      void readBoundedJsonBody(req).then((parsed) => {
        if (parsed.error === 'payload_too_large') {
          jsonError(res, 413, 'payload_too_large');
          return;
        }
        if (parsed.error === 'invalid_json') {
          jsonError(res, 400, 'invalid_json');
          return;
        }
        void handler(req, res, parsed.body);
      });
      return;
    }
    void handler(req, res);
  });

  server.headersTimeout = 30_000;
  server.requestTimeout = 300_000;
  server.maxRequestsPerSocket = 0;

  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      server.removeListener('error', reject);
      resolve();
    });
  });
  const address = server.address();
  if (address === null || typeof address === 'string') throw new Error('Could not determine Qwen MCP port.');

  return {
    port: address.port,
    url: `http://127.0.0.1:${address.port}${basePath}`,
    stop: () =>
      new Promise<void>((resolve) => {
        server.closeIdleConnections?.();
        server.close(() => resolve());
      })
  };
}
