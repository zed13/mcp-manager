import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import type { ClaudeJson, McpServerConfig } from './types.js';

const CLAUDE_JSON_PATH = path.join(os.homedir(), '.claude.json');

export function readClaudeJson(): ClaudeJson {
  const raw = fs.readFileSync(CLAUDE_JSON_PATH, 'utf-8');
  const parsed = JSON.parse(raw);
  return {
    mcpServers: parsed.mcpServers ?? {},
    projects: parsed.projects ?? {},
    ...parsed,
  };
}

export function getGlobalServers(config: ClaudeJson): Record<string, McpServerConfig> {
  return config.mcpServers ?? {};
}

export function getProjectServers(config: ClaudeJson, projectPath: string): Record<string, McpServerConfig> {
  return config.projects?.[projectPath]?.mcpServers ?? {};
}

export function getAllowedTools(config: ClaudeJson, projectPath: string): string[] {
  return config.projects?.[projectPath]?.allowedTools ?? [];
}

export function saveAllowedTools(projectPath: string, tools: string[]): void {
  const raw = fs.readFileSync(CLAUDE_JSON_PATH, 'utf-8');
  const parsed = JSON.parse(raw);

  if (!parsed.projects) parsed.projects = {};
  if (!parsed.projects[projectPath]) parsed.projects[projectPath] = {};
  parsed.projects[projectPath].allowedTools = tools;

  fs.writeFileSync(CLAUDE_JSON_PATH, JSON.stringify(parsed, null, 2), 'utf-8');
}
