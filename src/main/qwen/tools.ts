import { McpServer } from '@modelcontextprotocol/server';
import { z } from 'zod';
import { APP_VERSION } from '../version.js';
import type { ToolContext } from '../mcp/kernel.js';
import { ok } from '../mcp/kernel.js';
import { registerCoreTools } from '../mcp/tools-core.js';
import { registerDesktopTools } from '../mcp/tools-desktop.js';
import { readRecentQwenActivity } from './activity.js';
import { createQwenRegistrar } from './registrar.js';
import { QWEN_SERVER_NAME } from './surface.js';
import { qwenTerminalSandbox } from './command-authority.js';

const QWEN_INSTRUCTIONS = [
  'Local ComGu tools for Qwen Studio.',
  'Use only approved workspace roots and the permissions enabled in the desktop app.',
  'This endpoint has no chat session, Prime, Worker, Sub-agent or swarm features.',
  'Use activity to inspect recent local tool activity when needed.'
].join(' ');

export function qwenToolContext(ctx: ToolContext): ToolContext {
  return {
    ...ctx,
    caps: { ...ctx.caps, search: false },
    exposedCaps: { ...(ctx.exposedCaps ?? ctx.caps), search: false },
    exposedFind: false,
    sessionTools: false,
    agentTools: false,
    exposedSessionTools: false,
    exposedAgentTools: false,
    terminalSandbox: qwenTerminalSandbox
  };
}

export function buildQwenServer(ctx: ToolContext): McpServer {
  const qwenCtx = qwenToolContext(ctx);
  const server = new McpServer(
    { name: QWEN_SERVER_NAME, version: APP_VERSION },
    { capabilities: { tools: {} }, instructions: QWEN_INSTRUCTIONS }
  );
  const registrar = createQwenRegistrar(server, qwenCtx);
  registerCoreTools(registrar);
  registerDesktopTools(registrar);
  registrar.register(
    'activity',
    {
      title: 'Recent ComGu Qwen activity',
      description: 'Read recent local tool activity summaries. This history contains tool activity only, not chat messages.',
      inputSchema: z.object({
        limit: z.number().int().min(1).max(100).optional().describe('Newest records to return. Default 20, maximum 100.')
      }).strict(),
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false }
    },
    async ({ limit }) => {
      const records = await readRecentQwenActivity(limit ?? 20);
      return ok(JSON.stringify(records, null, 2));
    }
  );
  return server;
}
