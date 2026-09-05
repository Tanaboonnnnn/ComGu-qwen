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
2. Add an approved folder and click it to select the active workspace.
3. Copy the **MCP endpoint** shown in the app.
4. In Qwen Studio add an MCP server with:
   - **Name:** `ComGu Qwen`
   - **Description:** `Local ComGu tools for Qwen Studio`
   - **Type:** `StreamableHTTP`
   - **URL:** paste the endpoint from the app.
5. Save and enable it.

The endpoint is bound to `127.0.0.1` and contains a new random secret path each time the app starts, so copy the current URL after a restart.

## Permissions and workspace security

ComGu Qwen keeps four permission groups in the desktop app:

- **Look at files**
- **Change files**
- **See and use the desktop**
- **Run programs**

File and command tools fail closed until an approved workspace is selected. On Windows, commands use the MXC ProcessContainer confinement path inherited from ComGu; if the confinement backend is unavailable, sandboxed commands are refused rather than silently running unrestricted.

The activity log stores bounded tool summaries only. It does not store Qwen chat messages or transcripts.

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

v0.1.0 is packaged and smoke-tested on Windows x64. The MCP protocol and core file runtime remain portable, while desktop automation is Windows-only until another platform has a proven backend.
