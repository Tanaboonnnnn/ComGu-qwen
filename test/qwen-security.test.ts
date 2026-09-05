import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { defaultConfig, initConfigPath, saveConfig } from '../src/main/config.js';
import { resetChatWorkspaceScopesForTests, setManualWorkspaceScope } from '../src/main/chat-workspace-scope.js';
import { validateNewRoot } from '../src/main/sandbox.js';
import { startQwenLocalService, stopQwenLocalService } from '../src/main/qwen/lifecycle.js';
import { readRecentQwenActivity } from '../src/main/qwen/activity.js';

let dir = '';

afterEach(async () => {
  await stopQwenLocalService().catch(() => undefined);
  resetChatWorkspaceScopesForTests();
  if (dir) await fs.rm(dir, { recursive: true, force: true });
  dir = '';
});

function decode(text: string): any {
  const trimmed = text.trim();
  if (trimmed.startsWith('{')) return JSON.parse(trimmed);
  const data = trimmed.split(/\r?\n/).filter((line) => line.startsWith('data:')).map((line) => line.slice(5).trimStart()).join('\n');
  return JSON.parse(data);
}

async function call(url: string, name: string, args: unknown): Promise<any> {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json, text/event-stream' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name, arguments: args } })
  });
  expect(response.status).toBe(200);
  return decode(await response.text());
}

describe('Qwen manual workspace integration', () => {
  it('fails closed without a manual workspace, then reads only after explicit selection and records activity', async () => {
    dir = await validateNewRoot(await fs.mkdtemp(path.join(os.tmpdir(), 'comgu-qwen-sec-')), []);
    await fs.writeFile(path.join(dir, 'note.txt'), 'hello from qwen\n', 'utf8');
    initConfigPath(dir);
    const cfg = defaultConfig();
    const roots = [{ name: 'probe', path: dir }];
    const caps = { ...cfg.capabilities, read: true, browse: true, metadata: true };
    await saveConfig({ ...cfg, roots, capabilities: caps, readOnly: false });

    const endpoint = await startQwenLocalService(dir, () => ({ roots, caps, readOnly: false }));
    const denied = await call(endpoint.url, 'read', { paths: ['/probe/note.txt'] });
    expect(denied.result.isError).toBe(true);
    expect(denied.result.content[0].text).toContain('WORKSPACE_SCOPE_REQUIRED');

    setManualWorkspaceScope(roots, { primaryRoot: 'probe', sharedRoots: [] });
    const allowed = await call(endpoint.url, 'read', { paths: ['/probe/note.txt'] });
    expect(allowed.result.isError).not.toBe(true);
    expect(allowed.result.content[0].text).toContain('hello from qwen');

    const records = await readRecentQwenActivity(2);
    expect(records.map((record) => record.tool)).toEqual(['read', 'read']);
    expect(records.some((record) => record.outcome === 'error')).toBe(true);
    expect(records.some((record) => record.outcome === 'ok')).toBe(true);
  });
});
