import type { ComGuQwenApi, QwenUiState } from '../preload/index.js';

declare global { interface Window { comguQwen: ComGuQwenApi } }

const endpoint = document.querySelector<HTMLElement>('#endpoint')!;
const roots = document.querySelector<HTMLElement>('#roots')!;
const noRoots = document.querySelector<HTMLElement>('#noRoots')!;
const activity = document.querySelector<HTMLElement>('#activity')!;

function render(state: QwenUiState): void {
  endpoint.textContent = state.endpoint ?? 'Starting…';
  roots.replaceChildren();
  noRoots.hidden = state.roots.length > 0;
  for (const root of state.roots) {
    const row = document.createElement('div');
    row.className = `root ${state.selectedRoot === root.name ? 'selected' : ''}`;
    const choose = document.createElement('button');
    choose.className = 'root-main';
    choose.textContent = `/${root.name}  —  ${root.path}`;
    choose.addEventListener('click', () => void window.comguQwen.selectRoot(root.name).then(render));
    const remove = document.createElement('button');
    remove.textContent = 'Remove';
    remove.addEventListener('click', () => void window.comguQwen.removeRoot(root.name).then(render));
    row.append(choose, remove);
    roots.append(row);
  }
  for (const input of document.querySelectorAll<HTMLInputElement>('input[data-group]')) {
    const group = input.dataset.group as keyof QwenUiState['permissions'];
    input.checked = state.permissions[group];
  }
  activity.textContent = state.activity.length ? JSON.stringify(state.activity, null, 2) : 'No activity yet.';
}

for (const input of document.querySelectorAll<HTMLInputElement>('input[data-group]')) {
  input.addEventListener('change', () => {
    const group = input.dataset.group as 'look' | 'change' | 'desktop' | 'run';
    void window.comguQwen.setPermissionGroup(group, input.checked).then(render);
  });
}
document.querySelector('#addRoot')?.addEventListener('click', () => void window.comguQwen.addRoot().then(render));
document.querySelector('#copyEndpoint')?.addEventListener('click', () => void window.comguQwen.copyEndpoint());

void window.comguQwen.getState().then(render);
setInterval(() => void window.comguQwen.getState().then(render), 3000);
