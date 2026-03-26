import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const root = path.resolve(process.cwd(), 'site');
const port = Number(process.env.PORT || 4173);

const contentTypes = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.svg', 'image/svg+xml'],
  ['.png', 'image/png'],
  ['.jpg', 'image/jpeg'],
  ['.jpeg', 'image/jpeg'],
]);

const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url ?? '/', `http://${request.headers.host}`);
    const requestedPath =
      url.pathname === '/'
        ? '/index.html'
        : url.pathname.endsWith('/')
          ? `${url.pathname}index.html`
          : url.pathname;
    const filePath = path.normalize(path.join(root, requestedPath));

    if (!filePath.startsWith(root)) {
      response.writeHead(403);
      response.end('Forbidden');
      return;
    }

    const content = await readFile(filePath);
    const extension = path.extname(filePath);
    response.writeHead(200, {
      'Content-Type': contentTypes.get(extension) ?? 'application/octet-stream',
    });
    response.end(content);
  } catch {
    response.writeHead(404);
    response.end('Not found');
  }
});

server.listen(port, () => {
  console.log(`Serving ${root} at http://127.0.0.1:${port}`);
});
