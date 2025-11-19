#!/usr/bin/env node

import express from 'express';
import PokemonMCPServer from './server.js';
import { HttpSingleRequestTransport } from './transports/http-transport.js';

const PORT = process.env.PORT || 8787;

const app = express();
app.use(express.json({ limit: '4mb' }));

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.post('/mcp', async (req, res) => {
  try {
    const mcpServer = new PokemonMCPServer();
    const transport = new HttpSingleRequestTransport(req, res);

    transport.onerror = (error) => {
      console.error('HTTP transport error:', error);
    };

    await mcpServer.server.connect(transport);
  } catch (error) {
    console.error('Failed to handle MCP request:', error);
    if (!res.headersSent) {
      res
        .writeHead(500, { 'Content-Type': 'application/json' })
        .end(
          JSON.stringify({
            jsonrpc: '2.0',
            error: {
              code: -32603,
              message: 'Internal MCP server error',
            },
          })
        );
    }
  }
});

const server = app.listen(PORT, () => {
  console.log(`🚀 MCP HTTP server listening on http://localhost:${PORT}/mcp`);
});

const shutdown = () => {
  console.log('\n🛑 Shutting down MCP HTTP server...');
  server.close(() => process.exit(0));
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

