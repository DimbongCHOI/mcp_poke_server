#!/usr/bin/env node

import express from 'express';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import PokemonMCPServer from './server.js';

const PORT = process.env.PORT || 8787;

const app = express();

/**
 * Active SSE sessions keyed by sessionId
 * @type {Map<string, { transport: SSEServerTransport, server: PokemonMCPServer }>}
 */
const sessions = new Map();

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/mcp', async (req, res) => {
  try {
    const transport = new SSEServerTransport('/mcp/message', res);
    const mcpServer = new PokemonMCPServer();

    transport.onclose = () => {
      sessions.delete(transport.sessionId);
    };

    transport.onerror = (error) => {
      console.error('SSE transport error:', error);
    };

    await mcpServer.server.connect(transport);
    sessions.set(transport.sessionId, { transport, server: mcpServer });
    console.log(`🌐 MCP SSE session started: ${transport.sessionId}`);
  } catch (error) {
    console.error('Failed to start MCP SSE session:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to start MCP SSE session.' });
    }
  }
});

app.post('/mcp/message', async (req, res) => {
  try {
    const { sessionId } = req.query;
    if (!sessionId || typeof sessionId !== 'string') {
      return res.status(400).json({ error: 'sessionId query parameter is required.' });
    }

    const session = sessions.get(sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Session not found. Reconnect to /mcp.' });
    }

    await session.transport.handlePostMessage(req, res);
  } catch (error) {
    console.error('Failed to handle MCP message:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to process MCP message.' });
    }
  }
});

const server = app.listen(PORT, () => {
  console.log(`🚀 MCP HTTP server running on port ${PORT}`);
  console.log(`🔌 SSE endpoint: GET http://localhost:${PORT}/mcp`);
  console.log(`📬 Message endpoint: POST http://localhost:${PORT}/mcp/message?sessionId=...`);
});

const shutdown = async () => {
  console.log('\n🛑 Shutting down MCP HTTP server...');
  for (const { transport } of sessions.values()) {
    await transport.close().catch(() => undefined);
  }
  sessions.clear();
  server.close(() => process.exit(0));
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

