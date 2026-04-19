import React from 'react';
import { Box, Text } from 'ink';
import type { McpServer } from '../lib/types.js';

interface Props {
  servers: McpServer[];
  selectedIndex: number;
  focused: boolean;
}

export function ServerList({ servers, selectedIndex, focused }: Props) {
  return (
    <Box flexDirection="column" width={20} borderStyle="single" borderColor={focused ? 'cyan' : 'gray'} padding={0}>
      <Text bold color="white"> Servers</Text>
      {servers.length === 0 && <Text color="gray">  (none)</Text>}
      {servers.map((server, i) => {
        const isSelected = i === selectedIndex;
        return (
          <Box key={`${server.origin}-${server.name}`} flexDirection="column">
            <Text
              color={isSelected ? 'cyan' : 'white'}
              bold={isSelected}
            >
              {isSelected ? '▶ ' : '  '}{server.name}
            </Text>
            <Text color="gray">  ({server.origin})</Text>
            {server.status === 'loading' && <Text color="yellow">  ...</Text>}
            {server.status === 'error' && <Text color="red">  ⚠ {server.error}</Text>}
          </Box>
        );
      })}
    </Box>
  );
}
