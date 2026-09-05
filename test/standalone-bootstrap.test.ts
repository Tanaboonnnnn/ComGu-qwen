import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = path.resolve(__dirname, '..');

describe('standalone ComGu Qwen bootstrap', () => {
  it('uses an independent product identity and a Qwen-only main entry', () => {
    const pkg = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8')) as { name: string; productName?: string };
    const builder = readFileSync(path.join(root, 'electron-builder.yml'), 'utf8');
    const main = readFileSync(path.join(root, 'src', 'main', 'index.ts'), 'utf8');

    expect(pkg.name).toBe('comgu-qwen');
    expect(builder).toContain('productName: ComGu Qwen');
    expect(builder).toContain('appId: com.comgu.qwen');
    expect(main).toContain("from './qwen/lifecycle.js'");
    expect(main).toContain('COMGU_QWEN_USER_DATA');
    expect(main).not.toMatch(/from ['\"]\.\/bridge\.js['\"]/);
    expect(main).not.toMatch(/from ['\"]\.\/agents\.js['\"]/);
    expect(main).not.toMatch(/from ['\"]\.\/session\//);
  });
});
