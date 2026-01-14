const CACHE_NAME = 'aims-soul-journey-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/home.html',
  '/history.html',
  '/journal.html',
  '/stories.html',
  '/manifest.json',
  '/favicon.ico',
];

// 安裝 Service Worker
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(urlsToCache).catch((err) => {
        console.warn('Cache addAll error:', err);
        // 即使某些資源失敗，仍然繼續
        return Promise.resolve();
      });
    })
  );
  self.skipWaiting();
});

// 激活 Service Worker
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// 攔截請求
self.addEventListener('fetch', (event) => {
  // 只處理 GET 請求
  if (event.request.method !== 'GET') {
    return;
  }

  // 跳過非 HTTP(S) 請求
  if (!event.request.url.startsWith('http')) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((response) => {
      // 如果在緩存中找到，返回緩存版本
      if (response) {
        return response;
      }

      // 否則嘗試從網絡獲取
      return fetch(event.request)
        .then((response) => {
          // 檢查是否是有效的響應
          if (!response || response.status !== 200 || response.type === 'error') {
            return response;
          }

          // 克隆響應以便緩存
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });

          return response;
        })
        .catch(() => {
          // 網絡請求失敗，返回緩存版本或離線頁面
          return caches.match(event.request).then((cachedResponse) => {
            return cachedResponse || new Response('離線模式：無法加載此頁面', {
              status: 503,
              statusText: 'Service Unavailable',
              headers: new Headers({
                'Content-Type': 'text/plain; charset=utf-8',
              }),
            });
          });
        });
    })
  );
});

// 處理消息（用於強制更新）
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
