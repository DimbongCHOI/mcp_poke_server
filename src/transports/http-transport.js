import { JSONRPCMessageSchema } from '@modelcontextprotocol/sdk/types.js';
import getRawBody from 'raw-body';
import contentType from 'content-type';

/**
 * Minimal HTTP transport for single-request handling.
 * Each HTTP request creates a new transport instance.
 */
export class HttpSingleRequestTransport {
  constructor(req, res) {
    this.req = req;
    this.res = res;
  }

  async start() {
    try {
      const ctHeader = this.req.headers['content-type'];
      const ct = ctHeader ? contentType.parse(ctHeader) : { type: 'application/json', parameters: {} };
      const body = await getRawBody(this.req, {
        limit: '4mb',
        encoding: ct.parameters.charset || 'utf-8',
      });
      const json = JSON.parse(body.toString() || '{}');
      const message = JSONRPCMessageSchema.parse(json);
      this.onmessage?.(message);
    } catch (error) {
      this.res.writeHead(400, { 'Content-Type': 'application/json' });
      this.res.end(
        JSON.stringify({
          jsonrpc: '2.0',
          error: {
            code: -32700,
            message: `Invalid JSON-RPC message: ${error}`,
          },
        })
      );
      this.onerror?.(error);
    }
  }

  async send(message) {
    if (this.res.headersSent) return;
    this.res.writeHead(200, { 'Content-Type': 'application/json' });
    this.res.end(JSON.stringify(message));
    await this.close();
  }

  async close() {
    this.onclose?.();
  }
}

