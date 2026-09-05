import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = path.resolve(__dirname, '..');

describe('standalone Qwen renderer boundary', () => {
  it('exposes only named Qwen settings actions through preload', () => {
    const preload = readFileSync(path.join(root, 'src', 'preload', 'index.ts'), 'utf8');
    expect(preload).toContain("contextBridge.exposeInMainWorld('comguQwen'");
    for (const name of ['getState', 'addRoot', 'removeRoot', 'setRootEnabled', 'setPermissionGroup', 'copyEndpoint']) {
      expect(preload).toContain(name);
    }
    expect(preload).not.toContain('selectRoot');
    expect(preload).not.toMatch(/invoke\s*:\s*\(/);
  });

  it('renders enabled-folder toggles instead of a chat workspace selector', () => {
    const html = readFileSync(path.join(root, 'src', 'renderer', 'index.html'), 'utf8');
    const renderer = readFileSync(path.join(root, 'src', 'renderer', 'main.ts'), 'utf8');
    expect(html).toContain('Folders Qwen can use');
    expect(html).toContain('Tick each folder Qwen is allowed to use');
    expect(html).not.toContain('<h2>Workspace</h2>');
    expect(renderer).toContain('state.enabledRoots.includes(root.name)');
    expect(renderer).toContain('setRootEnabled(root.name, enabled.checked)');
    expect(renderer).not.toContain('selectRoot');
  });

  it('still renders the four permission groups', () => {
    const html = readFileSync(path.join(root, 'src', 'renderer', 'index.html'), 'utf8');
    expect(html).toContain('Look at files');
    expect(html).toContain('Change files');
    expect(html).toContain('See and use the desktop');
    expect(html).toContain('Run programs');
  });
});
