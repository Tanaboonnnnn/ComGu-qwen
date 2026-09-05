import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: [
      'test/qwen-*.test.ts',
      'test/standalone-bootstrap.test.ts',
      'test/sandbox.test.ts',
      'test/chat-workspace-scope.test.ts',
      'test/config.test.ts',
      'test/terminal-workspace-security.test.ts',
      'test/command-sandbox-contract.test.ts',
      'test/codex-runtime-parity.test.ts',
      'test/codex-apply-patch-parity.test.ts',
      'test/codex-apply-patch-invocation-parity.test.ts',
      'test/codex-view-image-parity.test.ts',
      'test/read-backend.test.ts',
      'test/fsops.test.ts',
      'test/text-match.test.ts',
      'test/env.test.ts',
      'test/exec-hints.test.ts',
      'test/exec-output-budget.test.ts',
      'test/tools-desktop-permissions.test.ts',
      'test/tools-desktop-runtime.test.ts',
      'test/computer.test.ts',
      'test/computer-frame-bounds.test.ts',
      'test/computer-stale-ref.test.ts',
      'test/computer-local-actions.test.ts',
      'test/computer-helper-protocol.test.ts',
      'test/computer-partial-batch.test.ts',
      'test/computer-overhaul-contract.test.ts',
      'test/platform.test.ts'
    ],
    testTimeout: 30_000,
    hookTimeout: 30_000,
    maxWorkers: 2
  }
});
