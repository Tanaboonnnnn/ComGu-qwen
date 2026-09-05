# ComGu Qwen Standalone Design

## Goal
Build a standalone `ComGu Qwen` desktop application and repository for Qwen Studio. It exposes only local tool capabilities and bounded tool activity history over MCP Streamable HTTP.

## Isolation from ComGu
- The existing `Steroids` / ComGu repository is a read-only source reference during extraction.
- No commit, branch, config, package output, or runtime state in the original repository may be changed.
- `ComGu Qwen` uses its own Git repository, Electron identity, single-instance lock, userData directory, activity store, endpoint secret, and package artifacts.
- Security fixes may be ported from ComGu deliberately, but runtime state is never shared implicitly.

## Tool surface
Expose exactly these model-visible tools when their live permissions allow them:
- `read`
- `view_image`
- `apply_patch`
- `exec_command`
- `write_stdin`
- `observe`
- `computer`
- `activity`

Do not expose ChatGPT-specific `session`, `agents`, Prime/Worker/Sub-agent, Compact/Resume, browser bridge, ChatGPT extension, request-to-conversation correlation, or chat transcripts.

## Security model
- Bind MCP only to `127.0.0.1`.
- Use a random secret in the Qwen endpoint path on every application start.
- File and command tools require an explicit approved workspace selection and fail closed without one.
- File operations retain canonical path / symlink / reparse containment checks.
- Windows commands use the existing MXC ProcessContainer confinement path; if confinement is unavailable, commands fail closed.
- Desktop actions remain independently permission-gated.
- Model-visible errors must not leak native paths outside approved roots.

## Activity history
Store tool activity only. Each record contains timestamp, tool, bounded summary, success/failure, and duration. Do not store user prompts, assistant messages, full patch bodies, typed text, file contents, screenshots, or command output in the activity log.

## Application
`ComGu Qwen` is a separate Electron application with its own package identity and userData. The minimal UI shows:
- MCP endpoint information for Qwen Studio
- approved workspace roots / current workspace selection
- four capability groups: Look at files, Change files, See and use the desktop, Run programs
- recent activity

The application must be able to run alongside normal ComGu without sharing a single-instance lock.

## Qwen Studio configuration
The app provides values equivalent to:
- Name: `ComGu Qwen`
- Description: `Local ComGu tools for Qwen Studio`
- Type: `StreamableHTTP`
- URL: current local secret endpoint

## Packaging
Initial local release target is Windows x64. The repository retains portable source boundaries so macOS/Linux builds can be added without changing the MCP protocol. Desktop automation is Windows-only unless a proven backend exists on another platform.

## Verification
Before push/build completion:
- focused Qwen MCP tests pass
- approved-root and command-confinement negative tests pass
- no session/agents tools appear in discovery
- typecheck passes
- full test suite passes
- production build passes
- Windows x64 package builds
- packaged app starts with isolated userData and serves a successful MCP `tools/list`
- original ComGu repository status/HEAD remain unchanged
