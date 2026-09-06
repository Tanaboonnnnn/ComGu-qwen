# ComGu Qwen

ComGu Qwen is a standalone local MCP desktop app for Qwen Studio. It exposes ComGu's local file, edit, command and Windows desktop tools without ChatGPT sessions, browser recording, Prime/Worker agents or Sub-agent features.

## Tools

- `read`
- `view_image`
- `apply_patch`
- `exec_command`
- `write_stdin`
- `observe`
- `computer`
- `activity`

## Connect Qwen Studio

1. Open **ComGu Qwen**.
2. Add folders, then tick every folder Qwen is allowed to use. You can enable multiple folders at once.
3. Copy the **MCP endpoint** shown in the app.
4. In Qwen Studio add an MCP server with:
   - **Name:** `ComGu Qwen`
   - **Description:** `Local ComGu tools for Qwen Studio`
   - **Type:** `StreamableHTTP`
   - **URL:** paste the endpoint from the app.
5. Save and enable it.

The endpoint is local-only and stable per computer: ComGu Qwen binds to `127.0.0.1:39090` and generates a persistent random secret token the first time it runs. Restarting the app or rebooting the computer keeps the same URL. If port `39090` is already in use, ComGu Qwen fails clearly instead of silently moving to another port.

## Permissions and folder security

ComGu Qwen keeps four permission groups in the desktop app:

- **Look at files**
- **Change files**
- **See and use the desktop**
- **Run programs**

File and command tools can access only folders whose checkboxes are enabled in ComGu Qwen. Unticking a folder revokes it immediately, and no per-chat workspace selection is required. On Windows, commands use the MXC ProcessContainer confinement path inherited from ComGu; if the confinement backend is unavailable, sandboxed commands are refused rather than silently running unrestricted.

The activity log stores bounded tool summaries only. It does not store Qwen chat messages or transcripts. The desktop status shows Ready / Working / Tool error, and activity timestamps are displayed in Thailand time (`Asia/Bangkok`, UTC+7).

## Development

```powershell
npm ci
npm test
npm run typecheck
npm run build
npm run dist:x64
```

The Windows x64 installer is written to:

```text
release/ComGu-Qwen-Setup-x64.exe
```

## Current platform target

v0.1.2 is packaged and smoke-tested on Windows x64. The MCP protocol and core file runtime remain portable, while desktop automation is Windows-only until another platform has a proven backend.
