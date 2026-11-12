import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { exec as execSync } from 'child_process';
import { readFile } from 'fs/promises';
import { dirname, join } from 'path';
import { promisify } from 'util';
import { z } from 'zod';

const exec = promisify(execSync);

// Initialize the MCP server with a name and version
const server = new McpServer({ name: 'workshops-de-angular-mcp', version: '1.0.0' });

server.registerTool(
  'get_project_context',
  {
    title: 'Get BookMonkey Project Context',
    description:
      'Reads the current BookMonkey architecture, project rules, README and package.json, including project paths, dependencies, commands and environment limitations.',
    inputSchema: {},
    annotations: { readOnlyHint: true, openWorldHint: false }
  },
  async () => {
    const projectRoot = dirname(dirname(__dirname));
    const files = [
      'ARCHITECTURE.md',
      'AGENTS.md',
      'src/AGENTS.md',
      'src/app/books/AGENTS.md',
      'README.md',
      'package.json'
    ];
    const results = await Promise.all(
      files.map(async file => {
        try {
          return { text: `# ${file}\n\n${await readFile(join(projectRoot, file), 'utf8')}`, failed: false };
        } catch (error: unknown) {
          return {
            text: `Could not read ${file}: ${error instanceof Error ? error.message : 'Unknown error'}`,
            failed: true
          };
        }
      })
    );

    return {
      content: results.map(result => ({ type: 'text' as const, text: result.text })),
      isError: results.some(result => result.failed)
    };
  }
);

server.registerTool(
  'generate_component',
  {
    title: 'Generate Angular Component',
    description: 'Creates a new Angular component using the Angular CLI',
    inputSchema: {
      name: z.string().describe('Component name'),
      path: z.string().optional().describe('Target path or project')
    }
  },
  async ({ name, path }: { name: string; path?: string }) => {
    // CLI is already in the project root, so we need to remove the src/app prefix
    path = path?.replace(/^src\/app\/?/, '');

    // Construct the CLI command
    const target = path ? `${path}/${name}` : name;
    const cliCommand = `npx @angular/cli generate component ${target} --standalone --flat --skip-tests --inline-style --inline-template --no-interactive`;

    try {
      // Execute from the project root (two levels up from tools/angular-mcp)
      const result = await exec(cliCommand, { cwd: dirname(dirname(__dirname)) });
      return { content: [{ type: 'text', text: `✅ Component generated successfully:\n${result.stdout}` }] };
    } catch (error: unknown) {
      return {
        content: [{ type: 'text', text: `❌ CLI Error: ${error instanceof Error ? error.message : 'Unknown error'}` }]
      };
    }
  }
);

// Start listening for MCP messages on STDIN/STDOUT
const transport = new StdioServerTransport();

server
  .connect(transport)
  .then(() => console.error('MCP server started'))
  .catch(error => console.error('Error connecting to MCP server:', error));
