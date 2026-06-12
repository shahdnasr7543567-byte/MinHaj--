// ========================================
// service-worker.js - PWA لمنصة منهاج (v1.2.0)
// إستراتيجية: Cache-first للأصول الثابتة + Stale-While-Revalidate للصفحات HTML
// (تجنب التجميد عند توفر الإنترنت بسبب طلب شبكة بطيء)
// ========================================

const CACHE_VERSION = 'minhaj-cache-v1.3.4'; // غيرناها من 1.2.0 لـ 1.3.0
const STATIC_CACHE = 'minhaj-static-' + CACHE_VERSION;
const RUNTIME_CACHE = 'minhaj-runtime-' + CACHE_VERSION;
const CDN_CACHE = 'minhaj-cdn-' + CACHE_VERSION;

// مهلة قصوى للطلبات قبل الرجوع للكاش (بـ ms) — يحلّ مشكلة التجميد عند الانترنت البطيء
const NETWORK_TIMEOUT_MS = 4500;

// الأصول المحلية الأساسية لتشغيل التطبيق بدون انترنت
const PRECACHE_URLS = [
    './',
    './index.html',
    './login.html',
    './main.html',
    './person3.html',
    './friends.html',
    './settings.html',
    './azkar.html',
    './ask.html',
    './manifest.webmanifest',
    './logo.png',
    './opengraph.jpg',
    './adhan.mp3',
    './notification.mp3',
    './audio/mishary_azkar.mp3', // ملف أذكار مشاري الجديد
    './audio/mishary_quran.mp3', // ملف قرآن مشاري الجديد
    './css/dashboard.css',
    './js/utils.js',
    './js/auth.js',
    './js/messages.js',
    './js/mandatoryTasks.js',
    './js/friends.js',
    './js/prayer.js',
    './js/alerts.js',
    './js/dashboard.js',
    './js/extensionBridge.js',
    './js/pwa-register.js',
    './js/adhan.umd.js',
    './audio/success.mp3'
];

// التثبيت: خزّن الأصول الأساسية مسبقاً (مع تجاوز الفشل لأي ملف منفرد)
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(STATIC_CACHE)
            .then((cache) => {
                return Promise.all(
                    PRECACHE_URLS.map((url) =>
                        cache.add(url).catch((err) => {
                            console.warn('[SW] فشل تخزين:', url, err);
                        })
                    )
                );
            })
            .then(() => self.skipWaiting())
    );
});

// التفعيل: امسح الكاش القديم
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.filter((key) => key !== STATIC_CACHE && key !== RUNTIME_CACHE && key !== CDN_CACHE)
                    .map((key) => caches.delete(key))
            );
        }).then(() => self.clients.claim())
    );
});

// مساعد: fetch مع مهلة زمنية لتفادي التجميد عند البطء
function fetchWithTimeout(req, timeoutMs) {
    return new Promise((resolve, reject) => {
        const t = setTimeout(() => reject(new Error('network-timeout')), timeoutMs);
        fetch(req).then((res) => { clearTimeout(t); resolve(res); })
                  .catch((err) => { clearTimeout(t); reject(err); });
    });
}

// مساعد: هل الـ URL من نطاقات CDN معروفة (الخطوط/الأيقونات/Chart.js)
function isExternalCDN(url) {
    return /(cdnjs\.cloudflare\.com|cdn\.jsdelivr\.net|fonts\.googleapis\.com|fonts\.gstatic\.com)$/i.test(url.host)
        || /(cdnjs\.cloudflare\.com|cdn\.jsdelivr\.net|fonts\.googleapis\.com|fonts\.gstatic\.com)/i.test(url.host);
}

// الجلب: استراتيجيات مختلفة حسب نوع الطلب
self.addEventListener('fetch', (event) => {
    const req = event.request;

    // نتجاهل الطلبات غير GET ونتجاهل chrome-extension و موارد الـ devtools
    if (req.method !== 'GET') return;
    if (!req.url.startsWith('http')) return;

    const url = new URL(req.url);

    // نتجاهل الطلبات إلى origin مختلف عدا الـ CDN المعروف (تجنب التداخل مع التحاليل/الإعلانات)
    const sameOrigin = url.origin === self.location.origin;
    const isCDN = !sameOrigin && isExternalCDN(url);

    // CDN: cache-first (أول تحميل من الشبكة، ثم نستخدم النسخة المخزنة) — يجعل الموارد الخارجية متاحة بدون نت بعد أول مرة
    if (isCDN) {
        event.respondWith(
            caches.match(req).then((cached) => {
                if (cached) return cached;
                return fetch(req).then((response) => {
                    const copy = response.clone();
                    caches.open(CDN_CACHE).then((cache) => cache.put(req, copy)).catch(() => {});
                    return response;
                }).catch(() => caches.match(req));
            })
        );
        return;
    }

    // نتجاهل أصول خارجية أخرى تماماً (دع المتصفح يدير شأنها)
    if (!sameOrigin) return;

    // طلبات HTML (التنقّل بين الصفحات): Stale-While-Revalidate مع مهلة
    // الكاش يُعرض فوراً إن وُجد (لا تجميد) + خلفية تحدّث الكاش
    if (req.mode === 'navigate' || (req.headers.get('accept') || '').includes('text/html')) {
        event.respondWith(
            caches.match(req).then((cached) => {
                const networkPromise = fetchWithTimeout(req, NETWORK_TIMEOUT_MS)
                    .then((response) => {
                        if (response && response.ok) {
                            const copy = response.clone();
                            caches.open(RUNTIME_CACHE).then((cache) => cache.put(req, copy)).catch(() => {});
                        }
                        return response;
                    })
                    .catch(() => cached || caches.match('./main.html') || caches.match('./index.html'));
                // إن كان مخزّن: ارجعه فوراً وحدّث في الخلفية
                return cached || networkPromise;
            })
        );
        return;
    }

    // الأصول الثابتة (CSS/JS/صور/صوت): Cache-first
    event.respondWith(
        caches.match(req).then((cached) => {
            if (cached) return cached;
            return fetchWithTimeout(req, NETWORK_TIMEOUT_MS).then((response) => {
                if (response && response.ok) {
                    const copy = response.clone();
                    caches.open(RUNTIME_CACHE).then((cache) => cache.put(req, copy)).catch(() => {});
                }
                return response;
            }).catch(() => {
                return new Response('Offline', { status: 504, statusText: 'Offline' });
            });
        })
    );
});

// رسالة من الصفحة لتخطّي الانتظار وتفعيل الإصدار الجديد فوراً
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    const targetUrl = (event.notification && event.notification.data && event.notification.data.url)
        ? event.notification.data.url
        : './main.html';
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
            for (const client of windowClients) {
                if ('focus' in client && client.url.indexOf(self.location.origin) === 0) {
                    client.navigate(targetUrl);
                    return client.focus();
                }
            }
            if (clients.openWindow) return clients.openWindow(targetUrl);
        })
    );
});
