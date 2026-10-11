import test, {before, after} from 'node:test';
import assert from 'node:assert/strict';
import {fork} from 'node:child_process';
import {createServer} from 'node:net';
import {request} from 'node:http';
import {mkdtemp, mkdir, readFile, writeFile, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join, dirname, basename, resolve} from 'node:path';
import {once} from 'node:events';

let sandbox, child, origin, token;
const html = '<!doctype html><html lang="en"><title>AGR Studio test fixture</title><body>Local training</body></html>';

async function freePort() {
  const reservation = createServer();
  reservation.listen(0, '127.0.0.1');
  await once(reservation, 'listening');
  const port = reservation.address().port;
  await new Promise((done, reject) => reservation.close(error => error ? reject(error) : done()));
  return port;
}

function post(path, value, headers = {}) {
  return fetch(`${origin}${path}`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json', Origin: origin, 'X-AGR-Token': token, ...headers},
    body: JSON.stringify(value)
  });
}

before(async () => {
  // Copy the actual server into a disposable fixture so developer .env.local
  // files and credentials can never influence the test process.
  sandbox = await mkdtemp(join(tmpdir(), 'agr-studio-server-test-'));
  await mkdir(join(sandbox, 'public'));
  await writeFile(join(sandbox, 'server.mjs'), await readFile(new URL('../server.js', import.meta.url)));
  await writeFile(join(sandbox, 'public', 'index.html'), html);
  await writeFile(join(sandbox, 'public', 'asset.js'), 'export const local = true;');
  const port = await freePort();
  origin = `http://127.0.0.1:${port}`;
  child = fork(join(sandbox, 'server.mjs'), [], {
    cwd: sandbox, silent: true,
    env: {...process.env, PORT: String(port), OPENAI_API_KEY: '', OPENAI_MODEL: 'gpt-4.1-mini', OLLAMA_MODEL: ''}
  });
  await new Promise((done, reject) => {
    let diagnostics = '', output = '';
    const timeout = setTimeout(() => reject(new Error(`Test server did not start: ${diagnostics}`)), 10000);
    child.stderr.on('data', data => {diagnostics = (diagnostics + data.toString()).slice(-1000);});
    child.once('error', error => {clearTimeout(timeout); reject(error);});
    child.once('exit', code => {clearTimeout(timeout); reject(new Error(`Test server exited with ${code}: ${diagnostics}`));});
    child.stdout.on('data', data => {
      output += data.toString();
      if (output.includes('AGR Studio is ready')) {clearTimeout(timeout); done();}
    });
  });
  const status = await fetch(`${origin}/api/status`).then(response => response.json());
  token = status.token;
  assert.equal(status.configured, false);
  assert.equal(status.provider, 'none');
  assert.match(token, /^[a-f0-9]{64}$/);
});

after(async () => {
  if (child && child.exitCode === null && child.signalCode === null) {
    const exited = once(child, 'exit');
    child.kill();
    await exited;
  }
  if (sandbox) {
    // Verify recursive cleanup remains inside the exact temporary-directory
    // namespace created for these tests.
    assert.equal(dirname(resolve(sandbox)), resolve(tmpdir()));
    assert.ok(basename(sandbox).startsWith('agr-studio-server-test-'));
    await rm(sandbox, {recursive: true, force: true});
  }
});

test('server serves HTML, JavaScript and HEAD responses with browser security headers', async () => {
  const response = await fetch(origin);
  assert.equal(response.status, 200);
  assert.match(response.headers.get('content-type'), /^text\/html/);
  assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
  assert.equal(response.headers.get('referrer-policy'), 'no-referrer');
  assert.match(response.headers.get('content-security-policy'), /frame-ancestors 'none'/);
  assert.equal(await response.text(), html);
  const script = await fetch(`${origin}/asset.js`);
  assert.equal(script.status, 200);
  assert.match(script.headers.get('content-type'), /^text\/javascript/);
  assert.equal(await script.text(), 'export const local = true;');
  const head = await fetch(origin, {method: 'HEAD'});
  assert.equal(head.status, 200);
  assert.equal(await head.text(), '');
});

test('server rejects unexpected hosts, including on the public status route', async () => {
  for (const path of ['/', '/api/status']) {
    // Fetch may normalize Host itself; send the wire header explicitly here.
    const response = await new Promise((done, reject) => {
      const req = request(`${origin}${path}`, {headers: {Host: 'untrusted.example'}}, res => {
        let body = '';
        res.setEncoding('utf8');
        res.on('data', chunk => {body += chunk;});
        res.on('end', () => done({status: res.statusCode, body}));
        res.on('error', reject);
      });
      req.on('error', reject);
      req.end();
    });
    assert.equal(response.status, 403);
    assert.match(JSON.parse(response.body).error, /host/i);
  }
});

test('API mutations require both local origin and the current request token', async () => {
  const attempts = [
    {}, {'X-AGR-Token': token}, {Origin: origin},
    {Origin: 'https://untrusted.example', 'X-AGR-Token': token},
    {Origin: origin, 'X-AGR-Token': 'wrong-token'}
  ];
  for (const headers of attempts) {
    const response = await fetch(`${origin}/api/config`, {
      method: 'POST', headers: {'Content-Type': 'application/json', ...headers},
      body: JSON.stringify({provider: 'none'})
    });
    assert.equal(response.status, 403);
  }
  assert.equal((await fetch(`${origin}/api/config`)).status, 403);
  assert.equal((await post('/api/config', {provider: 'none'})).status, 200);
});

test('unconfigured coach fails explicitly without contacting a model', async () => {
  const response = await post('/api/coach', {consent: true, message: 'Help me pace', profile: {}, sessions: []});
  assert.equal(response.status, 503);
  assert.match((await response.json()).error, /connect|settings/i);
});

test('configuration accepts a dummy key without returning it, and invalid consent cannot trigger AI', async () => {
  const dummyKey = 'dummy-test-credential-not-a-real-api-key';
  try {
    const configured = await post('/api/config', {provider: 'openai', key: dummyKey, model: 'gpt-4.1-mini'});
    assert.equal(configured.status, 200);
    const configText = await configured.text();
    assert.equal(configText.includes(dummyKey), false);
    const statusResponse = await fetch(`${origin}/api/status`);
    assert.equal(statusResponse.headers.get('cache-control'), 'no-store');
    const statusText = await statusResponse.text();
    assert.equal(statusText.includes(dummyKey), false);
    const status = JSON.parse(statusText);
    assert.equal(status.configured, true);
    assert.equal(status.provider, 'openai');
    assert.equal(status.model, 'gpt-4.1-mini');
    assert.equal(Object.hasOwn(status, 'key'), false);
    assert.equal(Object.hasOwn(status, 'apiKey'), false);
    const refused = await post('/api/coach', {consent: false, message: 'Do not send this', profile: {}, sessions: []});
    assert.equal(refused.status, 400);
    assert.match((await refused.json()).error, /invalid coaching request/i);
  } finally {
    assert.equal((await post('/api/config', {provider: 'none'})).status, 200);
  }
});

test('invalid provider configuration is rejected without replacing the previous connection', async () => {
  for (const value of [
    {provider: 'unknown'}, {provider: 'openai', model: 'gpt-4.1-mini'},
    {provider: 'openai', key: 'dummy', model: 'invalid model name'},
    {provider: 'ollama', model: '../unsafe'}
  ]) assert.equal((await post('/api/config', value)).status, 400);
  const status = await fetch(`${origin}/api/status`).then(response => response.json());
  assert.equal(status.provider, 'none');
  assert.equal(status.configured, false);
});

test('oversized and malformed JSON requests are rejected before configuration changes', async () => {
  const large = await post('/api/config', {provider: 'none', padding: 'x'.repeat(120500)});
  assert.equal(large.status, 400);
  assert.match((await large.json()).error, /request too large/i);
  const malformed = await fetch(`${origin}/api/config`, {
    method: 'POST', headers: {'Content-Type': 'application/json', Origin: origin, 'X-AGR-Token': token}, body: '{invalid'
  });
  assert.equal(malformed.status, 400);
  assert.equal((await fetch(`${origin}/api/status`).then(response => response.json())).provider, 'none');
});

test('unknown paths, unsupported methods and attempts to reach files outside public are rejected', async () => {
  for (const path of ['/missing.txt', '/server.mjs', '/.env.local']) assert.equal((await fetch(`${origin}${path}`)).status, 404);
  assert.equal((await post('/api/missing', {})).status, 404);
  assert.equal((await fetch(origin, {method: 'POST', body: 'ignored'})).status, 405);
  const traversal = await fetch(`${origin}/%2e%2e%2fserver.mjs`);
  assert.equal(traversal.status, 403);
});
