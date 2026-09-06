export type QwenRuntimeState = 'starting' | 'idle' | 'working' | 'error';

export interface QwenRuntimeStatus {
  state: QwenRuntimeState;
  currentTool: string | null;
  lastTool: string | null;
  lastOutcome: 'ok' | 'error' | null;
  lastToolAt: string | null;
}

let ready = false;
let nextCallId = 1;
const active = new Map<number, string>();
let lastTool: string | null = null;
let lastOutcome: 'ok' | 'error' | null = null;
let lastToolAt: string | null = null;
const listeners = new Set<() => void>();

function changed(): void {
  for (const listener of listeners) listener();
}

export function onQwenRuntimeStatusChange(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function setQwenServiceReady(): void {
  ready = true;
  changed();
}

export function beginQwenTool(tool: string): number {
  const id = nextCallId++;
  active.set(id, tool);
  changed();
  return id;
}

export function finishQwenTool(id: number, result: { outcome: 'ok' | 'error'; at?: string }): void {
  const tool = active.get(id);
  if (!tool) return;
  active.delete(id);
  lastTool = tool;
  lastOutcome = result.outcome;
  lastToolAt = result.at ?? new Date().toISOString();
  changed();
}

export function qwenRuntimeStatus(): QwenRuntimeStatus {
  const currentTool = active.values().next().value ?? null;
  const state: QwenRuntimeState = !ready
    ? 'starting'
    : currentTool
      ? 'working'
      : lastOutcome === 'error'
        ? 'error'
        : 'idle';
  return { state, currentTool, lastTool, lastOutcome, lastToolAt };
}

export function resetQwenRuntimeStatusForTests(): void {
  ready = false;
  nextCallId = 1;
  active.clear();
  lastTool = null;
  lastOutcome = null;
  lastToolAt = null;
}
