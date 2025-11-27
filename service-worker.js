// PENTING: Tingkatkan versi cache setiap kali anda mengemas kini fail
const CACHE_NAME = 'invoice-pwa-v7';

const urlsToCache = [
    // --- Halaman Utama ---
    '/',
    '/index.html',
    '/styles.css',
    '/main.js',

    // --- Dashboard ---
    '/dashboard.html',
    '/dashboard-styles.css',
    '/dashboard.js',

    // --- Cipta/Edit Invois ---
    '/create-invoice.html',
    '/create-invoice-styles.css',
    '/create-invoice.js',

    // --- Profil Syarikat ---
    '/profile.html',
    '/profile-styles.css',
    '/profile.js',

    // --- Lihat Invois ---
    '/view-invoice.html',
    '/view-invoice-styles.css',
    '/view-invoice.js',

    // --- Pendaftaran ---
    '/register.html',
    '/register-styles.css',
    '/register.js',

    // --- Fail Berkonggan & Konfigurasi ---
    '/firebase.js',
    '/manifest.json',

    // --- Aset (Imej) ---
    '/images/icon-192x192.png',
    '/images/icon-512x512.png',

    // --- Pustaka Luaran (CDN) ---
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css'
];

// Event Install: Caching aset
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Service Worker: Opened cache');
                return cache.addAll(urlsToCache);
            })
    );
});

// Event Fetch: Menyajikan aset dari cache jika tersedia
self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                // Cache hit - return response
                if (response) {
                    return response;
                }
                // Jika tidak ada di cache, lakukan fetch request ke network
                return fetch(event.request).then(
                    response => {
                        // Check if valid response
                        if(!response || response.status !== 200 || response.type !== 'basic') {
                            return response;
                        }
                        // IMPORTANT: Clone the response. A response is a stream
                        // and because we want the browser to consume the response
                        // as well as the cache consuming the response, we need
                        // to clone it so we have two streams.
                        const responseToCache = response.clone();
                        
                        caches.open(CACHE_NAME)
                            .then(cache => {
                                cache.put(event.request, responseToCache);
                            });
                        
                        return response;
                    }
                );
            })
    );
});

// Event Activate: Membersihkan cache lama
self.addEventListener('activate', event => {
    const cacheWhitelist = [CACHE_NAME]; // Hanya cache semasa yang dibenarkan
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    // Jika nama cache lama tidak ada dalam whitelist, hapuskan
                    if (cacheWhitelist.indexOf(cacheName) === -1) {
                        console.log('Service Worker: Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    console.log('Service Worker: Activated');
});