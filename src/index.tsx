import React from 'react';
import { render } from 'ink';
import * as path from 'path';
import { App } from './App.js';

function parseArgs(argv: string[]): { project?: string } {
  const args: { project?: string } = {};
  for (let i = 0; i < argv.length; i++) {
    if ((argv[i] === '--project' || argv[i] === '-p') && argv[i + 1]) {
      args.project = argv[++i];
    }
  }
  return args;
}

const args = parseArgs(process.argv.slice(2));
const projectPath = path.resolve(args.project ?? process.cwd());

render(<App projectPath={projectPath} />);
