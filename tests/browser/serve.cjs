const path = require('node:path');
const fs = require('node:fs');
const http = require('node:http');
const esbuild = require('esbuild');
const root = path.resolve(__dirname, '../..');
const files = {
  '@/lib/firebase/auth-context': 'auth.jsx', '@/lib/firebase/config': 'config.js',
  'firebase/auth': 'firebase-auth.js', 'firebase/firestore': 'firestore.js',
  'next/navigation': 'navigation.js', '@capacitor/core': 'capacitor.js', sonner: 'sonner.js',
};
(async () => {
  const bundle = await esbuild.build({
    entryPoints: [path.join(__dirname, 'regressions.jsx')], bundle: true, write: false, format: 'iife', jsx: 'automatic',
    tsconfig: path.join(root, 'apps/web/tsconfig.json'), define: { 'process.env': '{}', 'process.env.NODE_ENV': '"development"' },
    plugins: [{ name: 'fixture-boundaries', setup(build) {
      build.onResolve({ filter: /.*/ }, args => {
        if (args.path === './config' && args.importer.replaceAll('\\', '/').endsWith('/lib/firebase/playlists.ts')) return { path: path.join(__dirname, 'config.js') };
        return files[args.path] ? { path: path.join(__dirname, files[args.path]) } : undefined;
      });
    } }],
  });
  let css = '';
  try {
    const from = path.join(root, 'apps/web/src/app/globals.css');
    css = (await require('postcss')([require('@tailwindcss/postcss')({ base: path.join(root, 'apps/web') })]).process(fs.readFileSync(from, 'utf8'), { from })).css;
  } catch (error) { console.warn('Fixture styles unavailable:', error.message); }
  const server = http.createServer((req, res) => {
    if (req.url === '/bundle.js') { res.setHeader('Content-Type', 'text/javascript'); return res.end(bundle.outputFiles[0].text); }
    if (req.url === '/styles.css') { res.setHeader('Content-Type', 'text/css'); return res.end(css); }
    if (req.url === '/favicon.ico') { res.statusCode = 204; return res.end(); }
    res.setHeader('Content-Type', 'text/html');
    res.end('<!doctype html><html class="dark"><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>Melofy regression fixtures</title><link rel="stylesheet" href="/styles.css"></head><body style="--font-outfit:Arial,sans-serif;font-family:Arial,sans-serif"><div id="results"></div><div id="root" style="height:100dvh;overflow:auto"></div><script src="/bundle.js"></script></body></html>');
  });
  server.listen(4319, '127.0.0.1', () => console.log('Browser fixtures: http://127.0.0.1:4319 (run tests) or /home (interactive discovery)'));
})().catch(error => { console.error(error); process.exitCode = 1; });
