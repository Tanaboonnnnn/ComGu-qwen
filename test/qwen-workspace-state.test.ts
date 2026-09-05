import { promises as fs } from 'node:fs';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { initQwenWorkspaceState, loadQwenWorkspaceSelection, saveQwenWorkspaceSelection } from '../src/main/qwen/workspace-state.js';

let dir = '';
afterEach(async () => { if (dir) await fs.rm(dir, { recursive: true, force: true }); });

describe('Qwen workspace selection persistence', () => {
  it('defaults to no selection and persists only an approved root name', async () => {
    dir = await fs.mkdtemp(path.join(process.cwd(), '.qwen-state-'));
    initQwenWorkspaceState(dir);
    expect(await loadQwenWorkspaceSelection()).toBeNull();
    await saveQwenWorkspaceSelection('project');
    expect(await loadQwenWorkspaceSelection()).toBe('project');
    await saveQwenWorkspaceSelection(null);
    expect(await loadQwenWorkspaceSelection()).toBeNull();
  });
});
