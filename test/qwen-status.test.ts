import { beforeEach, describe, expect, it } from 'vitest';
import {
  beginQwenTool,
  finishQwenTool,
  qwenRuntimeStatus,
  resetQwenRuntimeStatusForTests,
  setQwenServiceReady
} from '../src/main/qwen/status.js';

describe('Qwen runtime status', () => {
  beforeEach(() => resetQwenRuntimeStatusForTests());

  it('shows ready, working, then the completed tool without losing the service state', () => {
    setQwenServiceReady();
    expect(qwenRuntimeStatus().state).toBe('idle');
    const call = beginQwenTool('read');
    expect(qwenRuntimeStatus()).toMatchObject({ state: 'working', currentTool: 'read' });
    finishQwenTool(call, { outcome: 'ok', at: '2026-09-06T05:00:00.000Z' });
    expect(qwenRuntimeStatus()).toMatchObject({
      state: 'idle',
      currentTool: null,
      lastTool: 'read',
      lastOutcome: 'ok',
      lastToolAt: '2026-09-06T05:00:00.000Z'
    });
  });

  it('surfaces the last tool failure until another tool completes successfully', () => {
    setQwenServiceReady();
    const failed = beginQwenTool('exec_command');
    finishQwenTool(failed, { outcome: 'error', at: '2026-09-06T05:01:00.000Z' });
    expect(qwenRuntimeStatus()).toMatchObject({ state: 'error', lastTool: 'exec_command', lastOutcome: 'error' });
    const recovered = beginQwenTool('read');
    finishQwenTool(recovered, { outcome: 'ok', at: '2026-09-06T05:02:00.000Z' });
    expect(qwenRuntimeStatus()).toMatchObject({ state: 'idle', lastTool: 'read', lastOutcome: 'ok' });
  });
});
