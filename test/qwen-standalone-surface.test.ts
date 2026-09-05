import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { APP_VERSION } from '../src/main/version.js';
import { QWEN_TOOL_NAMES } from '../src/main/qwen/surface.js';

describe('standalone Qwen surface', () => {
  it('declares exactly the eight requested tools and no chat/agent/search surface', () => {
    expect(QWEN_TOOL_NAMES).toEqual([
      'read', 'view_image', 'apply_patch', 'exec_command', 'write_stdin', 'observe', 'computer', 'activity'
    ]);
    expect(QWEN_TOOL_NAMES).not.toContain('session');
    expect(QWEN_TOOL_NAMES).not.toContain('agents');
    expect(QWEN_TOOL_NAMES).not.toContain('find');
  });

  it('keeps the standalone MCP version aligned with package.json', () => {
    const pkg = JSON.parse(fs.readFileSync(path.resolve(__dirname, '..', 'package.json'), 'utf8')) as { version: string };
    expect(APP_VERSION).toBe(pkg.version);
  });
});
