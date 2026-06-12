// ========================================
// alerts.js - تنبيهات الأذان والأذكار + النوافذ المنبثقة المخصصة
// (يدعم تنبيه ١٥ دقيقة قبل الأذان + Modal مخصص بدلاً من alert)
// ========================================

var adhanAudio = new Audio('./adhan.mp3');
var alertAudio = new Audio('./notification.mp3');
var azkarAudio = new Audio('./audio/mishary_azkar.mp3');
var wirdAudio = new Audio('./audio/mishary_quran.mp3');
adhanAudio.loop = false;
alertAudio.loop = false;
azkarAudio.loop = false;
wirdAudio.loop = false;
adhanAudio.preload = 'auto';
alertAudio.preload = 'auto';
azkarAudio.preload = 'auto';
wirdAudio.preload = 'auto';

var __minhajAlertedToday = {};
var __reminderLoopStarted = false;
var __audioUnlockedByUser = false;
var __audioBusy = false;

// ============ حقن CSS الخاص بالنافذة المنبثقة (يجعل alerts.js مكتفياً ذاتياً) ============
// (نحقنه مرة واحدة بسلسلة هوية ثابتة حتى لا يتكرر بين الصفحات أو إعادة التحميل)
(function injectMinhajModalStyles() {
    if (typeof document === 'undefined') return;
    if (document.getElementById('minhaj-modal-styles')) return;
    var css = ''
        + '.minhaj-modal-overlay{position:fixed;inset:0;background:rgba(5,8,18,0.78);'
        + 'backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);display:flex;'
        + 'align-items:center;justify-content:center;z-index:9999;opacity:0;'
        + 'transition:opacity 0.22s ease;padding:1rem;}'
        + '.minhaj-modal-overlay.show{opacity:1;}'
        + '.minhaj-modal{background:linear-gradient(160deg,#111827 0%,#0c1222 100%);'
        + 'border:1px solid rgba(251,191,36,0.35);border-radius:24px;'
        + 'padding:2rem 1.6rem 1.4rem;max-width:460px;width:100%;text-align:center;'
        + 'box-shadow:0 25px 60px rgba(0,0,0,0.55),0 0 30px rgba(251,191,36,0.12);'
        + 'transform:translateY(20px) scale(0.95);opacity:0;'
        + 'transition:all 0.28s cubic-bezier(0.34,1.56,0.64,1);direction:rtl;'
        + 'font-family:"Cairo",sans-serif;}'
        + '.minhaj-modal-overlay.show .minhaj-modal{transform:translateY(0) scale(1);opacity:1;}'
        + '.minhaj-modal-icon{width:78px;height:78px;margin:0 auto 1rem;border-radius:50%;'
        + 'display:flex;align-items:center;justify-content:center;font-size:2.2rem;color:#fbbf24;'
        + 'background:rgba(251,191,36,0.12);border:2px solid rgba(251,191,36,0.4);'
        + 'animation:minhajPulse 1.6s ease-in-out infinite;}'
        + '@keyframes minhajPulse{0%,100%{transform:scale(1);box-shadow:0 0 0 0 rgba(251,191,36,0.5);}'
        + '50%{transform:scale(1.06);box-shadow:0 0 0 16px rgba(251,191,36,0);}}'
        + '.minhaj-modal-title{color:#fbbf24;font-size:1.4rem;margin-bottom:0.7rem;font-weight:800;}'
        + '.minhaj-modal-msg{color:#cbd5e1;font-size:1.05rem;line-height:1.85;margin-bottom:1.4rem;}'
        + '.minhaj-modal-msg strong{color:#fde68a;}'
        + '.minhaj-modal-actions{display:flex;gap:12px;justify-content:center;flex-wrap:wrap;}'
        + '.minhaj-modal-btn{padding:12px 26px;border-radius:14px;border:0;font-family:inherit;'
        + 'font-size:1rem;font-weight:700;cursor:pointer;transition:all 0.25s ease;min-width:120px;}'
        + '.minhaj-modal-btn.confirm{background:linear-gradient(135deg,#fbbf24,#f59e0b);color:#0a0f1e;'
        + 'box-shadow:0 8px 18px rgba(251,191,36,0.3);}'
        + '.minhaj-modal-btn.confirm:hover{transform:translateY(-2px);box-shadow:0 12px 24px rgba(251,191,36,0.45);}'
        + '.minhaj-modal-btn.cancel{background:rgba(148,163,184,0.12);color:#cbd5e1;border:1px solid rgba(148,163,184,0.25);}'
        + '.minhaj-modal-btn.cancel:hover{background:rgba(239,68,68,0.18);color:#fca5a5;border-color:rgba(239,68,68,0.4);}'
        + '.minhaj-modal-success .minhaj-modal-icon{color:#4ade80;background:rgba(74,222,128,0.12);border-color:rgba(74,222,128,0.4);}'
        + '.minhaj-modal-success .minhaj-modal-title{color:#86efac;}'
        + '.minhaj-modal-warning .minhaj-modal-icon{color:#fb923c;background:rgba(251,146,60,0.12);border-color:rgba(251,146,60,0.4);}'
        + '.minhaj-modal-warning .minhaj-modal-title{color:#fdba74;}'
        + '.minhaj-modal-prayer .minhaj-modal-icon{color:#fbbf24;background:rgba(251,191,36,0.18);border-color:rgba(251,191,36,0.5);}'
        + '.minhaj-modal-confirm .minhaj-modal-icon{color:#60a5fa;background:rgba(96,165,250,0.12);border-color:rgba(96,165,250,0.4);}'
        + '.minhaj-modal-confirm .minhaj-modal-title{color:#93c5fd;}'
        + '.minhaj-modal-reminder .minhaj-modal-icon{color:#c084fc;background:rgba(192,132,252,0.12);border-color:rgba(192,132,252,0.4);}'
        + '.minhaj-modal-reminder .minhaj-modal-title{color:#d8b4fe;}'
        // أزرار اختيار مدّة التركيز (preset-durations + custom-duration)
        + '.preset-durations{display:grid;grid-template-columns:repeat(2,1fr);gap:10px;margin:4px 0 14px;}'
        + '@media(min-width:480px){.preset-durations{grid-template-columns:repeat(4,1fr);}}'
        + '.preset-durations .preset-btn{padding:12px 8px;background:rgba(99,102,241,0.15);'
        + 'border:1px solid rgba(99,102,241,0.4);border-radius:12px;color:#c7d2fe;font-family:inherit;'
        + 'font-weight:700;font-size:0.95rem;cursor:pointer;transition:0.2s;}'
        + '.preset-durations .preset-btn:hover{background:rgba(99,102,241,0.35);color:#fff;'
        + 'transform:translateY(-2px);box-shadow:0 6px 14px rgba(99,102,241,0.3);}'
        + '.custom-duration{margin:6px 0 14px;padding:14px;background:rgba(251,191,36,0.06);'
        + 'border:1px dashed rgba(251,191,36,0.35);border-radius:14px;text-align:right;}'
        + '.custom-duration-label{display:block;color:#fde68a;font-size:0.92rem;font-weight:700;margin-bottom:10px;}'
        + '.custom-duration-label i{margin-left:6px;}'
        + '.custom-duration-row{display:flex;gap:8px;align-items:stretch;}'
        + '.custom-duration-row input[type="number"]{flex:1;padding:12px 14px;background:rgba(0,0,0,0.4);'
        + 'border:1px solid rgba(251,191,36,0.4);border-radius:12px;color:#fff;font-family:inherit;'
        + 'font-size:1rem;font-weight:600;text-align:center;direction:ltr;outline:none;transition:0.2s;}'
        + '.custom-duration-row input[type="number"]:focus{border-color:#fbbf24;'
        + 'box-shadow:0 0 0 3px rgba(251,191,36,0.18);background:rgba(0,0,0,0.55);}'
        + '.custom-start-btn{padding:12px 18px;background:linear-gradient(135deg,#fbbf24,#f59e0b);'
        + 'color:#0a0f1e;border:0;border-radius:12px;cursor:pointer;font-family:inherit;'
        + 'font-weight:800;font-size:0.95rem;transition:0.2s;white-space:nowrap;}'
        + '.custom-start-btn:hover{transform:translateY(-2px);box-shadow:0 8px 18px rgba(251,191,36,0.4);}'
        + '.minhaj-modal-msg .preset-durations,.minhaj-modal-msg .custom-duration{text-align:right;}'
        + '@media(max-width:480px){.minhaj-modal{padding:1.5rem 1.2rem 1.2rem;}'
        + '.minhaj-modal-title{font-size:1.2rem;}.minhaj-modal-msg{font-size:0.95rem;}'
        + '.minhaj-modal-icon{width:64px;height:64px;font-size:1.8rem;}}';
    var st = document.createElement('style');
    st.id = 'minhaj-modal-styles';
    st.textContent = css;
    document.head.appendChild(st);
})();

// ============ النافذة المنبثقة المخصصة (MinhajModal) ============
// أنواع: success | warning | info | reminder | confirm
var MinhajModal = (function () {
    var overlay = null;

    function ensureOverlay() {
        if (overlay) return overlay;
        overlay = document.createElement('div');
        overlay.id = 'minhaj-modal-overlay';
        overlay.className = 'minhaj-modal-overlay';
        overlay.style.display = 'none';
        document.body.appendChild(overlay);
        overlay.addEventListener('click', function (e) {
            if (e.target === overlay) hide();
        });
        return overlay;
    }

    function iconFor(type) {
        switch (type) {
            case 'success': return '<i class="fas fa-circle-check"></i>';
            case 'warning': return '<i class="fas fa-triangle-exclamation"></i>';
            case 'reminder': return '<i class="fas fa-bell"></i>';
            case 'prayer': return '<i class="fas fa-mosque"></i>';
            case 'confirm': return '<i class="fas fa-question"></i>';
            default: return '<i class="fas fa-circle-info"></i>';
        }
    }

    function show(opts) {
        opts = opts || {};
        var type = opts.type || 'info';
        var title = opts.title || 'تنبيه';
        var message = opts.message || '';
        var confirmText = opts.confirmText || 'حسناً';
        var cancelText = opts.cancelText || null;
        var onConfirm = opts.onConfirm || null;
        var onCancel = opts.onCancel || null;
        var autoClose = opts.autoClose || 0; // ms

        var ov = ensureOverlay();
        var html = '';
        html += '<div class="minhaj-modal minhaj-modal-' + type + '">';
        html += '  <div class="minhaj-modal-icon">' + iconFor(type) + '</div>';
        html += '  <h3 class="minhaj-modal-title">' + title + '</h3>';
        html += '  <p class="minhaj-modal-msg">' + message + '</p>';
        html += '  <div class="minhaj-modal-actions">';
        if (cancelText) {
            html += '    <button class="minhaj-modal-btn cancel" data-act="cancel">' + cancelText + '</button>';
        }
        html += '    <button class="minhaj-modal-btn confirm" data-act="confirm">' + confirmText + '</button>';
        html += '  </div>';
        html += '</div>';
        ov.innerHTML = html;
        ov.style.display = 'flex';
        // animation trigger
        requestAnimationFrame(function () { ov.classList.add('show'); });

        var modalEl = ov.querySelector('.minhaj-modal');
        var confirmBtn = ov.querySelector('[data-act="confirm"]');
        var cancelBtn = ov.querySelector('[data-act="cancel"]');

        confirmBtn.addEventListener('click', function () {
            hide();
            if (typeof onConfirm === 'function') onConfirm();
        });
        if (cancelBtn) {
            cancelBtn.addEventListener('click', function () {
                hide();
                if (typeof onCancel === 'function') onCancel();
            });
        }
        // إغلاق بـ Esc
        var escHandler = function (e) {
            if (e.key === 'Escape') {
                hide();
                document.removeEventListener('keydown', escHandler);
            }
        };
        document.addEventListener('keydown', escHandler);

        if (autoClose > 0) {
            setTimeout(function () {
                if (ov.style.display !== 'none') hide();
            }, autoClose);
        }
    }

    function hide() {
        if (!overlay) return;
        overlay.classList.remove('show');
        setTimeout(function () { overlay.style.display = 'none'; }, 220);
    }

    return { show: show, hide: hide };
})();

// واجهة مختصرة عامة - تستخدم بديلاً عن alert()
function showMinhajAlert(message, type, title) {
    MinhajModal.show({
        type: type || 'info',
        title: title || 'تنبيه',
        message: message,
        confirmText: 'حسناً',
        autoClose: 4500
    });
}

function showMinhajConfirm(message, onConfirm, onCancel, title) {
    MinhajModal.show({
        type: 'confirm',
        title: title || 'تأكيد',
        message: message,
        confirmText: 'نعم، تأكيد',
        cancelText: 'إلغاء',
        onConfirm: onConfirm,
        onCancel: onCancel
    });
}

// ============ الصوتيات ============
function speak(text) {
    if (typeof speakText === 'function') {
        speakText(text, { lang: 'ar-EG', rate: 0.9, pitch: 1 });
        return;
    }
    if (!('speechSynthesis' in window)) return;
    try {
        window.speechSynthesis.cancel();
        var u = new SpeechSynthesisUtterance(text);
        u.lang = 'ar-EG';
        u.rate = 0.9;
        u.pitch = 1;
        window.speechSynthesis.speak(u);
    } catch (e) { }
}

function playAdhan() {
    stopAllSounds();
    try {
        adhanAudio.volume = 1.0;
        adhanAudio.currentTime = 0;
        var p = adhanAudio.play();
        if (p && typeof p.catch === 'function') p.catch(function () { });
    } catch (e) { }
}

function playAlertSound() {
    if (__audioBusy) return;
    try {
        __audioBusy = true;
        alertAudio.volume = 0.8;
        alertAudio.currentTime = 0;
        var p = alertAudio.play();
        if (p && typeof p.catch === 'function') p.catch(function () { });
    } catch (e) { }
    setTimeout(function () { __audioBusy = false; }, 1200);
}

function playAzkarSound() {
    if (__audioBusy) return;
    try {
        __audioBusy = true;
        azkarAudio.loop = false;
        azkarAudio.volume = 0.95;
        azkarAudio.currentTime = 0;
        var p = azkarAudio.play();
        if (p && typeof p.catch === 'function') p.catch(function () { });
    } catch (e) { }
    setTimeout(function () { __audioBusy = false; }, 1500);
}

function playWirdSound() {
    if (__audioBusy) return;
    try {
        __audioBusy = true;
        wirdAudio.loop = false;
        wirdAudio.volume = 0.95;
        wirdAudio.currentTime = 0;
        var p = wirdAudio.play();
        if (p && typeof p.catch === 'function') p.catch(function () { });
    } catch (e) { }
    setTimeout(function () { __audioBusy = false; }, 1500);
}

function stopAllSounds() {
    try {
        adhanAudio.pause(); adhanAudio.currentTime = 0;
        alertAudio.pause(); alertAudio.currentTime = 0;
        azkarAudio.pause(); azkarAudio.currentTime = 0;
        wirdAudio.pause(); wirdAudio.currentTime = 0;
    } catch (e) { }
    if (typeof stopSpeechSynthesis === 'function') stopSpeechSynthesis();
    else if ('speechSynthesis' in window) { try { window.speechSynthesis.cancel(); } catch (e) { } }
}

function alertKey(name, time) {
    var today = new Date().toISOString().split('T')[0];
    return today + '|' + name + '|' + time;
}

function playedAlertsStoreKey() {
    return 'playedAlertsByDate';
}

function wasTaskAlertPlayed(key) {
    try {
        var today = new Date().toISOString().split('T')[0];
        var store = Storage.load(playedAlertsStoreKey(), {});
        var todayMap = store[today] || {};
        return !!todayMap[key];
    } catch (e) { return false; }
}

function markTaskAlertPlayed(key) {
    try {
        var today = new Date().toISOString().split('T')[0];
        var store = Storage.load(playedAlertsStoreKey(), {});
        // تنظيف الأيام القديمة
        for (var d in store) {
            if (Object.prototype.hasOwnProperty.call(store, d) && d !== today) delete store[d];
        }
        if (!store[today]) store[today] = {};
        store[today][key] = Date.now();
        Storage.save(playedAlertsStoreKey(), store);
    } catch (e) { }
}

function isAzkarPageOpen() {
    try {
        return (window.location.href || '').toLowerCase().indexOf('azkar.html') > -1;
    } catch (e) {
        return false;
    }
}

function isTaskDueNow(taskTime, now) {
    if (!taskTime) return false;
    var date = timeStringToDate(taskTime);
    if (!date) return false;
    var diff = now.getTime() - date.getTime();
    // نافذة سماح قصيرة لمعالجة تباطؤ الخلفية على الجوال/سطح المكتب
    return diff >= 0 && diff <= 120000;
}

function rememberPendingAzkarStart(tab, audioKey, title) {
    try {
        Storage.save('pendingAzkarStart', {
            tab: tab,
            audioKey: audioKey || 'athkar',
            title: title || '',
            ts: Date.now()
        });
    } catch (e) { }
}

function primeAudioOnUserGesture() {
    if (__audioUnlockedByUser) return;
    __audioUnlockedByUser = true;
    try {
        [alertAudio, azkarAudio, wirdAudio].forEach(function (a) {
            a.muted = true;
            var p = a.play();
            if (p && typeof p.then === 'function') {
                p.then(function () {
                    a.pause();
                    a.currentTime = 0;
                    a.muted = false;
                }).catch(function () {
                    a.muted = false;
                });
            } else {
                a.muted = false;
            }
        });
    } catch (e) { }
}

// تحويل "HH:MM" إلى Date اليوم
function timeStringToDate(t) {
    if (!t || typeof t !== 'string') return null;
    var parts = t.split(':');
    var d = new Date();
    d.setHours(parseInt(parts[0], 10) || 0, parseInt(parts[1], 10) || 0, 0, 0);
    return d;
}

function getPreAdhanMinutes() {
    var raw = null;
    try {
        raw = localStorage.getItem('minhaj_pre_adhan_mins');
    } catch (e) { raw = null; }
    var parsed = parseInt(raw, 10);
    if (!isFinite(parsed)) return 15;
    if (parsed < 1) return 1;
    if (parsed > 60) return 60;
    return parsed;
}

// تحويل "HH:MM" إلى Date اليوم وطرح عدد دقائق متغير
function timeMinusUserMins(t) {
    var userMins = getPreAdhanMinutes();
    var d = timeStringToDate(t);
    if (!d) return null;
    d.setMinutes(d.getMinutes() - userMins);
    return d.getHours().toString().padStart(2, '0') + ':' + 
           d.getMinutes().toString().padStart(2, '0');
}

function checkAllReminders() {
    var now = new Date(); // يحترم توقيت الجهاز ويتعامل مع DST تلقائياً
    var currentTime = now.getHours().toString().padStart(2, '0') + ':' +
        now.getMinutes().toString().padStart(2, '0');

    // 1) فحص الصلوات (وقت الأذان فعلاً)
    if (typeof getPrayerData === 'function') {
        var prayerData = getPrayerData();
        var prayers = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];
        var arabic = { fajr: 'الفجر', dhuhr: 'الظهر', asr: 'العصر', maghrib: 'المغرب', isha: 'العشاء' };

        for (var i = 0; i < prayers.length; i++) {
            var p = prayers[i];

           
            var preTime = timeMinusUserMins(prayerData[p]);

if (preTime && isTaskDueNow(preTime, now)) {
    var userMins = getPreAdhanMinutes();
    var preKey = alertKey('pre-prayer-' + p, preTime);
    
    if (!__minhajAlertedToday[preKey]) {
        __minhajAlertedToday[preKey] = true;
        playAlertSound();
        
        // تعديل رسالة الصوت لتنطق الرقم الديناميكي
        speak('تذكير: تبقى ' + userMins + ' دقيقة على أذان ' + arabic[p]);
        
        if (typeof MinhajModal !== 'undefined') {
            MinhajModal.show({
                type: 'reminder',
                title: '⏰ اقترب وقت الصلاة',
                message: 'تبقى <strong>' + userMins + ' دقيقة</strong> على أذان ' + arabic[p] + '.<br>استعد للوضوء وتفرّغ للصلاة.',
                confirmText: 'جزاك الله خيراً',
                autoClose: 9000
            });
        }
        
        if (typeof showNotification === 'function') {
            showNotification('⏰ اقترب وقت الصلاة', 'تبقى ' + userMins + ' دقيقة على أذان ' + arabic[p]);
        }
    }
}

            // ===== ١-ب: وقت الأذان فعلاً =====
            if (isTaskDueNow(prayerData[p], now)) {
                var k = alertKey('prayer-' + p, prayerData[p]);
                if (!__minhajAlertedToday[k]) {
                    __minhajAlertedToday[k] = true;
                    playAdhan();
                    if (typeof MinhajModal !== 'undefined') {
                        MinhajModal.show({
                            type: 'prayer',
                            title: '🕌 حيّ على الصلاة',
                            message: 'حان الآن موعد أذان <strong>' + arabic[p] + '</strong>.<br>اللهم أعنّا على ذكرك وشكرك وحسن عبادتك.',
                            confirmText: 'تقبل الله',
                            autoClose: 15000
                        });
                    }
                    if (typeof showNotification === 'function') {
                        showNotification('🕌 موعد الصلاة', 'حان الآن موعد أذان ' + arabic[p]);
                    }
                }
            }
        }
    }

    // 2) فحص الأذكار والورد من المهام الإجبارية
    var tasks = Storage.load('mandatoryTasks', null);
    if (tasks) {
        var azkarChecks = [
            {
                item: tasks.azkar && tasks.azkar[0],
                title: '✨ موعد : أذكار الصباح',
                body: 'حان الآن موعد قراءة <strong>أذكار الصباح</strong>.<br>لنبدأ ونحصّن يومنا بحفظ الله.',
                type: 'reminder',
                target: 'azkar.html?tab=morning',
                confirmText: '<i class="fas fa-praying-hands"></i> لنبدأ',
                category: 'azkar',
                useAzkarSound: true
            },
            {
                item: tasks.azkar && tasks.azkar[1],
                title: '🌙 موعد : أذكار المساء',
                body: 'حان الآن موعد قراءة <strong>أذكار المساء</strong>.<br>لنبدأ ونحصّن ليلتنا بحفظ الله.',
                type: 'reminder',
                target: 'azkar.html?tab=evening',
                confirmText: '<i class="fas fa-praying-hands"></i> لنبدأ',
                category: 'azkar',
                useAzkarSound: true
            },
            {
                item: tasks.quran && tasks.quran[0],
                title: '📖 موعد : الورد اليومي من القرآن',
                body: 'حان موعد <strong>وردك اليومي من القرآن الكريم</strong>.<br>افتح المصحف واقرأ نصيبك بقلب حاضر.',
                type: 'info',
                target: null,
                confirmText: '<i class="fas fa-quran"></i> لنبدأ',
                useAzkarSound: false,
                category: 'wird'
            }
        ];

        for (var j = 0; j < azkarChecks.length; j++) {
            var c = azkarChecks[j];
            if (c.item && isTaskDueNow(c.item.time, now)) {
                var key = alertKey(c.title, c.item.time);
                if (!__minhajAlertedToday[key] && !wasTaskAlertPlayed(key)) {
                    __minhajAlertedToday[key] = true;
                    markTaskAlertPlayed(key);

                    // تشغيل الصوت الصحيح حسب الفئة
                    if (c.category === 'azkar') {
                        if (isAzkarPageOpen()) continue;
                        playAzkarSound();
                    } else if (c.category === 'wird') {
                        playWirdSound();
                    }

                    if (typeof MinhajModal !== 'undefined') {
                        (function (cc) {
                            MinhajModal.show({
                                type: cc.type,
                                title: cc.title,
                                message: cc.body,
                                confirmText: cc.confirmText,
                                cancelText: 'لاحقاً',
                                onConfirm: function () {
                                    // إيقاف أي صوت آلي متبقي لضمان الهدوء عند الانتقال
                                    if (typeof stopSpeechSynthesis === 'function') stopSpeechSynthesis();
                                else if('speechSynthesis' in window) { try { window.speechSynthesis.cancel(); } catch (e) { } }
                                
                                if(cc.target) {
                                var tab = cc.target.indexOf('tab=evening') > -1 ? 'evening' : 'morning';
                                rememberPendingAzkarStart(tab, 'mishary-azkar', cc.title);
                                window.location.href = cc.target;
                            }
                        },
                            onCancel: function () {
                                if (typeof stopAllSounds === 'function') stopAllSounds();
                            }
                    });
                }) (c);
            }

            // إظهار إشعار النظام (الكروم أو الأندرويد)
            if (typeof showNotification === 'function' && !(c.category === 'azkar' && isAzkarPageOpen())) {
                showNotification(c.title, c.body.replace(/<[^>]+>/g, ''), {
                    tag: 'azkar-' + (c.item && c.item.id ? c.item.id : 'task'),
                    url: c.target || 'main.html'
                });
            }
        }
    }
}
}
// فحص المهام الاختيارية المؤقتة (مع اسم المهمة الشخصي)
var optional = Storage.load('myOptionalTasks', []);
var changed = false;

for (var m = 0; m < optional.length; m++) {
    var t = optional[m];
    if (t.time && isTaskDueNow(t.time, now)) {
        var ok = alertKey('opt-' + t.id, t.time);
        if (!__minhajAlertedToday[ok] && !wasTaskAlertPlayed(ok)) {
            __minhajAlertedToday[ok] = true;
            markTaskAlertPlayed(ok);
            
            // التعديل هنا: نطق التنبيه بالعربية باستخدام الدالة المحسنة
            if (typeof speakText === 'function') {
                speakText('حان الآن موعد: ' + t.text); 
            }

            if (typeof MinhajModal !== 'undefined') {
                (function (taskText, taskId) {
                    MinhajModal.show({
                        type: 'reminder',
                        title: '📝 موعد : ' + taskText,
                        message: 'حان الآن موعد تنفيذ مهمتك:<br><strong>' + taskText + '</strong>',
                        confirmText: '<i class="fas fa-check"></i> تم',
                        cancelText: 'لاحقاً',
                        onConfirm: function () {
                            stopAllSounds();
                            var arr = Storage.load('myOptionalTasks', []);
                            for (var k = 0; k < arr.length; k++) {
                                if (arr[k].id === taskId) { arr[k].completed = true; break; }
                            }
                            Storage.save('myOptionalTasks', arr);
                            if (typeof renderOptionalTasks === 'function') renderOptionalTasks();
                            if (typeof updateProgressBars === 'function') updateProgressBars();
                        },
                        onCancel: function () { stopAllSounds(); }
                    });
                })(t.text, t.id);
            }

            if (typeof showNotification === 'function') {
                showNotification('📝 موعد : ' + t.text, t.text, { tag: 'optional-' + t.id, url: 'main.html' });
            }
            changed = true;
        }
    }
}

if (changed) Storage.save('myOptionalTasks', optional);}
function startReminderLoop() {
    if (__reminderLoopStarted) return;
    __reminderLoopStarted = true;
    if (typeof requestNotificationPermissionIfNeeded === 'function') {
        requestNotificationPermissionIfNeeded();
    }
    ['click', 'touchstart', 'keydown'].forEach(function (evt) {
        document.addEventListener(evt, primeAudioOnUserGesture, { once: true });
    });
    checkAllReminders();
    setInterval(checkAllReminders, 10000); // فحص متكرر أكثر لثبات أعلى
}
// وظيفة لمنع خمول الهاتف أثناء عمل التنبيهات
async function preventSleep() {
    if ('wakeLock' in navigator) {
        try {
            const wakeLock = await navigator.wakeLock.request('screen');
            console.log('تم تفعيل Wake Lock: التنبيهات ستعمل في الخلفية');
        } catch (err) {
            console.warn('Wake Lock غير مدعوم أو فشل التفعيل');
        }
    }
}

// استدعاء الوظيفة عند بدء حلقة التنبيهات
const originalStartLoop = startReminderLoop;
startReminderLoop = function() {
    preventSleep();
    originalStartLoop();
};