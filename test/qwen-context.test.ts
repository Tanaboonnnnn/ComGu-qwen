import { describe, expect, it } from 'vitest';
import type { Capabilities, Root } from '../src/shared/types.js';
import { qwenToolContext } from '../src/main/qwen/tools.js';

const caps = {
  browse: true, search: true, read: true, metadata: true,
  create: true, edit: true, move: true, deleteFile: true, command: true,
  screen: false, control: false, clipboardRead: false, clipboardWrite: false
} satisfies Capabilities;
const roots: Root[] = [{ name: 'project', path: 'C:\\work\\project' }];

describe('Qwen tool context', () => {
  it('forces chat features off and supplies a terminal sandbox authority', () => {
    const ctx = qwenToolContext({ roots, caps, readOnly: false, sessionTools: true, agentTools: true });
    expect(ctx.sessionTools).toBe(false);
    expect(ctx.agentTools).toBe(false);
    expect(ctx.exposedSessionTools).toBe(false);
    expect(ctx.exposedAgentTools).toBe(false);
    expect(ctx.terminalSandbox?.(roots).authority.conversationId).toBe('comgu-qwen');
  });
});
