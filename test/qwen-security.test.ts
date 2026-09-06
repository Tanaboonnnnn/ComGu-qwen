import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { defaultConfig, initConfigPath, saveConfig } from '../src/main/config.js';
import { resetChatWorkspaceScopesForTests } from '../src/main/chat-workspace-scope.js';
import { validateNewRoot } from '../src/main/sandbox.js';
import { startQwenLocalService, stopQwenLocalService } from '../src/main/qwen/lifecycle.js';
import { readRecentQwenActivity } from '../src/main/qwen/activity.js';

let dirs: string[] = [];

afterEach(async () => {
  await stopQwenLocalService().catch(() => undefined);
  resetChatWorkspaceScopesForTests();
  for (const dir of dirs) await fs.rm(dir, { recursive: true, force: true });
  dirs = [];
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

describe('Qwen enabled-folder integration', () => {
  it('uses enabled roots directly without a chat workspace and denies a disabled approved root', async () => {
    const allowedDir = await validateNewRoot(await fs.mkdtemp(path.join(os.tmpdir(), 'comgu-qwen-allowed-')), []);
    const blockedDir = await validateNewRoot(await fs.mkdtemp(path.join(os.tmpdir(), 'comgu-qwen-blocked-')), [{ name: 'allowed', path: allowedDir }]);
    dirs = [allowedDir, blockedDir];
    await fs.writeFile(path.join(allowedDir, 'ok.txt'), 'allowed root\n', 'utf8');
    await fs.writeFile(path.join(blockedDir, 'secret.txt'), 'blocked root\n', 'utf8');

    initConfigPath(allowedDir);
    const cfg = defaultConfig();
    const approvedRoots = [
      { name: 'allowed', path: allowedDir },
      { name: 'blocked', path: blockedDir }
    ];
    let enabledRoots = [approvedRoots[0]!];
    const caps = { ...cfg.capabilities, read: true, browse: true, metadata: true };
    await saveConfig({ ...cfg, roots: approvedRoots, capabilities: caps, readOnly: false });

    const endpoint = await startQwenLocalService(allowedDir, () => ({ roots: enabledRoots, caps, readOnly: false }), { port: 0 });
    const allowed = await call(endpoint.url, 'read', { paths: ['/allowed/ok.txt'] });
    expect(allowed.result.isError).not.toBe(true);
    expect(allowed.result.content[0].text).toContain('allowed root');
    expect(allowed.result.content[0].text).not.toContain('WORKSPACE_SCOPE_REQUIRED');

    const command = await call(endpoint.url, 'exec_command', { cmd: 'Write-Output qwen-command-ok', workdir: '/allowed' });
    expect(command.result.isError, JSON.stringify(command.result)).not.toBe(true);
    expect(JSON.stringify(command.result)).toContain('qwen-command-ok');
    expect(JSON.stringify(command.result)).not.toContain('WORKSPACE_SCOPE_REQUIRED');

    const blocked = await call(endpoint.url, 'read', { paths: ['/blocked/secret.txt'] });
    expect(blocked.result.isError).toBe(true);
    expect(JSON.stringify(blocked.result)).not.toContain('blocked root');

    enabledRoots = [];
    const revoked = await call(endpoint.url, 'read', { paths: ['/allowed/ok.txt'] });
    expect(revoked.result.isError).toBe(true);
    expect(JSON.stringify(revoked.result)).not.toContain('allowed root');

    const records = await readRecentQwenActivity(4);
    expect(records.filter((record) => record.tool === 'read')).toHaveLength(3);
    expect(records.some((record) => record.tool === 'exec_command')).toBe(true);
    expect(records.some((record) => record.outcome === 'ok')).toBe(true);
    expect(records.some((record) => record.outcome === 'error')).toBe(true);
  });
});
