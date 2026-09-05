import { describe, expect, it } from 'vitest';
import { capabilityPatchForGroup } from '../src/main/qwen/settings.js';

describe('Qwen permission groups', () => {
  it('maps the four UI groups to the existing capability keys only', () => {
    expect(capabilityPatchForGroup('look', true)).toEqual({ read: true, browse: true, metadata: true });
    expect(capabilityPatchForGroup('change', false)).toEqual({ create: false, edit: false, move: false, deleteFile: false });
    expect(capabilityPatchForGroup('desktop', true)).toEqual({ screen: true, control: true, clipboardRead: true, clipboardWrite: true });
    expect(capabilityPatchForGroup('run', false)).toEqual({ command: false });
  });
});
