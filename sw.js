// ══════════════════════════════════════════════════════════════
// sw.js — MedRep Pro service worker
// Purpose: make repeat visits fast and keep the app usable on slow or
// missing connections (common for field reps). Only touches:
//   - images (raw uploads + Netlify Image CDN transforms) → cache-first
//   - content JSON (doctors/products/categories)          → network-first
//   - app shell (HTML/JS)                                 → stale-while-revalidate
// Everything else (admin panel, API calls, cross-origin requests) is
// left completely alone — the fetch handler simply returns early and
// lets the browser handle it normally.
// ══════════════════════════════════════════════════════════════

const VERSION = 'v1';
const IMG_CACHE = `medrep-img-${VERSION}`;
const STATIC_CACHE = `medrep-static-${VERSION}`;
const CONTENT_CACHE = `medrep-content-${VERSION}`;
const ALL_CACHES = [IMG_CACHE, STATIC_CACHE, CONTENT_CACHE];

const STATIC_ASSETS = ['/', '/index.html', '/content-loader.js'];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(STATIC_ASSETS).catch(() => {}))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => !ALL_CACHES.includes(k)).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Only handle same-origin GET requests. Everything else (POSTs, OAuth,
  // Git Gateway/GitHub API calls, cross-origin requests) passes straight
  // through untouched.
  if (req.method !== 'GET' || url.origin !== self.location.origin) return;

  // Never intercept the CMS admin panel — Decap CMS needs a live,
  // uncached connection to work correctly.
  if (url.pathname.startsWith('/admin')) return;

  // ── Images: cache-first ─────────────────────────────────────
  // Covers both raw files under /images/ and Netlify Image CDN
  // transform requests under /.netlify/images. Once a slide has been
  // viewed, it loads instantly next time — even with zero signal.
  if (url.pathname.startsWith('/images/') || url.pathname.startsWith('/.netlify/images')) {
    event.respondWith(
      caches.open(IMG_CACHE).then((cache) =>
        cache.match(req).then((cached) => {
          if (cached) return cached;
          return fetch(req)
            .then((res) => {
              if (res.ok) cache.put(req, res.clone());
              return res;
            })
            .catch(() => cached);
        })
      )
    );
    return;
  }

  // ── Content JSON: network-first ─────────────────────────────
  // Edits made in /admin should show up immediately when online. If
  // there's no connection, fall back to the last successfully loaded copy.
  if (url.pathname.startsWith('/content/') && url.pathname.endsWith('.json')) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok) {
            caches.open(CONTENT_CACHE).then((cache) => cache.put(req, res.clone()));
          }
          return res;
        })
        .catch(() => caches.open(CONTENT_CACHE).then((cache) => cache.match(req)))
    );
    return;
  }

  // ── App shell: stale-while-revalidate ───────────────────────
  // Instant load from cache, quietly refreshed in the background so the
  // next visit gets any updates.
  if (url.pathname === '/' || url.pathname.endsWith('.html') || url.pathname.endsWith('.js')) {
    event.respondWith(
      caches.open(STATIC_CACHE).then((cache) =>
        cache.match(req).then((cached) => {
          const fetchPromise = fetch(req)
            .then((res) => {
              if (res.ok) cache.put(req, res.clone());
              return res;
            })
            .catch(() => cached);
          return cached || fetchPromise;
        })
      )
    );
  }
});
