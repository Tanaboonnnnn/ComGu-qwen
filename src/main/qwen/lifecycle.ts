import fs from 'node:fs/promises';
import path from 'node:path';
import type { ToolContext } from '../mcp/kernel.js';
import { initQwenActivityStore } from './activity.js';
import { QWEN_CONNECTOR_NAME } from './surface.js';
import { startQwenMcpServer, type QwenMcpEndpoint } from './server.js';

let endpoint: QwenMcpEndpoint | null = null;

export function qwenLocalUrl(): string | null {
  return endpoint?.url ?? null;
}

export async function startQwenLocalService(
  userDataDir: string,
  getContext: () => ToolContext
): Promise<QwenMcpEndpoint> {
  if (endpoint) return endpoint;
  initQwenActivityStore(userDataDir);
  const started = await startQwenMcpServer(getContext);
  endpoint = started;
  const dir = path.join(userDataDir, 'qwen');
  await fs.mkdir(dir, { recursive: true });
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
  return started;
}

export async function stopQwenLocalService(): Promise<void> {
  const current = endpoint;
  endpoint = null;
  if (current) await current.stop();
}
