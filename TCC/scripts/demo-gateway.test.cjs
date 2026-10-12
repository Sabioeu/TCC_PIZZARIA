const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const http = require('node:http');
const { createGateway } = require('./demo-gateway.cjs');

test('Demonstração: SPA, API, cookies, CSRF, origem e arquivos privados', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'pizza-gateway-'));
  fs.writeFileSync(path.join(root, 'index.html'), '<html>demo</html>');
  fs.writeFileSync(path.join(root, '.env'), 'nao-publicar');
  const backend = http.createServer((req, res) => {
    res.setHeader('Set-Cookie', 'JSESSIONID=teste; Path=/; HttpOnly; SameSite=Lax');
    res.end(JSON.stringify({ url: req.url, csrf: req.headers['x-csrf-token'], cookie: req.headers.cookie, origin: req.headers.origin || null }));
  });
  await new Promise(resolve => backend.listen(0, '127.0.0.1', resolve));
  const gateway = createGateway(root, backend.address().port);
  await new Promise(resolve => gateway.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${gateway.address().port}`;
  try {
    assert.match(await (await fetch(`${base}/login`)).text(), /demo/);
    assert.equal((await fetch(`${base}/.env`)).status, 404);
    assert.equal((await fetch(`${base}/arquivo.map`)).status, 404);
    assert.equal((await fetch(`${base}/api/auth/me`, { headers: { Origin: 'https://malicioso.example' } })).status, 403);
    const response = await fetch(`${base}/api/auth/login`, { method: 'POST', headers: { Origin: base.replace('http:', 'https:'), 'X-Forwarded-Proto': 'https', 'X-CSRF-TOKEN': 'token-teste', Cookie: 'JSESSIONID=teste' }, body: 'dados' });
    assert.match(response.headers.get('set-cookie'), /; Secure/);
    assert.deepEqual(await response.json(), { url: '/api/auth/login', csrf: 'token-teste', cookie: 'JSESSIONID=teste', origin: null });
  } finally {
    gateway.closeAllConnections(); backend.closeAllConnections();
    await Promise.all([new Promise(resolve => gateway.close(resolve)), new Promise(resolve => backend.close(resolve))]);
    fs.rmSync(root, { recursive: true, force: true });
  }
});
