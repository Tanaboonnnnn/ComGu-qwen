import { describe, expect, it } from 'vitest';
import type { Root } from '../src/shared/types.js';
import { qwenTerminalSandbox } from '../src/main/qwen/command-authority.js';

const roots: Root[] = [
  { name: 'project', path: 'C:\\work\\project' },
  { name: 'shared', path: 'C:\\work\\shared' }
];

describe('Qwen terminal sandbox authority', () => {
  it('binds terminal sessions to the exact selected root identities', () => {
    const sandbox = qwenTerminalSandbox(roots);
    expect(sandbox.roots).toEqual(['C:\\work\\project', 'C:\\work\\shared']);
    expect(sandbox.authority.conversationId).toBe('comgu-qwen');
    expect(sandbox.authority.runId).toBe('local-tools');
    expect(sandbox.authority.scopeFingerprint).toMatch(/^[a-f0-9]{64}$/);

    const renamed = qwenTerminalSandbox([{ name: 'project-renamed', path: 'C:\\work\\project' }, roots[1]!]);
    expect(renamed.authority.scopeFingerprint).not.toBe(sandbox.authority.scopeFingerprint);
  });
});
