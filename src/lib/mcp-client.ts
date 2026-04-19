import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import type { McpServerConfig, McpTool } from './types.js';

const TIMEOUT_MS = 10000;

export async function connectServer(name: string, config: McpServerConfig, signal?: AbortSignal): Promise<McpTool[]> {
  if (signal?.aborted) throw new Error('Aborted');
  const client = new Client({ name: 'mcp-manager', version: '1.0.0' });

  let transport;
  if (config.type === 'http') {
    transport = new StreamableHTTPClientTransport(new URL(config.url), {
      requestInit: config.headers ? { headers: config.headers } : undefined,
    });
  } else {
    transport = new StdioClientTransport({
      command: config.command,
      args: config.args ?? [],
      env: { ...process.env, ...(config.env ?? {}) } as Record<string, string>,
    });
  }

  let timer: ReturnType<typeof setTimeout> | undefined;

  const operation = async () => {
    await client.connect(transport);
    const result = await client.listTools();
    return (result.tools ?? []).map((t) => ({
      name: t.name,
      description: t.description,
    }));
  };

  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`Timeout connecting to ${name}`)), TIMEOUT_MS);
  });

  const abort = new Promise<never>((_, reject) => {
    signal?.addEventListener('abort', () => reject(new Error('Aborted')), { once: true });
  });

  try {
    return await Promise.race([operation(), timeout, abort]);
  } finally {
    clearTimeout(timer);
    await client.close().catch(() => {});
  }
}
