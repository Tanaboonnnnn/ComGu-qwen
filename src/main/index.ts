import path from 'node:path';
import { app, BrowserWindow, clipboard, dialog, ipcMain, session } from 'electron';
import { effectiveCapabilities, getConfig, initConfigPath, loadConfig, updateConfig } from './config.js';
import { clearManualWorkspaceScope, setManualWorkspaceScope } from './chat-workspace-scope.js';
import { readRecentQwenActivity } from './qwen/activity.js';
import { qwenLocalUrl, startQwenLocalService, stopQwenLocalService } from './qwen/lifecycle.js';
import { capabilityPatchForGroup, type QwenPermissionGroup } from './qwen/settings.js';
import {
  initQwenWorkspaceState,
  loadQwenWorkspaceSelection,
  saveQwenWorkspaceSelection
} from './qwen/workspace-state.js';
import { uniqueRootName, validateNewRoot } from './sandbox.js';

let window: BrowserWindow | null = null;
let quitting = false;
let shutdownStarted = false;
let selectedRootName: string | null = null;

function toolContext() {
  const config = getConfig();
  return {
    roots: config.roots,
    caps: effectiveCapabilities(config),
    readOnly: config.readOnly,
    privacyScreenshots: config.ui.privacyScreenshots,
    sessionTools: false,
    agentTools: false,
    exposedSessionTools: false,
    exposedAgentTools: false
  };
}

function permissionGroups() {
  const caps = effectiveCapabilities(getConfig());
  return {
    look: caps.read && caps.browse && caps.metadata,
    change: caps.create && caps.edit && caps.move && caps.deleteFile,
    desktop: caps.screen && caps.control && caps.clipboardRead && caps.clipboardWrite,
    run: caps.command
  };
}

async function uiState() {
  return {
    endpoint: qwenLocalUrl(),
    roots: getConfig().roots.map((root) => ({ name: root.name, path: root.path })),
    selectedRoot: selectedRootName,
    permissions: permissionGroups(),
    activity: await readRecentQwenActivity(30)
  };
}

async function selectRoot(name: string | null): Promise<void> {
  const roots = getConfig().roots;
  if (name === null) {
    selectedRootName = null;
    clearManualWorkspaceScope();
    await saveQwenWorkspaceSelection(null);
    return;
  }
  if (!roots.some((root) => root.name === name)) throw new Error('Selected workspace is not approved.');
  setManualWorkspaceScope(roots, { primaryRoot: name, sharedRoots: [] });
  selectedRootName = name;
  await saveQwenWorkspaceSelection(name);
}

function isPermissionGroup(value: unknown): value is QwenPermissionGroup {
  return value === 'look' || value === 'change' || value === 'desktop' || value === 'run';
}

function registerIpc(): void {
  ipcMain.handle('qwen:getState', () => uiState());
  ipcMain.handle('qwen:addRoot', async () => {
    if (!window) throw new Error('No window.');
    const result = await dialog.showOpenDialog(window, { title: 'Approve a folder for ComGu Qwen', properties: ['openDirectory'] });
    if (!result.canceled && result.filePaths[0]) {
      await updateConfig(async (config) => {
        const real = await validateNewRoot(result.filePaths[0]!, config.roots);
        const name = uniqueRootName(real, config.roots);
        return { ...config, roots: [...config.roots, { name, path: real }] };
      });
    }
    return uiState();
  });
  ipcMain.handle('qwen:removeRoot', async (_event, name: unknown) => {
    if (typeof name !== 'string') throw new Error('Invalid root name.');
    await updateConfig((config) => ({ ...config, roots: config.roots.filter((root) => root.name !== name) }));
    if (selectedRootName === name) await selectRoot(null);
    return uiState();
  });
  ipcMain.handle('qwen:selectRoot', async (_event, name: unknown) => {
    if (name !== null && typeof name !== 'string') throw new Error('Invalid workspace selection.');
    await selectRoot(name as string | null);
    return uiState();
  });
  ipcMain.handle('qwen:setPermissionGroup', async (_event, payload: unknown) => {
    const input = payload as { group?: unknown; enabled?: unknown };
    const group = input?.group;
    const enabled = input?.enabled;
    if (!isPermissionGroup(group) || typeof enabled !== 'boolean') throw new Error('Invalid permission update.');
    await updateConfig((config) => ({
      ...config,
      capabilities: { ...config.capabilities, ...capabilityPatchForGroup(group, enabled) }
    }));
    return uiState();
  });
  ipcMain.handle('qwen:copyEndpoint', () => {
    const url = qwenLocalUrl();
    if (!url) return false;
    clipboard.writeText(url);
    return true;
  });
}

function createWindow(): void {
  window = new BrowserWindow({
    width: 900,
    height: 720,
    minWidth: 760,
    minHeight: 600,
    title: 'ComGu Qwen',
    backgroundColor: '#111318',
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webviewTag: false,
      webSecurity: true
    }
  });
  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  window.webContents.on('will-navigate', (event) => event.preventDefault());
  if (process.env.ELECTRON_RENDERER_URL) void window.loadURL(process.env.ELECTRON_RENDERER_URL);
  else void window.loadFile(path.join(__dirname, '../renderer/index.html'));
  window.on('closed', () => { window = null; });
}

const qwenUserData = process.env.COMGU_QWEN_USER_DATA?.trim() || path.join(app.getPath('appData'), 'ComGu Qwen');
app.setName('ComGu Qwen');
app.setPath('userData', qwenUserData);
const ownsLock = app.requestSingleInstanceLock();
if (!ownsLock) app.quit();

app.on('second-instance', () => {
  if (!window) createWindow();
  window?.show();
  window?.focus();
});

void app.whenReady().then(async () => {
  if (!ownsLock) return;
  const userData = app.getPath('userData');
  initConfigPath(userData);
  initQwenWorkspaceState(userData);
  await loadConfig();
  const restored = await loadQwenWorkspaceSelection();
  if (restored && getConfig().roots.some((root) => root.name === restored)) await selectRoot(restored);
  else {
    selectedRootName = null;
    clearManualWorkspaceScope();
  }

  session.defaultSession.setPermissionRequestHandler((_wc, _permission, callback) => callback(false));
  registerIpc();
  await startQwenLocalService(userData, toolContext);
  createWindow();
});

app.on('before-quit', () => { quitting = true; });
app.on('window-all-closed', () => { if (!quitting) app.quit(); });
app.on('will-quit', (event) => {
  if (!ownsLock || shutdownStarted) return;
  event.preventDefault();
  shutdownStarted = true;
  void stopQwenLocalService().finally(() => app.exit(0));
});
