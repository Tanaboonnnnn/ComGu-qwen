import type { McpServer } from '@modelcontextprotocol/server';
import type { SurfaceRegistrar, ToolContext, ToolResult } from '../mcp/kernel.js';
import { fail } from '../mcp/kernel.js';
import { appendQwenActivity } from './activity.js';

const SENSITIVE_KEYS = new Set([
  'patch',
  'content',
  'data',
  'image',
  'text',
  'chars',
  'value',
  'secret',
  'token',
  'password'
]);

function summarizeValue(value: unknown, key = ''): unknown {
  if (typeof value === 'string') {
    if (SENSITIVE_KEYS.has(key.toLowerCase())) return `<${value.length} chars>`;
    return value.length > 240 ? `${value.slice(0, 240)}…` : value;
  }
  if (Array.isArray(value)) return value.slice(0, 20).map((item) => summarizeValue(item));
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [childKey, childValue] of Object.entries(value as Record<string, unknown>).slice(0, 30)) {
      out[childKey] = summarizeValue(childValue, childKey);
    }
    return out;
  }
  return value;
}

export function summarizeQwenInput(args: unknown): string {
  try {
    return JSON.stringify(summarizeValue(args));
  } catch {
    return '[unserializable input]';
  }
}

function summarizeResult(result: ToolResult): string {
  if (result.isError) return `Tool returned an error (${result.content.length} content item${result.content.length === 1 ? '' : 's'}).`;
  const kindCounts = new Map<string, number>();
  for (const item of result.content) {
    const type = typeof item === 'object' && item && 'type' in item ? String(item.type) : 'unknown';
    kindCounts.set(type, (kindCounts.get(type) ?? 0) + 1);
  }
  const kinds = [...kindCounts.entries()].map(([kind, count]) => `${count} ${kind}`).join(', ');
  return `Completed${kinds ? ` with ${kinds}` : ''}.`;
}

async function record(tool: string, args: unknown, result: ToolResult | null, startedAt: number, threw: boolean): Promise<void> {
  try {
    await appendQwenActivity({
      tool,
      inputSummary: summarizeQwenInput(args),
      resultSummary: threw ? 'Tool handler threw before returning a result.' : summarizeResult(result ?? fail('unknown error')),
      outcome: threw || result?.isError ? 'error' : 'ok',
      durationMs: Date.now() - startedAt
    });
  } catch {
    // Activity history is diagnostic; a storage failure must never change tool execution.
  }
}

export function createQwenRegistrar(server: McpServer, ctx: ToolContext): SurfaceRegistrar {
  const caps = ctx.caps;
  const exposedCaps = ctx.exposedCaps ?? caps;
  const names: string[] = [];
  return {
    ctx,
    caps,
    exposedCaps,
    sessionToolsLive: false,
    sessionToolsExposed: false,
    agentToolsLive: false,
    agentToolsExposed: false,
    findExposed: ctx.exposedFind ?? (!exposedCaps.command && exposedCaps.search),
    registered: () => [...names],
    register(name, config, handler) {
      names.push(name);
      server.registerTool(name, config, (async (args: never) => {
        const startedAt = Date.now();
        try {
          const result = await handler(args);
          await record(name, args, result, startedAt, false);
          return result;
        } catch (error) {
          await record(name, args, null, startedAt, true);
          throw error;
        }
      }) as never);
    },
    guarded(cap, name, fn) {
      if (!caps[cap]) {
        return Promise.resolve(
          fail(
            `TOOL_DISABLED: ${name} is disabled by the current ComGu permissions. ` +
              'Enable the matching permission in ComGu Qwen, then retry.'
          )
        );
      }
      return fn();
    },
    featureDisabled(feature, setting) {
      return fail(`FEATURE_DISABLED: ${feature} is disabled in ComGu Qwen (${setting}).`);
    }
  };
}
