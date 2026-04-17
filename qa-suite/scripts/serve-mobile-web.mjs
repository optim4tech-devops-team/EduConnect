import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';

const rootDir = path.resolve(process.argv[2] ?? '.');
const port = Number(process.argv[3] ?? 4173);
const indexFile = path.join(rootDir, 'index.html');

const CONTENT_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.ttf': 'font/ttf',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

function sendFile(res, filePath) {
  const contentType = CONTENT_TYPES[path.extname(filePath).toLowerCase()] || 'application/octet-stream';
  res.writeHead(200, {
    'Content-Type': contentType,
    'Cache-Control': 'no-cache',
  });
  fs.createReadStream(filePath).pipe(res);
}

const server = http.createServer((req, res) => {
  const requestPath = decodeURIComponent((req.url ?? '/').split('?')[0]);
  const relativePath = requestPath === '/' ? '/index.html' : requestPath;
  const safePath = path.normalize(relativePath).replace(/^(\.\.[/\\])+/, '');
  const filePath = path.join(rootDir, safePath);

  fs.stat(filePath, (error, stats) => {
    if (!error && stats.isFile()) {
      sendFile(res, filePath);
      return;
    }

    fs.stat(indexFile, (indexError, indexStats) => {
      if (indexError || !indexStats.isFile()) {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Not found');
        return;
      }

      sendFile(res, indexFile);
    });
  });
});

server.listen(port, '127.0.0.1', () => {
  console.log(`QA mobile web server listening on http://127.0.0.1:${port}`);
});
