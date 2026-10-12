// Gateway de demonstração: somente arquivos compilados e /api do backend local.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { pipeline } = require('node:stream');

const mime = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.txt': 'text/plain', '.webp': 'image/webp', '.jpg': 'image/jpeg' };
function createGateway(root, backendPort = 8080) {
  const publicRoot = path.resolve(root);
  return http.createServer((req, res) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'same-origin');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Cache-Control', 'no-store');
    const fail = (code, text) => { res.writeHead(code, { 'Content-Type': 'text/plain; charset=utf-8' }); res.end(text); };
    // O CORS local não é ampliado. Só aceitamos Origin do próprio endereço público.
    if (req.headers.origin) {
      let origin;
      try { origin = new URL(req.headers.origin); } catch { return fail(403, 'Origem inválida.'); }
      const protocol = req.headers['x-forwarded-proto'] === 'https' ? 'https:' : 'http:';
      if (origin.host !== req.headers.host || origin.protocol !== protocol) return fail(403, 'Origem não permitida.');
    }
    let pathname;
    try { pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname); } catch { return fail(400, 'URL inválida.'); }
    if (pathname === '/api' || pathname.startsWith('/api/')) {
      const headers = { ...req.headers, host: `127.0.0.1:${backendPort}` };
      // Encaminhamento interno de mesma origem; CSRF e sessão continuam no Spring.
      for (const key of ['origin', 'forwarded', 'x-forwarded-host', 'x-forwarded-proto', 'x-forwarded-for', 'connection', 'proxy-authorization']) delete headers[key];
      const upstream = http.request({ hostname: '127.0.0.1', port: backendPort, method: req.method, path: req.url, headers }, (response) => {
        const output = { ...response.headers, 'cache-control': 'no-store', 'x-content-type-options': 'nosniff', 'x-frame-options': 'DENY' };
        delete output['access-control-allow-origin'];
        delete output['access-control-allow-credentials'];
        if (req.headers['x-forwarded-proto'] === 'https' && output['set-cookie']) {
          output['set-cookie'] = output['set-cookie'].map(cookie => /;\s*secure(?:;|$)/i.test(cookie) ? cookie : `${cookie}; Secure`);
        }
        res.writeHead(response.statusCode, output);
        pipeline(response, res, () => {});
      });
      upstream.setTimeout(30000, () => upstream.destroy(new Error('Timeout')));
      upstream.on('error', () => { if (!res.headersSent) fail(502, 'Backend indisponível.'); else res.destroy(); });
      req.on('aborted', () => upstream.destroy());
      pipeline(req, upstream, () => {});
      return;
    }
    if (!['GET', 'HEAD'].includes(req.method)) return fail(405, 'Método não permitido.');
    if (pathname.includes('\\') || pathname.includes('\0') || pathname.split('/').some(part => part.startsWith('.'))) return fail(404, 'Não encontrado.');
    let target = path.resolve(publicRoot, `.${pathname}`);
    if (!target.startsWith(publicRoot + path.sep) && target !== publicRoot) return fail(404, 'Não encontrado.');
    try {
      if (!fs.statSync(target).isFile()) target = path.join(publicRoot, 'index.html');
    } catch {
      if (path.extname(pathname)) return fail(404, 'Não encontrado.');
      target = path.join(publicRoot, 'index.html');
    }
    if (!fs.existsSync(target)) return fail(503, 'Compile a demonstração primeiro.');
    res.setHeader('Content-Type', mime[path.extname(target)] || 'application/octet-stream');
    if (req.method === 'HEAD') return res.end();
    pipeline(fs.createReadStream(target), res, () => {});
  });
}
if (require.main === module) {
  const server = createGateway(process.argv[2]);
  server.listen(3100, '127.0.0.1', () => console.log('Gateway de demonstração em 127.0.0.1:3100'));
  server.on('error', () => { console.error('Não foi possível abrir o gateway na porta 3100.'); process.exitCode = 1; });
}
module.exports = { createGateway };
