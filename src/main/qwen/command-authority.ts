import { createHash } from 'node:crypto';
import type { Root } from '../../shared/types.js';

export interface QwenTerminalSandbox {
  readonly roots: readonly string[];
  readonly authority: Readonly<{
    conversationId: string;
    runId: string;
    scopeFingerprint: string;
  }>;
}

export function qwenTerminalSandbox(roots: readonly Root[]): QwenTerminalSandbox {
  const fingerprint = createHash('sha256');
  for (const root of roots) {
    fingerprint.update(root.name);
    fingerprint.update('\0');
    fingerprint.update(root.path);
    fingerprint.update('\0');
  }
  return Object.freeze({
    roots: Object.freeze(roots.map((root) => root.path)),
    authority: Object.freeze({
      conversationId: 'comgu-qwen',
      runId: 'local-tools',
      scopeFingerprint: fingerprint.digest('hex')
    })
  });
}
