import fs from 'node:fs/promises';
import path from 'node:path';
import { randomBytes } from 'node:crypto';
import type { ToolContext } from '../mcp/kernel.js';
import { initQwenActivityStore } from './activity.js';
import { QWEN_CONNECTOR_NAME } from './surface.js';
import { QWEN_MCP_PORT, startQwenMcpServer, type QwenMcpEndpoint } from './server.js';
import { setQwenServiceReady } from './status.js';

let endpoint: QwenMcpEndpoint | null = null;

export function qwenLocalUrl(): string | null {
  return endpoint?.url ?? null;
}

export async function startQwenLocalService(
  userDataDir: string,
  getContext: () => ToolContext,
  options: { port?: number } = {}
): Promise<QwenMcpEndpoint> {
  if (endpoint) return endpoint;
  initQwenActivityStore(userDataDir);
  const dir = path.join(userDataDir, 'qwen');
  await fs.mkdir(dir, { recursive: true });
  const identityFile = path.join(dir, 'identity.json');
  let token: string | null = null;
  try {
    const parsed = JSON.parse(await fs.readFile(identityFile, 'utf8')) as { token?: unknown };
    if (typeof parsed.token === 'string' && /^[A-Za-z0-9_-]{40,}$/.test(parsed.token)) token = parsed.token;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT' && !(error instanceof SyntaxError)) throw error;
  }
  if (!token) {
    token = randomBytes(32).toString('base64url');
    await fs.writeFile(identityFile, `${JSON.stringify({ token }, null, 2)}\n`, { encoding: 'utf8', mode: 0o600 });
  }
  const started = await startQwenMcpServer(getContext, { port: options.port ?? QWEN_MCP_PORT, token });
  endpoint = started;
  await fs.writeFile(
    path.join(dir, 'endpoint.json'),
    `${JSON.stringify({
      name: QWEN_CONNECTOR_NAME,
      description: 'Local ComGu tools for Qwen Studio',
      type: 'StreamableHTTP',
      url: started.url
    }, null, 2)}\n`,
    'utf8'
  );
  setQwenServiceReady();
  return started;
}

export async function stopQwenLocalService(): Promise<void> {
  const current = endpoint;
  endpoint = null;
  if (current) await current.stop();
}
