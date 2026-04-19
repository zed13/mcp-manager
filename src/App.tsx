import React, { useEffect, useState, useCallback } from 'react';
import { Box, Text, useInput, useApp, Key } from 'ink';
import { ServerList } from './components/ServerList.js';
import { ToolList } from './components/ToolList.js';
import { StatusBar } from './components/StatusBar.js';
import { readClaudeJson, getGlobalServers, getProjectServers, getAllowedTools, saveAllowedTools } from './lib/config.js';
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
    selectedServerIndex: 0,
    focusedPanel: 'servers',
    isDirty: false,
  });

  const [selectedToolIndex, setSelectedToolIndex] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');

  useEffect(() => {
    async function load() {
      const config = readClaudeJson();
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

      setState((s: AppState) => ({ ...s, servers, allowedTools }));

      for (const server of servers) {
        try {
          const tools = await connectServer(server.name, server.config);
          setState((s: AppState) => ({
            ...s,
            servers: s.servers.map((sv: McpServer) =>
              sv.name === server.name
                ? { ...sv, tools, status: 'connected' as const }
                : sv
            ),
          }));
        } catch (err) {
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
  }, [projectPath]);

  useInput(useCallback((input: string, key: Key) => {
    setState((s: AppState) => {
      const server = s.servers[s.selectedServerIndex];
      const toolCount = server?.tools.length ?? 0;

      if (key.tab) {
        return { ...s, focusedPanel: s.focusedPanel === 'servers' ? 'tools' : 'servers' };
      }

      if (input === 'q' || input === 'Q') {
        exit();
        return s;
      }

      if (input === 'g' || input === 'G') {
        return { ...s, mode: 'global' };
      }

      if (input === 'p' || input === 'P') {
        return { ...s, mode: 'project' };
      }

      if (input === 's' || input === 'S') {
        saveAllowedTools(s.projectPath, s.allowedTools);
        setStatusMessage('Saved!');
        setTimeout(() => setStatusMessage(''), 2000);
        return { ...s, isDirty: false };
      }

      if (s.focusedPanel === 'servers') {
        if (key.upArrow) {
          return { ...s, selectedServerIndex: Math.max(0, s.selectedServerIndex - 1) };
        }
        if (key.downArrow) {
          return { ...s, selectedServerIndex: Math.min(s.servers.length - 1, s.selectedServerIndex + 1) };
        }
      }

      if (s.focusedPanel === 'tools') {
        if (key.upArrow) {
          setSelectedToolIndex(i => Math.max(0, i - 1));
        }
        if (key.downArrow) {
          setSelectedToolIndex(i => Math.min(toolCount - 1, i + 1));
        }
        if (input === ' ' && server && toolCount > 0) {
          const tool = server.tools[selectedToolIndex];
          if (!tool) return s;
          const toolKey = `mcp__${server.name}__${tool.name}`;
          const allowedTools = s.allowedTools.includes(toolKey)
            ? s.allowedTools.filter((t: string) => t !== toolKey)
            : [...s.allowedTools, toolKey];
          return { ...s, allowedTools, isDirty: true };
        }
      }

      return s;
    });
  }, [exit, selectedToolIndex]));

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
