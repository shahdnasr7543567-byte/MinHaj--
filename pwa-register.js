// ========================================
// pwa-register.js - تسجيل Service Worker وإدارة طلب "تثبيت التطبيق"
// ========================================

(function () {
    if (!('serviceWorker' in navigator)) return;

    // تسجيل الـ service worker بعد تحميل الصفحة لتفادي أيّ تأثير على الأداء
    window.addEventListener('load', function () {
        // نحدد المسار النسبي ليتوافق مع base أيّاً كان
        var swPath = 'service-worker.js';
        navigator.serviceWorker.register(swPath, { scope: './' })
            .then(function (reg) {
                console.log('[PWA] تم تسجيل service worker بنطاق:', reg.scope);

                // عند توفّر إصدار جديد، اطلب التفعيل الفوري
                reg.addEventListener('updatefound', function () {
                    var newWorker = reg.installing;
                    if (!newWorker) return;
                    newWorker.addEventListener('statechange', function () {
                        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            newWorker.postMessage({ type: 'SKIP_WAITING' });
                        }
                    });
                });
            })
            .catch(function (err) {
                console.warn('[PWA] فشل تسجيل service worker:', err);
            });
    });

    // ===== إدارة طلب التثبيت "Add to Home Screen" =====
    var deferredPrompt = null;
    var INSTALL_DISMISSED_KEY = 'minhaj_pwa_install_dismissed';

    window.addEventListener('beforeinstallprompt', function (e) {
        // امنع المتصفح من إظهار الطلب التلقائي حتى نعرض زرنا الخاص
        e.preventDefault();
        deferredPrompt = e;

        if (localStorage.getItem(INSTALL_DISMISSED_KEY) === '1') return;
        showInstallBanner();
    });

    window.addEventListener('appinstalled', function () {
        deferredPrompt = null;
        hideInstallBanner();
        console.log('[PWA] تم تثبيت التطبيق بنجاح');
    });

    function showInstallBanner() {
        if (document.getElementById('pwaInstallBanner')) return;

        var banner = document.createElement('div');
        banner.id = 'pwaInstallBanner';
        banner.innerHTML =
            '<div class="pwa-banner-inner">' +
                '<img src="logo.png" alt="منهاج" class="pwa-banner-icon">' +
                '<div class="pwa-banner-text">' +
                    '<strong>ثبّت منصة منهاج</strong>' +
                    '<span>أضفها لشاشتك الرئيسية لتفتح بسرعة وتعمل بدون انترنت</span>' +
                '</div>' +
                '<div class="pwa-banner-actions">' +
                    '<button id="pwaInstallBtn" class="pwa-btn pwa-btn-primary">تثبيت</button>' +
                    '<button id="pwaDismissBtn" class="pwa-btn pwa-btn-ghost">لاحقاً</button>' +
                '</div>' +
            '</div>';

        var style = document.createElement('style');
        style.textContent =
            '#pwaInstallBanner{position:fixed;bottom:16px;left:16px;right:16px;z-index:9999;' +
                'background:rgba(17,24,39,.96);backdrop-filter:blur(12px);' +
                'border:1px solid rgba(251,191,36,.35);border-radius:18px;' +
                'box-shadow:0 14px 40px rgba(0,0,0,.5);color:#e2e8f0;' +
                'font-family:"Cairo",sans-serif;direction:rtl;text-align:right;' +
                'animation:pwaSlideUp .35s ease-out;}' +
            '@keyframes pwaSlideUp{from{transform:translateY(120%);opacity:0}to{transform:translateY(0);opacity:1}}' +
            '.pwa-banner-inner{display:flex;align-items:center;gap:14px;padding:14px 16px;flex-wrap:wrap}' +
            '.pwa-banner-icon{width:48px;height:48px;border-radius:12px;object-fit:cover;flex-shrink:0;' +
                'background:linear-gradient(135deg,#fbbf24,#f59e0b);padding:4px}' +
            '.pwa-banner-text{flex:1;min-width:170px;display:flex;flex-direction:column;gap:2px}' +
            '.pwa-banner-text strong{color:#fbbf24;font-size:.95rem}' +
            '.pwa-banner-text span{color:#94a3b8;font-size:.8rem}' +
            '.pwa-banner-actions{display:flex;gap:8px;margin-right:auto}' +
            '.pwa-btn{padding:9px 18px;border-radius:12px;border:0;cursor:pointer;' +
                'font-family:inherit;font-weight:600;font-size:.9rem;transition:transform .15s}' +
            '.pwa-btn:hover{transform:translateY(-1px)}' +
            '.pwa-btn-primary{background:linear-gradient(135deg,#fbbf24,#f59e0b);color:#0a0f1e}' +
            '.pwa-btn-ghost{background:transparent;color:#cbd5e1;border:1px solid rgba(255,255,255,.15)}' +
            '@media(max-width:480px){.pwa-banner-actions{margin-right:0;width:100%}' +
                '.pwa-btn{flex:1}}';

        document.head.appendChild(style);
        document.body.appendChild(banner);

        document.getElementById('pwaInstallBtn').addEventListener('click', async function () {
            if (!deferredPrompt) return;
            deferredPrompt.prompt();
            try {
                var choice = await deferredPrompt.userChoice;
                console.log('[PWA] قرار المستخدم:', choice.outcome);
            } catch (e) {}
            deferredPrompt = null;
            hideInstallBanner();
        });

        document.getElementById('pwaDismissBtn').addEventListener('click', function () {
            localStorage.setItem(INSTALL_DISMISSED_KEY, '1');
            hideInstallBanner();
        });
    }

    function hideInstallBanner() {
        var b = document.getElementById('pwaInstallBanner');
        if (b) b.remove();
    }

    // كشف إذا كان التطبيق مثبت أصلاً (يعمل في وضع standalone)
    if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone) {
        console.log('[PWA] التطبيق يعمل كتطبيق مثبّت');
    }
})();
