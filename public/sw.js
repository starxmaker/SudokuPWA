const CACHE='sudoku-pwa-v1';
const ASSETS=[ '/', '/index.html', '/manifest.webmanifest', '/src/main.tsx', '/src/index.css' ];

self.addEventListener('install', (e)=>{
  e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', (e)=>{
  e.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (e)=>{
  try{
    const url = new URL(e.request.url);
    if(url.origin !== location.origin) return;

    const accept = e.request.headers.get('accept') || '';
    const dest = e.request.destination || '';

    // For styles/scripts/modules prefer network first to avoid cached HTML being returned with wrong MIME
    if (accept.includes('text/css') || accept.includes('application/javascript') || dest === 'style' || dest === 'script' || url.pathname.endsWith('.css') || url.pathname.endsWith('.js') || url.pathname.endsWith('.ts') || url.pathname.endsWith('.tsx')) {
      e.respondWith(
        fetch(e.request).then(res => {
          // update cache asynchronously
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, copy)).catch(()=>{});
          return res;
        }).catch(()=> caches.match(e.request))
      );
      return;
    }

    // For navigations, try network then fallback to cached index.html
    if (e.request.mode === 'navigate'){
      e.respondWith(fetch(e.request).catch(()=> caches.match('/index.html')));
      return;
    }

    // Default: serve from cache then network
    e.respondWith(caches.match(e.request).then(r=> r || fetch(e.request)));
  }catch(err){
    // fallback to network on unexpected errors
    e.respondWith(fetch(e.request));
  }
});
