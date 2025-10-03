const CACHE_NAME = "habibi-cache-v2";
const urlsToCache = [
  "/",
  "/wildlife",
  "/trips",
  "/tours",
  "/recommendations",
  "/profile",
  "/privacy-policy",
  "/faq",
  "/events",
  "/contacts",
  "/blog",
  "/article",
  "/all-tours",
  "/tours/tour-1",
  "/tours/tour-2",
  "/tours/tour-3",
  "/tours/tour-4",
  "/tours/tour-5",
  "/tours/tour-6",
  "/tours/tour-7",
  "/tours/tour-8",
  "/tours/tour-9",
  "/manifest.json",
  "/style.css",
  "/main.js",
  "/tours/tour-1.js",
  "/tours/tour-2.js",
  "/tours/tour-3.js",
  "/tours/tour-4.js",
  "/tours/tour-5.js",
  "/tours/tour-6.js",
  "/tours/tour-7.js",
  "/tours/tour-8.js",
  "/tours/tour-9.js",
  "/all-tours.js",
  "/faq.js",
  "/home-swiper.js",
  "/logout.js",
  "/tours.js",
  "/notifications-btn.js",
  "/profile.js",
  "/wildlife.js",
  "/favicon.png",
  "/img/logo.png",
  "/img/logo-1.png",
  "/img/firebase-logo.jpg",
  "/img/icon-192.png",
  "/img/icon-512.png",
  "/img/maskable-512.png",
  "/img/pattern.jpg",
  "/img/admin-chat.png",
  "/img/anuradhapura.webp",
  "/img/babbler.webp",
  "/img/bee-eater.webp",
  "/img/blog.webp",
  "/img/burger.png",
  "/img/colombo.webp",
  "/img/colombo2.webp",
  "/img/coucal.webp",
  "/img/dalawella-beach.webp",
  "/img/dambulla.webp",
  "/img/day-trips.png",
  "/img/day-trips.webp",
  "/img/dewata-beach.webp",
  "/img/dove.webp",
  "/img/dragon.webp",
  "/img/eagle.webp",
  "/img/ella.webp",
  "/img/entertainment.png",
  "/img/events.png",
  "/img/events.webp",
  "/img/explore.png",
  "/img/flameback.webp",
  "/img/food.png",
  "/img/fort-galle.webp",
  "/img/frog-rock.webp",
  "/img/galle.webp",
  "/img/galle2.webp",
  "/img/general-chat.png",
  "/img/guests.png",
  "/img/hikkaduwa.webp",
  "/img/jungle-beach.webp",
  "/img/kandy.webp",
  "/img/kingfisher.webp",
  "/img/koel.webp",
  "/img/lizard.webp",
  "/img/login.webp",
  "/img/mangosteen.webp",
  "/img/matale.webp",
  "/img/mirissa.webp",
  "/img/monitor.webp",
  "/img/monkey.webp",
  "/img/munia.webp",
  "/img/myna.webp",
  "/img/notifications.png",
  "/img/notifications-dark.png",
  "/img/nuwaraelliya.webp",
  "/img/nuwaraelliya2.webp",
  "/img/orders.png",
  "/img/orders-list.png",
  "/img/oriole.webp",
  "/img/other.png",
  "/img/pagoda.webp",
  "/img/parrot.webp",
  "/img/peacock.webp",
  "/img/pickme.webp",
  "/img/pidurangala.webp",
  "/img/pigeon.webp",
  "/img/polonnaruwa.webp",
  "/img/polonnaruwa2.webp",
  "/img/profile.png",
  "/img/rambutan.webp",
  "/img/recommendations.png",
  "/img/shops.png",
  "/img/sigiriya.webp",
  "/img/soursop.webp",
  "/img/squirrel.webp",
  "/img/tours.webp",
  "/img/ubereats.webp",
  "/img/unawatuna.webp",
  "/img/unawatuna-beach.webp",
  "/img/white-eye.webp",
  "/img/wildlife.webp",
  "/img/yala.webp",
];

// Установка и кэширование
self.addEventListener("install", event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(async cache => {
      for (const url of urlsToCache) {
        try { await cache.add(url); } 
        catch (err) { console.warn("Не удалось закэшировать:", url, err); }
      }
    })
  );
});

// Активация и очистка старых кэшей
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys => 
      Promise.all(keys.map(key => key !== CACHE_NAME ? caches.delete(key) : null))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      const cachedResponse = await cache.match(event.request);

      const fetchAndCache = fetch(event.request)
        .then(networkResponse => {
          if (event.request.method === "GET") {
            cache.put(event.request, networkResponse.clone());
          }
          return networkResponse;
        })
        .catch(() => cachedResponse);

      // Возвращаем кэш, если есть, иначе ждём fetch
      return cachedResponse || fetchAndCache;
    })()
  );
});

