import fs from 'node:fs/promises';
import path from 'node:path';

export const QWEN_ACTIVITY_SUMMARY_CHARS = 512;

export interface QwenActivityRecord {
  time: string;
  tool: string;
  inputSummary: string;
  resultSummary: string;
  outcome: 'ok' | 'error';
  durationMs: number;
}

export type QwenActivityInput = Omit<QwenActivityRecord, 'time'> & { time?: string };

let activityFile: string | null = null;
let writeQueue: Promise<void> = Promise.resolve();

function bounded(value: string): string {
  return value.slice(0, QWEN_ACTIVITY_SUMMARY_CHARS);
}

export function initQwenActivityStore(userDataDir: string): void {
  activityFile = path.join(userDataDir, 'qwen', 'activity.jsonl');
  writeQueue = Promise.resolve();
}

function requireFile(): string {
  if (!activityFile) throw new Error('Qwen activity store has not been initialized.');
  return activityFile;
}

export async function appendQwenActivity(input: QwenActivityInput): Promise<void> {
  const file = requireFile();
  const record: QwenActivityRecord = {
    time: input.time ?? new Date().toISOString(),
    tool: bounded(input.tool),
    inputSummary: bounded(input.inputSummary),
    resultSummary: bounded(input.resultSummary),
    outcome: input.outcome,
    durationMs: Math.max(0, Math.floor(input.durationMs))
  };
  const line = `${JSON.stringify(record)}\n`;
  const write = writeQueue.then(async () => {
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.appendFile(file, line, 'utf8');
  });
  writeQueue = write.catch(() => undefined);
  await write;
}

export async function readRecentQwenActivity(limit = 20): Promise<QwenActivityRecord[]> {
  const file = requireFile();
  const safeLimit = Math.max(1, Math.min(100, Math.floor(limit)));
  let raw: string;
  try {
    raw = await fs.readFile(file, 'utf8');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return [];
    throw error;
  }
  const records: QwenActivityRecord[] = [];
  const lines = raw.split('\n').filter(Boolean);
  for (let index = lines.length - 1; index >= 0 && records.length < safeLimit; index -= 1) {
    try {
      const parsed = JSON.parse(lines[index] ?? '') as QwenActivityRecord;
      if (
        parsed &&
        typeof parsed.time === 'string' &&
        typeof parsed.tool === 'string' &&
        typeof parsed.inputSummary === 'string' &&
        typeof parsed.resultSummary === 'string' &&
        (parsed.outcome === 'ok' || parsed.outcome === 'error') &&
        typeof parsed.durationMs === 'number'
      ) {
        records.push(parsed);
      }
    } catch {
      // Ignore a torn or invalid line; earlier complete records remain useful.
    }
  }
  return records;
}
