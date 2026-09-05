import fs from 'node:fs/promises';

const endpointPath = process.argv[2];
if (!endpointPath) throw new Error('Usage: node scripts/smoke-qwen-endpoint.mjs <endpoint.json>');
const endpoint = JSON.parse(await fs.readFile(endpointPath, 'utf8'));
const response = await fetch(endpoint.url, {
  method: 'POST',
  headers: { 'content-type': 'application/json', accept: 'application/json, text/event-stream' },
  body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list', params: {} })
});
const text = await response.text();
const data = text.split(/\r?\n/).filter((line) => line.startsWith('data:')).map((line) => line.slice(5).trimStart()).join('\n') || text;
const parsed = JSON.parse(data);
const names = parsed.result?.tools?.map((tool) => tool.name) ?? [];
const expected = ['read', 'view_image', 'apply_patch', 'exec_command', 'write_stdin', 'observe', 'computer', 'activity'];
if (response.status !== 200) throw new Error(`Expected HTTP 200, got ${response.status}`);
if (JSON.stringify(names) !== JSON.stringify(expected)) throw new Error(`Unexpected tools: ${names.join(',')}`);
console.log(`STATUS=${response.status}`);
console.log(`TOOLS=${names.join(',')}`);
console.log('EXACT=true');
