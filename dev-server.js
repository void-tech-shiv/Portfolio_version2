/**
 * LOCAL DEVELOPMENT & TESTING SERVER FOR SHIVANSHU SATYAJEET'S PORTFOLIO
 * 
 * Supports both static frontend serving and Vercel-compatible /api/* serverless handlers.
 * Usage:
 *   node dev-server.js
 *   or:
 *   npm run dev
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

// Load .env if present
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf8');
  content.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const idx = trimmed.indexOf('=');
      if (idx > 0) {
        const key = trimmed.slice(0, idx).trim();
        const val = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, '');
        if (!process.env[key]) process.env[key] = val;
      }
    }
  });
}

const PORT = parseInt(process.env.PORT || '3000', 10);

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.webmanifest': 'application/manifest+json; charset=utf-8'
};

// Route mapping for /api/*
const API_ROUTES = [
  { match: /^\/api\/auth\/login\/?$/, handler: require('./api/auth/login') },
  { match: /^\/api\/auth\/logout\/?$/, handler: require('./api/auth/logout') },
  { match: /^\/api\/auth\/me\/?$/, handler: require('./api/auth/me') },
  { match: /^\/api\/setup\/init\/?$/, handler: require('./api/setup/init') },
  { match: /^\/api\/projects\/?$/, handler: require('./api/projects/index') },
  { match: /^\/api\/projects\/([^/?]+)\/?$/, handler: require('./api/projects/[id]'), paramKey: 'id' },
  { match: /^\/api\/certificates\/?$/, handler: require('./api/certificates/index') },
  { match: /^\/api\/certificates\/([^/?]+)\/?$/, handler: require('./api/certificates/[id]'), paramKey: 'id' },
  { match: /^\/api\/enquiries\/?$/, handler: require('./api/enquiries/index') },
  { match: /^\/api\/enquiries\/([^/?]+)\/?$/, handler: require('./api/enquiries/[id]'), paramKey: 'id' },
  { match: /^\/api\/feedback\/?$/, handler: require('./api/feedback/index') },
  { match: /^\/api\/feedback\/([^/?]+)\/?$/, handler: require('./api/feedback/[id]'), paramKey: 'id' }
];

const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  let pathname = decodeURIComponent(parsedUrl.pathname);

  // 1. API ROUTES
  if (pathname.startsWith('/api/')) {
    let matchedRoute = null;
    let paramVal = null;

    for (const r of API_ROUTES) {
      const m = pathname.match(r.match);
      if (m) {
        matchedRoute = r;
        if (r.paramKey && m[1]) paramVal = m[1];
        break;
      }
    }

    if (!matchedRoute) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'API_ENDPOINT_NOT_FOUND', path: pathname }));
    }

    // Express-like helpers on res
    res.status = function (code) {
      this.statusCode = code;
      return this;
    };
    res.json = function (obj) {
      this.setHeader('Content-Type', 'application/json; charset=utf-8');
      this.end(JSON.stringify(obj));
    };

    req.query = { ...parsedUrl.query };
    if (matchedRoute.paramKey && paramVal) {
      req.query[matchedRoute.paramKey] = paramVal;
    }

    // Parse body for POST/PUT/PATCH
    let rawBody = '';
    req.on('data', chunk => { rawBody += chunk; });
    req.on('end', async () => {
      try {
        req.body = rawBody ? JSON.parse(rawBody) : {};
      } catch (err) {
        req.body = {};
      }

      try {
        await matchedRoute.handler(req, res);
      } catch (handlerErr) {
        console.error('API Error in', pathname, ':', handlerErr);
        if (!res.headersSent) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'INTERNAL_ERROR', message: handlerErr.message }));
        }
      }
    });

    return;
  }

  // 2. STATIC FILES SERVING
  if (pathname === '/' || pathname === '') {
    pathname = '/index.html';
  } else if (pathname === '/admin' || pathname === '/admin/') {
    pathname = '/admin/index.html';
  } else if (pathname === '/skills' || pathname === '/skills/') {
    pathname = '/skills/index.html';
  } else if (pathname === '/experience' || pathname === '/experience/') {
    pathname = '/experience/index.html';
  } else if (pathname === '/projects' || pathname === '/projects/') {
    pathname = '/projects/index.html';
  } else if (pathname === '/certificates' || pathname === '/certificates/') {
    pathname = '/certificates/index.html';
  } else if (pathname === '/contact' || pathname === '/contact/') {
    pathname = '/contact/index.html';
  }

  const filePath = path.join(__dirname, pathname.replace(/^\//, ''));

  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, {
      'Content-Type': MIME_TYPES[ext] || 'application/octet-stream',
      'X-Content-Type-Options': 'nosniff'
    });
    fs.createReadStream(filePath).pipe(res);
  } else {
    // 404 Fallback
    const fallback404 = path.join(__dirname, '404.html');
    if (fs.existsSync(fallback404)) {
      res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
      fs.createReadStream(fallback404).pipe(res);
    } else {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404 Not Found');
    }
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`\n======================================================`);
  console.log(`🚀 SHIVANSHU SATYAJEET PORTFOLIO & API SERVER RUNNING`);
  console.log(`======================================================`);
  console.log(`• Public Portfolio: http://localhost:${PORT}`);
  console.log(`• Owner Dashboard:  http://localhost:${PORT}/admin`);
  console.log(`• Backend APIs:     http://localhost:${PORT}/api/projects`);
  console.log(`• MongoDB Status:   ${process.env.MONGODB_URI ? 'Configured in .env' : 'Not configured yet (Fallback mode)'}`);
  console.log(`======================================================\n`);
});

