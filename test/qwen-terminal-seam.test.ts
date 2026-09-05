import { describe, expect, it } from 'vitest';
import type { Root } from '../src/shared/types.js';
import type { ToolContext } from '../src/main/mcp/kernel.js';
import { terminalSandboxForContext } from '../src/main/mcp/tools-core.js';

const roots: Root[] = [{ name: 'project', path: 'C:\\work\\project' }];

describe('terminal sandbox context seam', () => {
  it('uses a caller supplied sandbox authority outside a multi-agent Run', () => {
    const expected = {
      roots: ['C:\\work\\project'],
      authority: { conversationId: 'comgu-qwen', runId: 'local-tools', scopeFingerprint: 'f'.repeat(64) }
    } as const;
    const ctx = {
      roots,
      caps: {} as ToolContext['caps'],
      readOnly: false,
      terminalSandbox: () => expected
    } satisfies ToolContext;

    expect(terminalSandboxForContext(ctx, roots)).toBe(expected);
  });
});
