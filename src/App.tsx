import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Box, Text, useInput, useApp, Key } from 'ink';
import { ServerList } from './components/ServerList.js';
import { ToolList } from './components/ToolList.js';
import { StatusBar } from './components/StatusBar.js';
import { readClaudeJson, getGlobalServers, getProjectServers, getAllowedTools, getGlobalAllowedTools, saveAllowedTools, saveGlobalAllowedTools } from './lib/config.js';
import { connectServer } from './lib/mcp-client.js';
import type { AppState, McpServer } from './lib/types.js';

interface Props {
  projectPath: string;
}

export function App({ projectPath }: Props) {
  const { exit } = useApp();

  const [state, setState] = useState<AppState>({
    mode: 'project',
    projectPath,
    servers: [],
    allowedTools: [],
    projectAllowedTools: [],
    globalAllowedTools: [],
    selectedServerIndex: 0,
    focusedPanel: 'servers',
    isDirty: false,
  });

  const stateRef = useRef(state);
  stateRef.current = state;

  const [selectedToolIndex, setSelectedToolIndex] = useState(0);
  const selectedToolIndexRef = useRef(selectedToolIndex);
  selectedToolIndexRef.current = selectedToolIndex;

  const [statusMessage, setStatusMessage] = useState('');

  useEffect(() => {
    setSelectedToolIndex(0);
  }, [state.selectedServerIndex]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      let config;
      try {
        config = readClaudeJson();
      } catch (err) {
        if (cancelled) return;
        const error = err instanceof Error ? err.message : String(err);
        setStatusMessage(`Error reading ~/.claude.json: ${error}`);
        return;
      }
      if (cancelled) return;
      const globalServers = getGlobalServers(config);
      const projectServers = getProjectServers(config, projectPath);
      const allowedTools = getAllowedTools(config, projectPath);

      const servers: McpServer[] = [
        ...Object.entries(globalServers).map(([name, cfg]) => ({
          name,
          config: cfg,
          origin: 'global' as const,
          tools: [],
          status: 'loading' as const,
        })),
        ...Object.entries(projectServers).map(([name, cfg]) => ({
          name,
          config: cfg,
          origin: 'project' as const,
          tools: [],
          status: 'loading' as const,
        })),
      ];

      const globalAllowedTools = getGlobalAllowedTools(config);
      setState((s: AppState) => ({
        ...s,
        servers,
        allowedTools: s.mode === 'global' ? globalAllowedTools : allowedTools,
        projectAllowedTools: allowedTools,
        globalAllowedTools,
      }));

      for (const server of servers) {
        if (cancelled) break;
        try {
          const tools = await connectServer(server.name, server.config);
          if (cancelled) break;
          setState((s: AppState) => ({
            ...s,
            servers: s.servers.map((sv: McpServer) =>
              sv.name === server.name
                ? { ...sv, tools, status: 'connected' as const }
                : sv
            ),
          }));
        } catch (err) {
          if (cancelled) break;
          const error = err instanceof Error ? err.message : String(err);
          setState((s: AppState) => ({
            ...s,
            servers: s.servers.map((sv: McpServer) =>
              sv.name === server.name
                ? { ...sv, status: 'error' as const, error }
                : sv
            ),
          }));
        }
      }
    }
    load();
    return () => { cancelled = true; };
  }, [projectPath]);

  useInput(useCallback((input: string, key: Key) => {
    const s = stateRef.current;
    const toolIdx = selectedToolIndexRef.current;
    const server = s.servers[s.selectedServerIndex];
    const toolCount = server?.tools.length ?? 0;

    if (key.tab) {
      setState(prev => ({ ...prev, focusedPanel: prev.focusedPanel === 'servers' ? 'tools' : 'servers' }));
      return;
    }

    if (input === 'q' || input === 'Q') { exit(); return; }

    if (input === 'g' || input === 'G') {
      setState(prev => ({
        ...prev,
        mode: 'global',
        // stash current edits back into their scope before switching
        projectAllowedTools: prev.mode === 'project' ? prev.allowedTools : prev.projectAllowedTools,
        allowedTools: prev.globalAllowedTools,
        isDirty: false,
      }));
      return;
    }

    if (input === 'p' || input === 'P') {
      setState(prev => ({
        ...prev,
        mode: 'project',
        // stash current edits back into their scope before switching
        globalAllowedTools: prev.mode === 'global' ? prev.allowedTools : prev.globalAllowedTools,
        allowedTools: prev.projectAllowedTools,
        isDirty: false,
      }));
      return;
    }

    if (input === 's' || input === 'S') {
      try {
        if (s.mode === 'global') {
          saveGlobalAllowedTools(s.allowedTools);
          setState(prev => ({ ...prev, globalAllowedTools: prev.allowedTools, isDirty: false }));
        } else {
          saveAllowedTools(s.projectPath, s.allowedTools);
          setState(prev => ({ ...prev, projectAllowedTools: prev.allowedTools, isDirty: false }));
        }
        setStatusMessage('Saved!');
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        setStatusMessage(`Save failed: ${msg}`);
      }
      setTimeout(() => setStatusMessage(''), 3000);
      return;
    }

    if (s.focusedPanel === 'servers') {
      if (key.upArrow) setState(prev => ({ ...prev, selectedServerIndex: Math.max(0, prev.selectedServerIndex - 1) }));
      if (key.downArrow) setState(prev => ({ ...prev, selectedServerIndex: Math.min(prev.servers.length - 1, prev.selectedServerIndex + 1) }));
    }

    if (s.focusedPanel === 'tools') {
      if (key.upArrow) setSelectedToolIndex(i => Math.max(0, i - 1));
      if (key.downArrow) setSelectedToolIndex(i => Math.min(toolCount - 1, i + 1));
      if (input === ' ' && server && toolCount > 0) {
        const tool = server.tools[toolIdx];
        if (!tool) return;
        const toolKey = `mcp__${server.name}__${tool.name}`;
        const allowedTools = s.allowedTools.includes(toolKey)
          ? s.allowedTools.filter((t: string) => t !== toolKey)
          : [...s.allowedTools, toolKey];
        setState(prev => ({ ...prev, allowedTools, isDirty: true }));
      }
    }
  }, [exit]));

  const selectedServer = state.servers[state.selectedServerIndex];

  return (
    <Box flexDirection="column">
      <Box>
        <Text bold color="magenta">MCP Manager  </Text>
        <Text color={state.mode === 'global' ? 'cyan' : 'gray'}>[Global]</Text>
        <Text> / </Text>
        <Text color={state.mode === 'project' ? 'cyan' : 'gray'}>Project</Text>
        <Text>  {state.projectPath}</Text>
      </Box>
      <Box flexDirection="row">
        <ServerList
          servers={state.servers}
          selectedIndex={state.selectedServerIndex}
          focused={state.focusedPanel === 'servers'}
        />
        <ToolList
          server={selectedServer}
          allowedTools={state.allowedTools}
          selectedToolIndex={selectedToolIndex}
          focused={state.focusedPanel === 'tools'}
        />
      </Box>
      <StatusBar mode={state.mode} projectPath={state.projectPath} isDirty={state.isDirty} />
      {statusMessage && <Text color="green">{statusMessage}</Text>}
    </Box>
  );
}
