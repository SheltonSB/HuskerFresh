const CACHE_NAME = 'peel-feed-react-v3';
const PRECACHE_URLS = [
    './',
    'index.html',
    'styles.css',
    'dist/app.js',
    'manifest.json',
    'demo-data.json',
    'assets/banana.svg',
    'assets/logo-n.svg',
    'assets/corn-texture.png'
];

const DEMO_DATA = {
    halls: [{
            id: 'nebraska-union',
            name: 'Nebraska Union',
            lat: 40.817405,
            lng: -96.703468,
            status: 'Open',
            open_hours: 'Today · 7:00a — 9:00p',
            pickup_spot: 'North doors near Starbucks',
            pickup_windows: [
                '10:15a - 10:30a · Welcome Desk',
                '12:00p - 12:15p · South Atrium',
                '6:00p - 6:15p · Union Plaza'
            ]
        },
        {
            id: 'abel-sandoz',
            name: 'Abel / Sandoz',
            lat: 40.818961,
            lng: -96.689323,
            status: 'Open',
            open_hours: 'Today · 6:30a — 10:00p',
            pickup_spot: 'South lobby by the elevators',
            pickup_windows: [
                '8:00a - 8:10a · Lobby',
                '1:00p - 1:15p · Dining Host',
                '7:30p - 7:45p · East Entrance'
            ]
        },
        {
            id: 'selleck',
            name: 'Selleck',
            lat: 40.819672,
            lng: -96.701255,
            status: 'Closed · Opens 4:00p',
            open_hours: 'Reopens at 4:00p',
            pickup_spot: 'Courtyard picnic tables',
            pickup_windows: [
                '4:15p - 4:30p · Courtyard',
                '5:45p - 6:00p · Front Desk'
            ]
        },
        {
            id: 'cather',
            name: 'Cather Dining',
            lat: 40.820751,
            lng: -96.705162,
            status: 'Open',
            open_hours: 'Today · 7:00a — 10:00p',
            pickup_spot: 'Academic plaza benches',
            pickup_windows: [
                '9:30a - 9:45a · Plaza',
                '12:30p - 12:45p · Lobby',
                '8:00p - 8:15p · Commons'
            ]
        }
    ],
    metrics: {
        fed_this_week: 142,
        donations_today: 41,
        avg_wait_seconds: 390
    }
};

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
    );
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
        )
    );
    self.clients.claim();
});

self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    if (url.pathname.endsWith('/demo-data.json')) {
        event.respondWith(
            new Response(JSON.stringify(DEMO_DATA), {
                headers: {
                    'Content-Type': 'application/json',
                    'Cache-Control': 'no-store'
                }
            })
        );
        return;
    }

    if (event.request.method !== 'GET') {
        return;
    }

    event.respondWith(
        caches.match(event.request).then((cached) => {
            if (cached) {
                return cached;
            }

            return fetch(event.request)
                .then((response) => {
                    if (!response || response.status !== 200 || response.type !== 'basic') {
                        return response;
                    }
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
                    return response;
                })
                .catch(() => {
                    if (event.request.mode === 'navigate') {
                        return caches.match('index.html');
                    }
                });
        })
    );
});