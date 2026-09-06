import type { ComGuQwenApi, QwenUiState } from '../preload/index.js';
import { formatBangkokTime } from './time.js';

declare global { interface Window { comguQwen: ComGuQwenApi } }

const endpoint = document.querySelector<HTMLElement>('#endpoint')!;
const roots = document.querySelector<HTMLElement>('#roots')!;
const noRoots = document.querySelector<HTMLElement>('#noRoots')!;
const activity = document.querySelector<HTMLElement>('#activity')!;
const live = document.querySelector<HTMLElement>('#live')!;
const liveState = document.querySelector<HTMLElement>('#liveState')!;
const liveNote = document.querySelector<HTMLElement>('#liveNote')!;
let rootsRenderKey = '';
let activityRenderKey = '';

function activityRow(record: QwenUiState['activity'][number]): HTMLElement {
  const row = document.createElement('p');
  row.className = record.outcome === 'error' ? 'bad' : '';
  const time = document.createElement('time');
  time.textContent = formatBangkokTime(record.time);
  const tool = document.createElement('span');
  tool.className = 'what';
  tool.textContent = record.tool;
  const rest = document.createElement('span');
  rest.className = 'rest';
  rest.textContent = `${record.inputSummary} · ${record.resultSummary}`;
  const metric = document.createElement('span');
  metric.className = 'metric';
  metric.textContent = `${record.durationMs} ms`;
  row.append(time, tool, rest, metric);
  return row;
}

function paintRuntime(state: QwenUiState): void {
  const runtime = state.runtime;
  live.className = `live is-${runtime.state}`;
  liveState.textContent = runtime.state === 'working' ? 'Working' : runtime.state === 'error' ? 'Tool error' : runtime.state === 'idle' ? 'Ready' : 'Starting';
  liveNote.textContent = runtime.currentTool
    ? runtime.currentTool
    : runtime.lastToolAt && runtime.lastTool
      ? `${runtime.lastTool} · ${formatBangkokTime(runtime.lastToolAt)}`
      : 'Local only';
}

function render(state: QwenUiState): void {
  endpoint.textContent = state.endpoint ?? 'Starting…';
  paintRuntime(state);
  const nextRootsRenderKey = JSON.stringify([state.roots, state.enabledRoots]);
  if (nextRootsRenderKey !== rootsRenderKey) {
    rootsRenderKey = nextRootsRenderKey;
    roots.replaceChildren();
    noRoots.hidden = state.roots.length > 0;
    for (const root of state.roots) {
      const row = document.createElement('div');
      row.className = 'root';
      const access = document.createElement('label');
      access.className = 'root-access';
      const enabled = document.createElement('input');
      enabled.type = 'checkbox';
      enabled.checked = state.enabledRoots.includes(root.name);
      enabled.setAttribute('aria-label', `Allow Qwen to use ${root.name}`);
      enabled.addEventListener('change', () => void window.comguQwen.setRootEnabled(root.name, enabled.checked).then(render));
      const text = document.createElement('span');
      text.className = 'root-text';
      text.textContent = `/${root.name}  —  ${root.path}`;
      access.append(enabled, text);
      const remove = document.createElement('button');
      remove.textContent = 'Remove';
      remove.addEventListener('click', () => void window.comguQwen.removeRoot(root.name).then(render));
      row.append(access, remove);
      roots.append(row);
    }
  }
  for (const input of document.querySelectorAll<HTMLInputElement>('input[data-group]')) {
    const group = input.dataset.group as keyof QwenUiState['permissions'];
    input.checked = state.permissions[group];
  }
  const nextActivityRenderKey = state.activity
    .map((record) => `${record.time}\u001f${record.tool}\u001f${record.outcome}\u001f${record.durationMs}\u001f${record.inputSummary}\u001f${record.resultSummary}`)
    .join('\u001e');
  if (nextActivityRenderKey !== activityRenderKey) {
    activityRenderKey = nextActivityRenderKey;
    activity.replaceChildren(...(state.activity.length ? state.activity.map(activityRow) : [Object.assign(document.createElement('p'), { className: 'empty', textContent: 'No activity yet.' })]));
  }
}

for (const input of document.querySelectorAll<HTMLInputElement>('input[data-group]')) {
  input.addEventListener('change', () => {
    const group = input.dataset.group as 'look' | 'change' | 'desktop' | 'run';
    void window.comguQwen.setPermissionGroup(group, input.checked).then(render);
  });
}
document.querySelector('#addRoot')?.addEventListener('click', () => void window.comguQwen.addRoot().then(render));
document.querySelector('#copyEndpoint')?.addEventListener('click', () => void window.comguQwen.copyEndpoint());

window.comguQwen.onStateChanged(render);
void window.comguQwen.getState().then(render);
