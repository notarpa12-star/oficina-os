import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const files = new Map([['/', 'index.html'], ['/index.html', 'index.html'], ['/styles.css', 'styles.css']]);
for (const name of ['app', 'store', 'map', 'icons']) files.set(`/src/${name}.js`, `src/${name}.js`);
const types = { '.js':'text/javascript; charset=utf-8', '.html':'text/html; charset=utf-8', '.css':'text/css; charset=utf-8' };
const port = Number(process.env.PORT || 8094);

http.createServer(async (req, res) => {
  const pathname = new URL(req.url, 'http://localhost').pathname;
  const file = files.get(pathname);
  if (!file) {
    res.writeHead(404).end('Arquivo não encontrado');
    return;
  }
  try {
    const content = await fs.readFile(path.join(root, file));
    res.writeHead(200, {'Content-Type': types[path.extname(file)], 'Cache-Control':'no-store'}).end(content);
  } catch {
    res.writeHead(500).end('Erro ao ler o arquivo');
  }
}).listen(port, '127.0.0.1', () => console.log(`Oficina OS: http://127.0.0.1:${port}`));
