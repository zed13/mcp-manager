import React from 'react';
import { Box, Text } from 'ink';

interface Props {
  mode: 'global' | 'project';
  projectPath: string;
  isDirty: boolean;
}

export function StatusBar({ mode, projectPath, isDirty }: Props) {
  return (
    <Box borderStyle="single" borderColor="gray" paddingX={1}>
      <Text color="cyan">[{mode === 'global' ? 'Global' : 'Project'}]</Text>
      <Text> {projectPath}</Text>
      {isDirty && <Text color="yellow"> *</Text>}
      <Text color="gray">  Tab: switch  Space: toggle  S: save  G/P: mode  Q: quit</Text>
    </Box>
  );
}
