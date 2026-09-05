import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = path.resolve(__dirname, '..');

describe('standalone Qwen renderer boundary', () => {
  it('exposes only named Qwen settings actions through preload', () => {
    const preload = readFileSync(path.join(root, 'src', 'preload', 'index.ts'), 'utf8');
    expect(preload).toContain("contextBridge.exposeInMainWorld('comguQwen'");
    for (const name of ['getState', 'addRoot', 'removeRoot', 'selectRoot', 'setPermissionGroup', 'copyEndpoint']) {
      expect(preload).toContain(name);
    }
    expect(preload).not.toMatch(/invoke\s*:\s*\(/);
  });

  it('renders Qwen endpoint, workspace and the four permission groups', () => {
    const html = readFileSync(path.join(root, 'src', 'renderer', 'index.html'), 'utf8');
    expect(html).toContain('ComGu Qwen');
    expect(html).toContain('MCP endpoint');
    expect(html).toContain('Look at files');
    expect(html).toContain('Change files');
    expect(html).toContain('See and use the desktop');
    expect(html).toContain('Run programs');
  });
});
