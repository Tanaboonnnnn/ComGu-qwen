import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = path.resolve(__dirname, '..');

describe('Qwen packaging optimization', () => {
  it('ships only the Electron locales the standalone app supports', () => {
    const config = readFileSync(path.join(root, 'electron-builder.yml'), 'utf8');
    expect(config).toMatch(/electronLanguages:\s*\n\s*- en-US\s*\n\s*- th/);
  });
});
