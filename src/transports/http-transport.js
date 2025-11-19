import { JSONRPCMessageSchema } from '@modelcontextprotocol/sdk/types.js';

/**
 * Minimal HTTP transport for single-request handling.
 * Each HTTP request creates a new transport instance.
 */
export class HttpSingleRequestTransport {
  constructor(req, res) {
    this.req = req;
    this.res = res;
    this._started = false;
  }

  async start() {
    if (this._started) {
      throw new Error('Transport already started');
    }
    this._started = true;

    try {
      const message = JSONRPCMessageSchema.parse(this.req.body);
      this.onmessage?.(message);
    } catch (error) {
      this.res.status(400).json({
        jsonrpc: '2.0',
        error: {
          code: -32700,
          message: `Invalid JSON-RPC message: ${error}`,
        },
      });
      this.onerror?.(error);
    }
  }

  async send(message) {
    if (this.res.headersSent) return;
    this.res.json(message);
    await this.close();
  }

  async close() {
    this.onclose?.();
  }
}

