// ========================================
// extensionBridge.js - جسر بين لوحة منهاج وإضافة MinHaj Focus Pro
//
// يستخدم استراتيجيتين بالتسلسل:
//   1) الاتصال المباشر عبر chrome.runtime.sendMessage(EXTENSION_ID, ...)
//      (يعمل بفضل externally_connectable في manifest.json — وهذا
//       يوقظ Service Worker حتى لو كان Inactive).
//   2) إذا لم يكن chrome.runtime متاحاً (متصفح بدون الإضافة أو ID خاطئ)
//      نرجع لجسر window.postMessage الذي يلتقطه content.js.
// ========================================

var MinhajExtension = (function () {
    // معرّف الإضافة الثابت — يجب أن يطابق ما في chrome://extensions
    var EXTENSION_ID = "ldpapfopgmcgbehnelmkehncmeknebpk";

    console.log("Bridge Initialized with ID: " + EXTENSION_ID);

    var available = false;
    var detectedVia = null; // "direct" أو "postMessage"

    var DEFAULT_BLOCKED = [
        "youtube.com", "facebook.com", "instagram.com", "tiktok.com",
        "x.com", "twitter.com", "reddit.com", "netflix.com"
    ];

    function canSendDirect() {
        return typeof chrome !== "undefined"
            && chrome.runtime
            && typeof chrome.runtime.sendMessage === "function";
    }

    // ----------------------------------------
    // الإرسال: مباشر إذا أمكن، وإلا postMessage
    // ----------------------------------------
    function send(type, payload, callback) {
        var msg = Object.assign({ type: type }, payload || {});

        if (canSendDirect()) {
            try {
                chrome.runtime.sendMessage(EXTENSION_ID, msg, function (resp) {
                    var err = chrome.runtime.lastError;
                    if (err) {
                        console.warn("[MinhajExt] الاتصال المباشر فشل:", err.message);
                        // fallback إلى postMessage عبر content.js
                        sendViaPostMessage(type, payload);
                        if (callback) callback(null, err);
                        return;
                    }
                    if (resp && resp.ok) {
                        available = true;
                        detectedVia = "direct";
                    }
                    if (callback) callback(resp, null);
                });
                return;
            } catch (e) {
                console.warn("[MinhajExt] استثناء عند الاتصال المباشر:", e);
            }
        }

        sendViaPostMessage(type, payload);
        if (callback) callback(null, new Error("no_direct_channel"));
    }

    function sendViaPostMessage(type, payload) {
        var msg = Object.assign({ source: "minhaj-dashboard", type: type }, payload || {});
        try { window.postMessage(msg, "*"); } catch (e) {}
    }

    // ----------------------------------------
    // اكتشاف وجود الإضافة (PING)
    // ----------------------------------------
    function ping() {
        send("MINHAJ_PING", null, function (resp, err) {
            if (resp && resp.ok && resp.alive) {
                available = true;
                document.dispatchEvent(new CustomEvent("minhaj-extension-ready", {
                    detail: { version: resp.version, via: "direct" }
                }));
                console.log("[MinhajExt] الإضافة فعّالة (مباشر) — الإصدار:", resp.version);
            }
        });
    }

    // ----------------------------------------
    // الاستماع لردود postMessage (الجسر القديم)
    // ----------------------------------------
    window.addEventListener("message", function (event) {
        if (event.source !== window) return;
        var data = event.data;
        if (!data || data.source !== "minhaj-extension") return;

        if (data.type === "MINHAJ_EXTENSION_READY") {
            if (!available) {
                available = true;
                detectedVia = "postMessage";
                document.dispatchEvent(new CustomEvent("minhaj-extension-ready", {
                    detail: { via: "postMessage" }
                }));
                console.log("[MinhajExt] الإضافة فعّالة (postMessage)");
            }
        }
        document.dispatchEvent(new CustomEvent("minhaj-extension-message", { detail: data }));
    });

    // ----------------------------------------
    // واجهة الـ Storage الموحّدة (تحميل قائمة المواقع)
    // ----------------------------------------
    function getBlockedSites() {
        var saved = (typeof Storage !== 'undefined' && Storage.load)
            ? Storage.load('blockedSites', null) : null;
        return (Array.isArray(saved) && saved.length) ? saved : DEFAULT_BLOCKED;
    }

    function setBlockedSites(list) {
        if (typeof Storage !== 'undefined' && Storage.save) Storage.save('blockedSites', list);
        send("MINHAJ_SET_BLOCKED_SITES", { blockedSites: list });
    }

    function startFocus(minutes) {
        var sites = getBlockedSites();
        send("MINHAJ_START_FOCUS", { minutes: minutes, blockedSites: sites }, function (resp, err) {
            if (resp && resp.ok) {
                console.log("[MinhajExt] بدأ التركيز لمدة", minutes, "د");
            } else if (err) {
                console.warn("[MinhajExt] لم يصل أمر البدء — تأكّد من تثبيت الإضافة");
            }
        });
    }

    function stopFocus() {
        send("MINHAJ_STOP_FOCUS", null, function (resp) {
            if (resp && resp.ok) console.log("[MinhajExt] أُوقف التركيز");
        });
    }

    function requestState(cb) {
        send("MINHAJ_GET_STATE", null, function (resp) {
            if (cb) cb(resp && resp.state);
        });
    }

    function isAvailable() { return available; }
    function getDetectedVia() { return detectedVia; }
    function getExtensionId() { return EXTENSION_ID; }

    // محاولة اكتشاف الإضافة فور التحميل
    try { ping(); } catch (e) {}

    return {
        startFocus: startFocus,
        stopFocus: stopFocus,
        requestState: requestState,
        getBlockedSites: getBlockedSites,
        setBlockedSites: setBlockedSites,
        isAvailable: isAvailable,
        getDetectedVia: getDetectedVia,
        getExtensionId: getExtensionId,
        DEFAULT_BLOCKED: DEFAULT_BLOCKED
    };
})();
