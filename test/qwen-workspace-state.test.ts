import { promises as fs } from 'node:fs';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { initQwenWorkspaceState, loadQwenEnabledRoots, saveQwenEnabledRoots } from '../src/main/qwen/workspace-state.js';

let dir = '';
afterEach(async () => { if (dir) await fs.rm(dir, { recursive: true, force: true }); });

describe('Qwen enabled-folder persistence', () => {
  it('defaults to no enabled folders and persists multiple approved root names', async () => {
    dir = await fs.mkdtemp(path.join(process.cwd(), '.qwen-state-'));
    initQwenWorkspaceState(dir);
    expect(await loadQwenEnabledRoots()).toEqual([]);
    await saveQwenEnabledRoots(['project', 'shared', 'project', '']);
    expect(await loadQwenEnabledRoots()).toEqual(['project', 'shared']);
    await saveQwenEnabledRoots([]);
    expect(await loadQwenEnabledRoots()).toEqual([]);
  });
});
