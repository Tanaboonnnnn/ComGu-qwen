# ComGu Qwen Standalone Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extract the verified local Qwen MCP implementation into an independently buildable `ComGu Qwen` Electron application and repository without modifying normal ComGu.

**Architecture:** Use the existing verified Qwen surface as the protocol boundary and port only the shared filesystem, patch, command, sandbox, and Windows desktop-control runtime it needs. A new minimal Electron shell owns config, workspace permission UI, endpoint lifecycle, and activity display. ChatGPT bridge/session/agent code is not part of the application entry graph.

**Tech Stack:** TypeScript, Electron 43.4.1, electron-vite, Vitest, `@modelcontextprotocol/server`, `@modelcontextprotocol/node`, `@microsoft/mxc-sdk`, node-pty, sharp, tree-sitter.

**Spec:** `docs/superpowers/specs/2026-09-05-comgu-qwen-standalone-design.md`

## Global Constraints
- Original `Steroids` / ComGu repository is read-only throughout this work.
- No ChatGPT session, agents, Sub-agent, browser bridge, extension, or conversation correlation in the standalone runtime.
- MCP binds to loopback and uses a per-start secret path.
- File/terminal authority requires explicit approved workspace selection.
- Windows command execution fails closed unless MXC confinement is available.
- Desktop automation remains separately permission gated.
- Initial distributable target is Windows x64.
- Do not push until all local verification and packaged smoke checks pass.

---

### Task 1: Bootstrap the standalone repository and identity
**Files:** create `package.json`, `package-lock.json`, `tsconfig.json`, `electron.vite.config.ts`, `electron-builder.yml`, `src/main/index.ts`, `src/preload/index.ts`, `src/renderer/*`, `src/shared/types.ts`, tests.

- [ ] Add a failing branding/bootstrap test requiring package name `comgu-qwen`, product `ComGu Qwen`, unique appId, and a main entry that imports no ChatGPT bridge/session/agents modules.
- [ ] Verify RED.
- [ ] Add the minimal Electron/Vite package and independent application identity.
- [ ] Verify focused test and typecheck.
- [ ] Commit locally.

### Task 2: Port the verified Qwen MCP surface and activity store
**Files:** create `src/main/qwen/*` and focused Qwen tests.

- [ ] Copy the already verified Qwen surface/server/registrar/activity behavior from the local `comgu-qwen-local` branch.
- [ ] Adapt imports only to the standalone shared runtime.
- [ ] Run Qwen discovery tests asserting the exact eight tools and absence of `session` / `agents`.
- [ ] Run activity privacy/bounds tests.
- [ ] Commit locally.

### Task 3: Port approved-root filesystem and patch runtime
**Files:** create/port `src/main/sandbox.ts`, `src/main/fsops.ts`, `src/main/rawfs.ts`, `src/main/search.ts`, `src/main/codex/filesystem.ts`, `read-backend.ts`, `view-image.ts`, `apply-patch/*`, MCP core registration.

- [ ] Add/port negative tests for traversal, native-path escape, symlink/reparse containment, and no-workspace refusal.
- [ ] Port only dependencies required by `read`, `view_image`, and `apply_patch`.
- [ ] Verify file/edit tools against an approved temporary root and an outside canary.
- [ ] Commit locally.

### Task 4: Port terminal runtime with MXC confinement
**Files:** create/port `src/main/codex/unified-exec*`, `shell.ts`, `ownership.ts`, `exec-output.ts`, `src/main/run/command-sandbox.ts`, MXC probe/executor resources, tests.

- [ ] Port the Qwen sandbox-authority seam that supplies a stable authority fingerprint from the selected workspace.
- [ ] Add/port adversarial outside-root child-process tests.
- [ ] Verify `exec_command` and `write_stdin` work in-root and fail closed outside-root or without MXC readiness.
- [ ] Commit locally.

### Task 5: Port Windows desktop automation and permission guards
**Files:** create/port `src/main/computer/*`, desktop tool registration, capability model, tests.

- [ ] Port `observe` and `computer` with existing per-action live permission checks.
- [ ] Keep non-Windows discovery empty for Desktop-only capabilities.
- [ ] Run screenshot/frame/UIA/input negative and permission tests on Windows.
- [ ] Commit locally.

### Task 6: Add standalone config, workspace, endpoint lifecycle, and minimal UI
**Files:** create `src/main/config.ts`, `src/main/qwen/lifecycle.ts`, IPC/preload/renderer files, tests.

- [ ] Persist approved root definitions and four capability groups in the ComGu Qwen userData only.
- [ ] Keep current workspace selection explicit and fail closed until selected.
- [ ] Start/stop Qwen MCP with the Electron process and write `qwen/endpoint.json` under ComGu Qwen userData.
- [ ] Renderer displays/copies endpoint URL, edits roots, toggles permissions, and shows recent tool activity through narrow IPC only.
- [ ] Verify renderer has no Node/filesystem/network escape hatch.
- [ ] Commit locally.

### Task 7: Packaging identity and Windows x64 packaged smoke
**Files:** `electron-builder.yml`, packaging scripts/resources, package smoke tests.

- [ ] Configure unique Windows installer/product identity so normal ComGu and ComGu Qwen can coexist.
- [ ] Stage exact x64 native dependencies and MXC resources.
- [ ] Run `npm run build` and Windows x64 package.
- [ ] Launch the packaged app with isolated userData and assert `endpoint.json` exists.
- [ ] POST Streamable HTTP `tools/list` to the packaged endpoint and assert exactly the expected tools with no session/agents.
- [ ] Commit locally.

### Task 8: Final regression, source-isolation proof, and publish
**Files:** tests/docs only unless verification finds a defect.

- [ ] Run focused Qwen tests and security negatives.
- [ ] Run `npm run typecheck` and full `npm test`.
- [ ] Run `npm run build`, `git diff --check`, and packaged smoke again from the final commit tree.
- [ ] Record the original ComGu repository HEAD/status and prove they match the pre-extraction baseline.
- [ ] Push `main` to `Tanaboonnnnn/ComGu-qwen` only after every local gate is green.
- [ ] Report exact installer path and Qwen Studio connection fields.
