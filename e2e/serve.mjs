// Serves the production build of the site and forwards /api to the backend, like a deployment on one domain.
// Usage: node serve.mjs <dist dir> <port> <backend port>
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const [dist, port, backendPort] = [path.resolve(process.argv[2]), Number(process.argv[3]), Number(process.argv[4])];
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.ico': 'image/x-icon',
  '.svg': 'image/svg+xml', '.json': 'application/json', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.woff2': 'font/woff2' };

http.createServer((req, res) => {
  if (req.url.startsWith('/api/')) {
    const proxied = http.request({ host: '127.0.0.1', port: backendPort, path: req.url, method: req.method, headers: req.headers }, upstream => {
      res.writeHead(upstream.statusCode, upstream.headers);
      upstream.pipe(res);
    });
    proxied.on('error', () => { res.writeHead(502); res.end(); });
    req.pipe(proxied);
    return;
  }
  let file = path.join(dist, decodeURIComponent(req.url.split('?')[0]));
  if (!file.startsWith(dist) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    file = path.join(dist, 'index.html');
  }
  res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
}).listen(port, '127.0.0.1', () => console.log(`serving ${dist} on ${port}, /api -> ${backendPort}`));
