const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 8000;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp'
};

// Caché en memoria para Fruityvice
let cachedFruityviceData = null;
let lastCacheTime = 0;
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutos

async function fetchFruityviceBackend() {
  const now = Date.now();
  if (cachedFruityviceData && (now - lastCacheTime < CACHE_TTL_MS)) {
    return { data: cachedFruityviceData, source: 'backend-cache' };
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);
    const response = await fetch('https://www.fruityvice.com/api/fruit/all', {
      signal: controller.signal,
      headers: { 'Accept': 'application/json' }
    });
    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      if (Array.isArray(data) && data.length > 0) {
        cachedFruityviceData = data;
        lastCacheTime = now;
        return { data, source: 'backend-live' };
      }
    }
  } catch (err) {
    console.warn('[NutriFrutas] Fruityvice no respondió en tiempo, usando respaldo:', err.message);
  }

  if (cachedFruityviceData) {
    return { data: cachedFruityviceData, source: 'backend-cache' };
  }

  return { data: null, source: 'offline' };
}

const server = http.createServer(async (req, res) => {
  // Manejo de CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // Parsear ruta limpia
  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  let pathname = parsedUrl.pathname;

  // Endpoint de salud
  if (pathname === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ status: 'ok', uptime: process.uptime() }));
    return;
  }

  // Endpoint proxy para la API de Fruityvice
  if (pathname === '/api/fruits') {
    const result = await fetchFruityviceBackend();
    if (result.data) {
      res.writeHead(200, {
        'Content-Type': 'application/json; charset=utf-8',
        'X-NutriFrutas-Source': result.source
      });
      res.end(JSON.stringify(result));
    } else {
      res.writeHead(503, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ error: 'Fruityvice API unavailable', source: 'offline' }));
    }
    return;
  }

  // Enrutar a index.html por defecto
  if (pathname === '/' || pathname === '') {
    pathname = '/index.html';
  }

  const safePath = path.normalize(pathname).replace(/^(\.\.[\/\\])+/, '');
  const filePath = path.join(__dirname, safePath);

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('404 - Archivo no encontrado');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    // Cabeceras para desarrollo (evitar caché agresivo de JS/CSS)
    const headers = {
      'Content-Type': contentType,
      'Cache-Control': 'no-cache'
    };

    res.writeHead(200, headers);
    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  });
});

function startServer(port) {
  server.listen(port, '0.0.0.0', () => {
    console.log(`\n======================================================`);
    console.log(` 🍓 NutriFrutas Pro - Servidor Activo Exitosamente`);
    console.log(`======================================================`);
    console.log(` -> URL Principal: http://localhost:${port}`);
    console.log(` -> IP Local:      http://127.0.0.1:${port}`);
    console.log(` -> API Proxy:     http://localhost:${port}/api/fruits`);
    console.log(`======================================================\n`);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.warn(`[Aviso] El puerto ${port} está ocupado. Intentando en el puerto ${port + 1}...`);
      startServer(port + 1);
    } else {
      console.error('[Error de Servidor]', err);
    }
  });
}

startServer(PORT);
