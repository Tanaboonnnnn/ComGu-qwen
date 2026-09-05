import { describe, expect, it } from 'vitest';
import { QWEN_CONNECTOR_NAME, QWEN_SERVER_NAME, QWEN_TOOL_NAMES } from '../src/main/qwen/surface.js';

describe('Qwen MCP surface', () => {
  it('publishes the local work primitives without chat sessions or agents', () => {
    expect(QWEN_SERVER_NAME).toBe('comgu-qwen');
    expect(QWEN_CONNECTOR_NAME).toBe('ComGu Qwen');
    expect(QWEN_TOOL_NAMES).toEqual([
      'read',
      'view_image',
      'apply_patch',
      'exec_command',
      'write_stdin',
      'observe',
      'computer',
      'activity'
    ]);
    expect(QWEN_TOOL_NAMES).not.toContain('session');
    expect(QWEN_TOOL_NAMES).not.toContain('agents');
  });
});
