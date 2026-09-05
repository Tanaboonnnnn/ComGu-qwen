import fs from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

describe('Qwen Electron bootstrap wiring', () => {
  it('starts after config load and participates in admission drain', async () => {
    const source = await fs.readFile(new URL('../src/main/index.ts', import.meta.url), 'utf8');
    expect(source).toContain("from './qwen/lifecycle.js'");
    const load = source.indexOf('await loadConfig();');
    const start = source.indexOf('await startQwenLocalService(userData');
    expect(start).toBeGreaterThan(load);
    expect(source).toContain('stopQwenLocalService()');
  });
});
