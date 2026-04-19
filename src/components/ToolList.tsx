import React from 'react';
import { Box, Text } from 'ink';
import type { McpServer, McpTool } from '../lib/types.js';

interface Props {
  server: McpServer | undefined;
  allowedTools: string[];
  selectedToolIndex: number;
  focused: boolean;
}

function isToolEnabled(toolKey: string, allowedTools: string[]): boolean {
  return allowedTools.includes(toolKey);
}

function truncateDesc(desc: string, max: number): string {
  return desc.length > max ? desc.slice(0, max - 1) + '…' : desc;
}

export function ToolList({ server, allowedTools, selectedToolIndex, focused }: Props) {
  const title = server ? `Tools: ${server.name}` : 'Tools';

  return (
    <Box flexDirection="column" flexGrow={1} borderStyle="single" borderColor={focused ? 'cyan' : 'gray'} padding={0}>
      <Text bold color="white"> {title}</Text>
      {!server && <Text color="gray">  Select a server</Text>}
      {server && server.status === 'loading' && <Text color="yellow">  Loading tools...</Text>}
      {server && server.status === 'error' && <Text color="red">  Error: {server.error}</Text>}
      {server && server.status === 'connected' && server.tools.length === 0 && (
        <Text color="gray">  No tools found</Text>
      )}
      {server && server.tools.map((tool: McpTool, i: number) => {
        const toolKey = `mcp__${server.name}__${tool.name}`;
        const enabled = isToolEnabled(toolKey, allowedTools);
        const isSelected = i === selectedToolIndex;
        const desc = isSelected && tool.description ? truncateDesc(tool.description, 55) : '';
        return (
          <Box key={`${i}-${tool.name}`} flexDirection="column">
            <Text color={isSelected ? 'cyan' : 'white'} bold={isSelected}>
              {isSelected ? '▶ ' : '  '}[{enabled ? '✓' : ' '}] {tool.name}
            </Text>
            {desc !== '' && (
              <Text color="gray">      {desc}</Text>
            )}
          </Box>
        );
      })}
    </Box>
  );
}
