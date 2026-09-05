import { promises as fs } from 'node:fs';
import path from 'node:path';

let statePath = '';

export function initQwenWorkspaceState(userDataDir: string): void {
  statePath = path.join(userDataDir, 'qwen', 'workspace.json');
}

export async function loadQwenWorkspaceSelection(): Promise<string | null> {
  if (!statePath) throw new Error('Qwen workspace state path is not initialized.');
  try {
    const parsed = JSON.parse(await fs.readFile(statePath, 'utf8')) as { selectedRoot?: unknown };
    return typeof parsed.selectedRoot === 'string' && parsed.selectedRoot.trim() ? parsed.selectedRoot : null;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
    return null;
  }
}

export async function saveQwenWorkspaceSelection(selectedRoot: string | null): Promise<void> {
  if (!statePath) throw new Error('Qwen workspace state path is not initialized.');
  await fs.mkdir(path.dirname(statePath), { recursive: true });
  const tmp = `${statePath}.tmp`;
  await fs.writeFile(tmp, `${JSON.stringify({ selectedRoot }, null, 2)}\n`, 'utf8');
  await fs.rename(tmp, statePath);
}
