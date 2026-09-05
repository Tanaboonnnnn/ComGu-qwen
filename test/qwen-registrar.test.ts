import { afterEach, describe, expect, it } from 'vitest';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import type { McpServer } from '@modelcontextprotocol/server';
import type { Capabilities } from '../src/shared/types.js';
import { initQwenActivityStore, readRecentQwenActivity } from '../src/main/qwen/activity.js';
import { createQwenRegistrar } from '../src/main/qwen/registrar.js';

const dirs: string[] = [];
const allCaps = {
  browse: true, search: true, read: true, metadata: true,
  create: true, edit: true, move: true, deleteFile: true, command: true,
  screen: true, control: true, clipboardRead: true, clipboardWrite: true
} satisfies Capabilities;

async function setup() {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'comgu-qwen-registrar-'));
  dirs.push(dir);
  initQwenActivityStore(dir);
  const handlers = new Map<string, (args: unknown) => Promise<any>>();
  const server = {
    registerTool(name: string, _config: unknown, handler: (args: unknown) => Promise<any>) {
      handlers.set(name, handler);
    }
  } as unknown as McpServer;
  const reg = createQwenRegistrar(server, {
    roots: [], caps: allCaps, exposedCaps: allCaps, readOnly: false,
    sessionTools: false, agentTools: false,
    exposedSessionTools: false, exposedAgentTools: false,
    exposedFind: true
  });
  return { reg, handlers };
}

afterEach(async () => {
  await Promise.all(dirs.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true })));
});

describe('Qwen registrar', () => {
  it('runs a registered tool and records only a safe activity summary', async () => {
    const { reg, handlers } = await setup();
    reg.register('apply_patch', {
      description: 'test',
      inputSchema: { parse: (value: unknown) => value } as any
    }, async () => ({ content: [{ type: 'text', text: 'secret file body that must not be persisted' }] }));

    const result = await handlers.get('apply_patch')?.({ patch: 'TOP SECRET PATCH CONTENT', path: '/project/a.ts' });
    expect(result?.isError).not.toBe(true);

    const [activity] = await readRecentQwenActivity(1);
    expect(activity?.tool).toBe('apply_patch');
    expect(activity?.inputSummary).toContain('/project/a.ts');
    expect(activity?.inputSummary).not.toContain('TOP SECRET PATCH CONTENT');
    expect(activity?.resultSummary).not.toContain('secret file body');
  });

  it('keeps session and agent exposure disabled and enforces capabilities', async () => {
    const { reg } = await setup();
    expect(reg.sessionToolsLive).toBe(false);
    expect(reg.sessionToolsExposed).toBe(false);
    expect(reg.agentToolsLive).toBe(false);
    expect(reg.agentToolsExposed).toBe(false);

    reg.caps.command = false;
    const denied = await reg.guarded('command', 'exec_command', async () => ({ content: [{ type: 'text', text: 'ran' }] }));
    expect(denied.isError).toBe(true);
    expect((denied.content[0] as any).text).toContain('TOOL_DISABLED');
  });
});

