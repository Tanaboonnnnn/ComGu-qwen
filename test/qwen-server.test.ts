import http from 'node:http';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { Capabilities } from '../src/shared/types.js';
import { startQwenMcpServer, type QwenMcpEndpoint } from '../src/main/qwen/server.js';

const caps = {
  browse: true, search: true, read: true, metadata: true,
  create: true, edit: true, move: true, deleteFile: true, command: true,
  screen: true, control: true, clipboardRead: true, clipboardWrite: true
} satisfies Capabilities;

function request(urlText: string, method = 'POST', body?: unknown, headers: Record<string, string> = {}): Promise<{ status: number; body: any }> {
  return new Promise((resolve, reject) => {
    const url = new URL(urlText);
    const payload = body === undefined ? '' : JSON.stringify(body);
    const req = http.request({
      hostname: url.hostname,
      port: Number(url.port),
      path: url.pathname,
      method,
      headers: {
        ...(payload ? { 'content-type': 'application/json', accept: 'application/json, text/event-stream', 'content-length': Buffer.byteLength(payload) } : {}),
        ...headers
      }
    }, (res) => {
      const chunks: Buffer[] = [];
      res.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
      res.on('end', () => {
        const text = Buffer.concat(chunks).toString('utf8');
        let parsed: any = text;
        try { parsed = JSON.parse(text); } catch {
          const datas = [...text.matchAll(/^data:\s*(.*)$/gm)].map((m) => m[1] ?? '');
          const last = datas.at(-1);
          if (last !== undefined) { try { parsed = JSON.parse(last); } catch {} }
        }
        resolve({ status: res.statusCode ?? 0, body: parsed });
      });
    });
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

describe('Qwen Streamable HTTP endpoint', () => {
  let endpoint: QwenMcpEndpoint;

  beforeEach(async () => {
    endpoint = await startQwenMcpServer(() => ({
      roots: [], caps: { ...caps }, readOnly: false,
      sessionTools: true, agentTools: true
    }));
  });

  afterEach(async () => {
    await endpoint.stop();
  });

  it('binds to loopback with a secret Qwen path and lists no chat/agent tools', async () => {
    expect(endpoint.url).toMatch(/^http:\/\/127\.0\.0\.1:\d+\/mcp\/qwen\/[A-Za-z0-9_-]+$/);
    const reply = await request(endpoint.url, 'POST', { jsonrpc: '2.0', id: 1, method: 'tools/list', params: {} });
    expect(reply.status).toBe(200);
    const names = reply.body.result.tools.map((tool: any) => tool.name);
    expect(names).toContain('read');
    expect(names).toContain('computer');
    expect(names).toContain('activity');
    expect(names).not.toContain('session');
    expect(names).not.toContain('agents');
  });

  it('rejects an unknown path and oversized declared body', async () => {
    const wrong = await request(`http://127.0.0.1:${endpoint.port}/mcp/qwen/not-the-secret`, 'POST', {});
    expect(wrong.status).toBe(404);

    const large = await request(endpoint.url, 'POST', undefined, { 'content-length': String(8 * 1024 * 1024 + 1) });
    expect(large.status).toBe(413);
  });

  it('does not require legacy SSE GET support', async () => {
    const reply = await request(endpoint.url, 'GET');
    expect(reply.status).toBe(405);
  });
});






