export interface McpServerHttp {
  type: 'http';
  url: string;
  headers?: Record<string, string>;
}

export interface McpServerStdio {
  type?: 'stdio';
  command: string;
  args?: string[];
  env?: Record<string, string>;
}

export type McpServerConfig = McpServerHttp | McpServerStdio;

export interface McpTool {
  name: string;
  description?: string;
}

export interface McpServer {
  name: string;
  config: McpServerConfig;
  origin: 'global' | 'project';
  tools: McpTool[];
  status: 'idle' | 'loading' | 'connected' | 'error';
  error?: string;
}

export interface ProjectConfig {
  mcpServers: Record<string, McpServerConfig>;
  allowedTools: string[];
  disabledMcpjsonServers: string[];
  enabledMcpjsonServers: string[];
}

export interface ClaudeJson {
  mcpServers: Record<string, McpServerConfig>;
  projects: Record<string, ProjectConfig>;
  [key: string]: unknown;
}

export interface AppState {
  mode: 'global' | 'project';
  projectPath: string;
  servers: McpServer[];
  allowedTools: string[];         // active scope's tools (mirrors project or global)
  projectAllowedTools: string[];  // persisted project scope
  globalAllowedTools: string[];   // persisted global scope
  selectedServerIndex: number;
  focusedPanel: 'servers' | 'tools';
  isDirty: boolean;
}
