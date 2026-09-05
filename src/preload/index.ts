import { contextBridge, ipcRenderer } from 'electron';

export interface QwenUiState {
  endpoint: string | null;
  roots: Array<{ name: string; path: string }>;
  enabledRoots: string[];
  permissions: { look: boolean; change: boolean; desktop: boolean; run: boolean };
  activity: Array<unknown>;
}

type Group = 'look' | 'change' | 'desktop' | 'run';

const api = {
  getState: (): Promise<QwenUiState> => ipcRenderer.invoke('qwen:getState'),
  addRoot: (): Promise<QwenUiState> => ipcRenderer.invoke('qwen:addRoot'),
  removeRoot: (name: string): Promise<QwenUiState> => ipcRenderer.invoke('qwen:removeRoot', name),
  setRootEnabled: (name: string, enabled: boolean): Promise<QwenUiState> =>
    ipcRenderer.invoke('qwen:setRootEnabled', { name, enabled }),
  setPermissionGroup: (group: Group, enabled: boolean): Promise<QwenUiState> =>
    ipcRenderer.invoke('qwen:setPermissionGroup', { group, enabled }),
  copyEndpoint: (): Promise<boolean> => ipcRenderer.invoke('qwen:copyEndpoint')
};

contextBridge.exposeInMainWorld('comguQwen', api);
export type ComGuQwenApi = typeof api;
