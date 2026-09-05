import { describe, expect, it } from 'vitest';
import { McpServer } from '@modelcontextprotocol/server';
import type { Capabilities } from '../src/shared/types.js';
import { buildQwenServer } from '../src/main/qwen/tools.js';

const allCaps = {
  browse: true, search: true, read: true, metadata: true,
  create: true, edit: true, move: true, deleteFile: true, command: true,
  screen: true, control: true, clipboardRead: true, clipboardWrite: true
} satisfies Capabilities;

describe('Qwen merged MCP server', () => {
  it('registers core and desktop primitives but never session or agents', () => {
    const names: string[] = [];
    const original = (McpServer.prototype as any).registerTool;
    (McpServer.prototype as any).registerTool = function(name: string) {
      names.push(name);
      return undefined;
    };
    try {
      buildQwenServer({
        roots: [], caps: allCaps, exposedCaps: allCaps, readOnly: false,
        sessionTools: true, agentTools: true,
        exposedSessionTools: true, exposedAgentTools: true,
        exposedFind: false
      });
    } finally {
      (McpServer.prototype as any).registerTool = original;
    }

    expect(names).toEqual([
      'read', 'view_image', 'apply_patch', 'exec_command', 'write_stdin',
      'observe', 'computer', 'activity'
    ]);
    expect(names).not.toContain('session');
    expect(names).not.toContain('agents');
  });
});
