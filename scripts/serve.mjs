import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
const root = process.cwd();
let localEnv = {};
try {
  const source = await readFile(path.join(root, '.env.local'), 'utf8');
  localEnv = Object.fromEntries(source.split(/\r?\n/).map(line => line.trim()).filter(line => line && !line.startsWith('#') && line.includes('=')).map(line => {
    const split = line.indexOf('=');
    const key = line.slice(0, split).trim();
    const value = line.slice(split + 1).trim().replace(/^(['"])(.*)\1$/, '$2');
    return [key, value];
  }));
} catch { /* Local Supabase configuration is optional. */ }
const supabaseUrl = String(process.env.SUPABASE_URL || localEnv.SUPABASE_URL || '').trim().replace(/\/+$/, '');
const supabaseKey = String(process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY || localEnv.SUPABASE_PUBLISHABLE_KEY || localEnv.SUPABASE_ANON_KEY || '').trim();
const port = Number(process.env.PORT || 4173);
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.woff': 'font/woff', '.woff2': 'font/woff2', '.ico': 'image/x-icon', '.pdf': 'application/pdf' };
http.createServer(async (req, res) => {
  try {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    if (pathname === '/site-config.js') {
      const source = `window.SCP_SUPABASE = Object.freeze(${JSON.stringify({ url: supabaseUrl, publishableKey: supabaseKey })});\n`;
      res.writeHead(200, { 'Content-Type': types['.js'], 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
      res.end(source);
      return;
    }
    let file = path.resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
    const relative = path.relative(root, file);
    if (relative.startsWith('..') || path.isAbsolute(relative) || relative.split(path.sep).some(p => p.startsWith('.') || ['qa', 'scripts'].includes(p))) { res.writeHead(403).end('Forbidden'); return; }
    const info = await stat(file);
    if (info.isDirectory()) file = path.join(file, 'index.html');
    else if (!info.isFile()) throw new Error('Not a file');
    res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache', 'X-Content-Type-Options': 'nosniff' });
    res.end(await readFile(file));
  } catch { res.writeHead(404).end('Not found'); }
}).listen(port, '127.0.0.1', () => console.log(`Local: http://127.0.0.1:${port} (Supabase ${supabaseUrl && supabaseKey ? 'configured' : 'fallback active'})`));
