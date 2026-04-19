import React from 'react';
import { render } from 'ink';
import * as path from 'path';
import { App } from './App.js';

function parseArgs(argv: string[]): { project?: string; help: boolean } {
  const args: { project?: string; help: boolean } = { help: false };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--help' || argv[i] === '-h') {
      args.help = true;
    } else if ((argv[i] === '--project' || argv[i] === '-p') && argv[i + 1]) {
      args.project = argv[++i];
    }
  }
  return args;
}

const args = parseArgs(process.argv.slice(2));

if (args.help) {
  console.log(`Usage: mcp-manager [--project <path>]

  Manage MCP tool permissions in ~/.claude.json.

Options:
  --project, -p <path>   Project directory to manage (default: current directory)
  --help, -h             Show this help message

Keys:
  Tab          Switch focus between server/tool panels
  ↑/↓          Navigate list
  Space        Toggle tool enabled/disabled
  S            Save to ~/.claude.json
  G / P        Switch Global / Project mode
  Q            Quit`);
  process.exit(0);
}

const projectPath = path.resolve(args.project ?? process.cwd());

render(<App projectPath={projectPath} />);
