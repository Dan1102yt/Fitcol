// v4: el código propio de la app (html/css/js del mismo origen) pasa de "cache first"
// a "network first". Antes, una vez que el Service Worker cacheaba app.js/cloud-sync.js/
// etc. la primera vez, TODOS los deploys siguientes quedaban invisibles para cualquier
// pestaña que ya los tuviera cacheados — el SW respondía directo desde caché sin
// siquiera intentar la red. Eso hizo que varias rondas de fixes reales "no se vieran"
// en el celular aunque estuvieran bien publicadas. Ahora el código propio siempre
// intenta la red primero (y solo cae a caché si de verdad no hay conexión) — así un
// usuario conectado a internet siempre ve la versión más nueva.
const CACHE_NAME = 'fitcol-v4';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/styles.css',
  '/app.js',
  '/data.js',
  '/restaurant-foods.js',
  '/ai.js',
  '/auth.js',
  '/cloud-sync.js',
  '/food-search.js',
  '/excel-importer.js',
  '/gamification.js',
  '/supabase-config.js',
  '/install-prompt.js',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png'
];

const OFFLINE_HTML = `<!DOCTYPE html>
<html lang="es" data-theme="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="theme-color" content="#1A1A18">
  <title>Fitcol — Sin conexión</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{background:#1A1A18;color:#E5E5E0;font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;text-align:center;padding:24px}
    .logo{font-size:2rem;font-weight:800;letter-spacing:.05em;margin-bottom:8px}
    .logo .fit{color:#E5E5E0}.logo .col{color:#D4A017}
    p{color:#888;font-size:1rem;margin-top:12px;line-height:1.5}
    .icon{font-size:3rem;margin-bottom:16px}
  </style>
</head>
<body>
  <div>
    <div class="icon">🦅</div>
    <div class="logo"><span class="fit">FIT</span><span class="col">COL</span></div>
    <p>Estás sin conexión — pero tu progreso local está seguro.</p>
    <p style="margin-top:8px;font-size:.85rem">Vuelve a conectarte para sincronizar con la nube.</p>
  </div>
</body>
</html>`;

// Install: pre-cache static assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS)).then(() => self.skipWaiting())
  );
});

// Activate: remove old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Fetch: routing strategy
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle GET requests
  if (request.method !== 'GET') return;

  // El código propio de la app (mismo origen, .js/.css/.html/"/") también va por
  // network-first — ver comentario junto a CACHE_NAME más arriba.
  const isOwnCode = url.origin === self.location.origin &&
    (url.pathname.endsWith('.js') || url.pathname.endsWith('.css') || url.pathname.endsWith('.html') || url.pathname === '/');

  // Network First: Supabase, Anthropic Worker, Open Food Facts, y el código propio
  const networkFirst =
    isOwnCode ||
    url.hostname.includes('supabase.co') ||
    url.hostname.includes('workers.dev') ||
    url.hostname.includes('openfoodfacts.org') ||
    url.hostname.includes('anthropic');

  if (networkFirst) {
    event.respondWith(
      fetch(request)
        .then(response => {
          // Actualiza la caché con la versión fresca para que el fallback offline
          // (si algún día no hay conexión) tampoco quede desactualizado por siempre.
          if (response.ok && isOwnCode) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
          }
          return response;
        })
        .catch(() =>
          caches.match(request).then(cached => {
            if (cached) return cached;
            if (request.mode === 'navigate') {
              return new Response(OFFLINE_HTML, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
            }
            return new Response('{}', { headers: { 'Content-Type': 'application/json' } });
          })
        )
    );
    return;
  }

  // Cache First with network fallback para lo que rara vez cambia (íconos, manifest,
  // librerías de CDN con versión fija en la URL)
  event.respondWith(
    caches.match(request).then(cached => {
      if (cached) return cached;
      return fetch(request)
        .then(response => {
          // Cache successful responses for same-origin or CDN assets
          if (response.ok && (url.origin === self.location.origin || url.hostname.includes('cdn.jsdelivr.net') || url.hostname.includes('fonts.g'))) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => {
          // Offline fallback for navigation requests
          if (request.mode === 'navigate') {
            return new Response(OFFLINE_HTML, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
          }
          return new Response('', { status: 503 });
        });
    })
  );
});
