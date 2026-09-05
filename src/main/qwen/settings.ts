import type { Capabilities } from '../../shared/types.js';

export type QwenPermissionGroup = 'look' | 'change' | 'desktop' | 'run';

export function capabilityPatchForGroup(
  group: QwenPermissionGroup,
  enabled: boolean
): Partial<Capabilities> {
  if (group === 'look') return { read: enabled, browse: enabled, metadata: enabled };
  if (group === 'change') return { create: enabled, edit: enabled, move: enabled, deleteFile: enabled };
  if (group === 'desktop') {
    return {
      screen: enabled,
      control: enabled,
      clipboardRead: enabled,
      clipboardWrite: enabled
    };
  }
  return { command: enabled };
}
