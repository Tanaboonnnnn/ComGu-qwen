import { describe, expect, it } from 'vitest';
import { formatBangkokTime } from '../src/renderer/time.js';

describe('Qwen renderer Thai time', () => {
  it('always renders activity timestamps in Asia/Bangkok', () => {
    expect(formatBangkokTime('2026-09-06T00:00:00.000Z')).toBe('07:00:00');
    expect(formatBangkokTime('not-a-time')).toBe('—');
  });
});
