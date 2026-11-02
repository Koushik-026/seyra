import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { root } from '../scripts/paths.mjs';

const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml', '.csv': 'text/csv; charset=utf-8' };
export function createWebServer({ javaPort, token, publicDemo = process.env.PLANNER_PUBLIC_DEMO === '1' }) {
  return http.createServer(async (req, res) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'same-origin');
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'");
    res.setHeader('Cache-Control', 'no-store');
    const url = new URL(req.url, 'http://localhost');
    if(publicDemo && (url.pathname==='/' || (['/student','/print'].includes(url.pathname)&&url.searchParams.get('demo')!=='1'))){
      if(url.pathname==='/')url.pathname='/demo';else url.searchParams.set('demo','1');
      res.writeHead(302,{Location:url.pathname+url.search});return res.end();
    }
    if (url.pathname.startsWith('/api/')) {
      // Compare the browser's origin with this request's host, including HTTPS behind Render.
      let originMatches=true;
      if(req.headers.origin){try{const origin=new URL(req.headers.origin);originMatches=['http:','https:'].includes(origin.protocol)&&origin.host===req.headers.host;}catch{originMatches=false;}}
      if (req.headers['sec-fetch-site'] === 'cross-site' || !originMatches) {
        res.writeHead(403, { 'Content-Type': 'application/json' }); return res.end(JSON.stringify({ error: 'Open Seyra directly in your browser and retry.' }));
      }
      if(publicDemo&&!url.pathname.startsWith('/api/demo/')&&url.pathname!=='/api/health'){
        res.writeHead(403,{'Content-Type':'application/json'});return res.end(JSON.stringify({error:'This hosted site provides the fictional practice workspace only.'}));
      }
      if (!['GET', 'POST', 'PUT', 'DELETE'].includes(req.method)) { res.writeHead(405); return res.end(); }
      const headers = { 'X-Planner-Internal': token, 'Content-Type': 'application/json' };
      if (req.headers['content-length']) headers['Content-Length'] = req.headers['content-length'];
      const proxy = http.request({ hostname: '127.0.0.1', port: javaPort, path: url.pathname + url.search, method: req.method, headers, timeout: 30_000 }, response => {
        res.writeHead(response.statusCode, { 'Content-Type': 'application/json; charset=utf-8' }); response.pipe(res);
      });
      proxy.on('timeout', () => proxy.destroy(new Error('Backend timeout')));
      proxy.on('error', () => { if (!res.headersSent) res.writeHead(503, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ error: 'Java backend is unavailable. Check the application terminal, then retry.' })); });
      let size = 0;
      req.on('data', chunk => { size += chunk.length; if (size > 2_100_000) { proxy.destroy(); req.destroy(); } });
      req.pipe(proxy); return;
    }
    if (req.method !== 'GET') { res.writeHead(405); return res.end(); }
    const routes = { '/': 'index.html', '/demo': 'index.html', '/student': 'student.html', '/print': 'print.html' };
    const relative = routes[url.pathname] ?? url.pathname.slice(1);
    const target = path.resolve(root, 'web', 'public', relative);
    const publicRoot = path.join(root, 'web', 'public') + path.sep;
    if (!target.startsWith(publicRoot)) { res.writeHead(403); return res.end('Forbidden'); }
    try { const contents = await fs.readFile(target); res.writeHead(200, { 'Content-Type': types[path.extname(target)] ?? 'application/octet-stream' }); res.end(contents); }
    catch { res.writeHead(404, { 'Content-Type': 'text/plain' }); res.end('Page not found.'); }
  });
}
