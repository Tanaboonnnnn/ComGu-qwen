import { afterEach, describe, expect, it } from 'vitest';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import type { Capabilities } from '../src/shared/types.js';
import {
  qwenLocalUrl,
  startQwenLocalService,
  stopQwenLocalService
} from '../src/main/qwen/lifecycle.js';

const caps = {
  browse: true, search: true, read: true, metadata: true,
  create: true, edit: true, move: true, deleteFile: true, command: true,
  screen: false, control: false, clipboardRead: false, clipboardWrite: false
} satisfies Capabilities;
const dirs: string[] = [];

afterEach(async () => {
  await stopQwenLocalService();
  await Promise.all(dirs.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true })));
});

describe('Qwen local service lifecycle', () => {
  it('starts one local endpoint and writes Qwen Studio connection metadata', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'comgu-qwen-life-'));
    dirs.push(dir);
    const endpoint = await startQwenLocalService(dir, () => ({
      roots: [], caps: { ...caps }, readOnly: false
    }), { port: 0 });

    expect(qwenLocalUrl()).toBe(endpoint.url);
    const metadata = JSON.parse(await fs.readFile(path.join(dir, 'qwen', 'endpoint.json'), 'utf8'));
    expect(metadata).toEqual({
      name: 'ComGu Qwen',
      description: 'Local ComGu tools for Qwen Studio',
      type: 'StreamableHTTP',
      url: endpoint.url
    });
  });

  it('is idempotent while already running and clears the URL after stop', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'comgu-qwen-life-'));
    dirs.push(dir);
    const first = await startQwenLocalService(dir, () => ({ roots: [], caps: { ...caps }, readOnly: false }), { port: 0 });
    const second = await startQwenLocalService(dir, () => ({ roots: [], caps: { ...caps }, readOnly: false }), { port: 0 });
    expect(second).toBe(first);
    await stopQwenLocalService();
    expect(qwenLocalUrl()).toBeNull();
  });

  it('reuses one persistent local token across restarts', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'comgu-qwen-life-'));
    dirs.push(dir);
    const first = await startQwenLocalService(dir, () => ({ roots: [], caps: { ...caps }, readOnly: false }), { port: 0 });
    const firstToken = new URL(first.url).pathname.split('/').at(-1);
    await stopQwenLocalService();
    const second = await startQwenLocalService(dir, () => ({ roots: [], caps: { ...caps }, readOnly: false }), { port: 0 });
    const secondToken = new URL(second.url).pathname.split('/').at(-1);
    expect(firstToken).toMatch(/^[A-Za-z0-9_-]{40,}$/);
    expect(secondToken).toBe(firstToken);
    const identity = JSON.parse(await fs.readFile(path.join(dir, 'qwen', 'identity.json'), 'utf8'));
    expect(identity.token).toBe(firstToken);
  });
});
