import { afterEach, describe, expect, it } from 'vitest';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {
  appendQwenActivity,
  initQwenActivityStore,
  readRecentQwenActivity,
  QWEN_ACTIVITY_SUMMARY_CHARS
} from '../src/main/qwen/activity.js';

const dirs: string[] = [];

async function tempStore(): Promise<string> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'comgu-qwen-activity-'));
  dirs.push(dir);
  initQwenActivityStore(dir);
  return dir;
}

afterEach(async () => {
  await Promise.all(dirs.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true })));
});

describe('Qwen activity history', () => {
  it('stores bounded tool summaries without chat transcript fields', async () => {
    const dir = await tempStore();
    await appendQwenActivity({
      tool: 'read',
      inputSummary: 'x'.repeat(QWEN_ACTIVITY_SUMMARY_CHARS + 50),
      resultSummary: 'y'.repeat(QWEN_ACTIVITY_SUMMARY_CHARS + 50),
      outcome: 'ok',
      durationMs: 12
    });

    const [record] = await readRecentQwenActivity(10);
    expect(record?.tool).toBe('read');
    expect(record?.inputSummary.length).toBe(QWEN_ACTIVITY_SUMMARY_CHARS);
    expect(record?.resultSummary.length).toBe(QWEN_ACTIVITY_SUMMARY_CHARS);
    expect(record?.outcome).toBe('ok');
    expect(record).not.toHaveProperty('conversationId');
    expect(record).not.toHaveProperty('messages');

    const raw = await fs.readFile(path.join(dir, 'qwen', 'activity.jsonl'), 'utf8');
    expect(raw.trim().split('\n')).toHaveLength(1);
  });

  it('returns the newest records first and preserves failures', async () => {
    await tempStore();
    await appendQwenActivity({ tool: 'read', inputSummary: '/a', resultSummary: 'ok', outcome: 'ok', durationMs: 1 });
    await appendQwenActivity({ tool: 'exec_command', inputSummary: 'bad cmd', resultSummary: 'denied', outcome: 'error', durationMs: 2 });

    const records = await readRecentQwenActivity(1);
    expect(records).toHaveLength(1);
    expect(records[0]?.tool).toBe('exec_command');
    expect(records[0]?.outcome).toBe('error');
  });

  it('serves recent activity from memory after the first load', async () => {
    const dir = await tempStore();
    const file = path.join(dir, 'qwen', 'activity.jsonl');
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(file, JSON.stringify({
      time: '2026-09-06T00:00:00.000Z',
      tool: 'read',
      inputSummary: '/warm',
      resultSummary: 'ok',
      outcome: 'ok',
      durationMs: 3
    }) + '\n', 'utf8');

    expect((await readRecentQwenActivity(10))[0]?.inputSummary).toBe('/warm');
    await fs.rm(file);
    expect((await readRecentQwenActivity(10))[0]?.inputSummary).toBe('/warm');
  });
});
