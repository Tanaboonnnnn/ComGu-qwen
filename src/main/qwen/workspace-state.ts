import { promises as fs } from 'node:fs';
import path from 'node:path';

let statePath = '';

export function initQwenWorkspaceState(userDataDir: string): void {
  // Keep the existing filename so v0.1.0 state migrates in place; the file now stores
  // enabled roots rather than a single chat-style workspace selection.
  statePath = path.join(userDataDir, 'qwen', 'workspace.json');
}

function normalizedNames(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const names: string[] = [];
  for (const item of value) {
    if (typeof item !== 'string') continue;
    const name = item.trim();
    if (!name || seen.has(name)) continue;
    seen.add(name);
    names.push(name);
  }
  return names;
}

export async function loadQwenEnabledRoots(): Promise<string[]> {
  if (!statePath) throw new Error('Qwen folder state path is not initialized.');
  try {
    const parsed = JSON.parse(await fs.readFile(statePath, 'utf8')) as {
      enabledRoots?: unknown;
      selectedRoot?: unknown;
    };
    const enabled = normalizedNames(parsed.enabledRoots);
    if (enabled.length > 0 || Array.isArray(parsed.enabledRoots)) return enabled;
    // v0.1.0 stored one selectedRoot. Preserve that explicit user grant as one checked folder.
    return typeof parsed.selectedRoot === 'string' && parsed.selectedRoot.trim()
      ? [parsed.selectedRoot.trim()]
      : [];
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return [];
    return [];
  }
}

export async function saveQwenEnabledRoots(enabledRoots: readonly string[]): Promise<void> {
  if (!statePath) throw new Error('Qwen folder state path is not initialized.');
  await fs.mkdir(path.dirname(statePath), { recursive: true });
  const tmp = `${statePath}.tmp`;
  await fs.writeFile(tmp, `${JSON.stringify({ enabledRoots: normalizedNames(enabledRoots) }, null, 2)}\n`, 'utf8');
  await fs.rename(tmp, statePath);
}
