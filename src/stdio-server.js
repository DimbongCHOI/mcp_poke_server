#!/usr/bin/env node

import PokemonMCPServer from './server.js';

const server = new PokemonMCPServer();
server.run().catch((error) => {
  console.error('❌ MCP stdio 서버 실행 실패:', error);
  process.exit(1);
});

