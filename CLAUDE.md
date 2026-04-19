# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

A TypeScript TUI application for managing MCP (Model Context Protocol) tool permissions in Claude Code. It reads `~/.claude.json`, connects to each configured MCP server, and lets users enable/disable individual tools per project via a keyboard-driven interface built with `ink` (React for CLI).

## Commands

Once initialized (see PROJECT.md Step 1):

```bash
npm run dev -- --project <path>   # run in development mode
```

The project uses `tsx` for development and `typescript` for type checking. No test or lint commands are defined yet.

## Architecture

```
src/
  index.tsx          # CLI entry (meow argument parsing), launches App
  App.tsx            # root component: state, keyboard handlers, orchestration
  components/
    ServerList.tsx   # left panel — server navigation (arrow keys)
    ToolList.tsx     # right panel — tools with toggleable checkboxes (Space)
    StatusBar.tsx    # bottom bar — mode indicator, hotkeys, dirty flag (*)
  lib/
    config.ts        # read/write ~/.claude.json (patch-only, preserve unknown fields)
    mcp-client.ts    # MCP SDK: connects stdio/http servers, calls tools/list
    types.ts         # all TypeScript interfaces (source of truth)
```

### Data flow

1. `index.tsx` parses `--project <path>` (falls back to CWD)
2. `config.ts` reads `~/.claude.json` — global `mcpServers` + `projects[path].mcpServers` + `projects[path].allowedTools`
3. `mcp-client.ts` connects to each server and fetches tool list via `tools/list`
4. `App.tsx` merges into `AppState`, renders two-panel TUI
5. On save (`S`), `saveAllowedTools()` patches only `projects[path].allowedTools` in `~/.claude.json`

### Configuration (`~/.claude.json`)

Tool permissions use the format `mcp__<servername>__<toolname>` in `allowedTools`. Servers can be global (`mcpServers` top-level) or project-specific (`projects[path].mcpServers`). The `origin` field on `McpServer` tracks which scope the server came from.

### Two modes

- **Global** — manages top-level `allowedTools` (if applicable)
- **Project** — manages `projects[path].allowedTools`

Toggle with `G`/`P` keys. Mode is reflected in the status bar.

### Key keyboard bindings

| Key | Action |
|-----|--------|
| Tab | Switch focus between server/tool panels |
| ↑/↓ | Navigate list |
| Space | Toggle tool enabled/disabled |
| S | Save to `~/.claude.json` |
| G / P | Switch Global/Project mode |
| Q | Quit |
