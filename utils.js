// ========================================
// utils.js - الدوال المساعدة (التاريخ، الساعة، التخزين، الإشعارات)
// ========================================

// 1. الساعة الرقمية
function startClock() {
    var clockElement = document.getElementById('clock');
    if (!clockElement) return;
    function tick() {
        var now = new Date();
        clockElement.innerText = now.toLocaleTimeString('ar-EG', {
            hour: '2-digit', minute: '2-digit', second: '2-digit'
        });
    }
    tick();
    setInterval(tick, 1000);
}

// 2. التاريخ الميلادي
function getGregorianDate() {
    var now = new Date();
    var days = ['الأحد','الإثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت'];
    var months = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];
    return {
        day: days[now.getDay()],
        date: now.getDate() + ' ' + months[now.getMonth()] + ' ' + now.getFullYear(),
        full: days[now.getDay()] + ' ' + now.getDate() + ' ' + months[now.getMonth()] + ' ' + now.getFullYear()
    };
}

// 3. التاريخ الهجري - استخدام Intl إن أمكن، وإلا تقريب يدوي
function getHijriDate() {
    var now = new Date();
    try {
        var formatter = new Intl.DateTimeFormat('ar-SA-u-ca-islamic-umalqura', {
            day: 'numeric', month: 'long', year: 'numeric'
        });
        return { full: formatter.format(now) };
    } catch (e) {
        var hijriYear = Math.floor((now.getFullYear() - 622) * 1.0307);
        var hijriMonths = ['محرم','صفر','ربيع الأول','ربيع الآخر','جمادى الأولى','جمادى الآخرة','رجب','شعبان','رمضان','شوال','ذو القعدة','ذو الحجة'];
        return { full: now.getDate() + ' ' + hijriMonths[now.getMonth()] + ' ' + hijriYear + ' هـ' };
    }
}

// 4. تحديث عرض التاريخ
function updateDateDisplay() {
    var greg = getGregorianDate();
    var hijri = getHijriDate();
    var gregElem = document.getElementById('gregorian-date');
    var hijriElem = document.getElementById('hijri-date');
    var dayElem = document.getElementById('day-name');
    if (gregElem) gregElem.innerText = greg.full;
    if (hijriElem) hijriElem.innerText = hijri.full;
    if (dayElem) dayElem.innerText = greg.day;
}

// 5. التخزين المحلي - نستخدم var لتجنب التعارض مع تكرار التحميل
var Storage = {
    save: function (key, data) {
        try {
            localStorage.setItem('minhaj_' + key, JSON.stringify(data));
            return true;
        } catch (e) { return false; }
    },
    load: function (key, defaultValue) {
        try {
            var data = localStorage.getItem('minhaj_' + key);
            if (data === null || data === undefined) return (defaultValue !== undefined ? defaultValue : null);
            return JSON.parse(data);
        } catch (e) { return (defaultValue !== undefined ? defaultValue : null); }
    },
    remove: function (key) {
        try { localStorage.removeItem('minhaj_' + key); } catch (e) {}
    }
};

// 6. SpeechSynthesis helpers (unlock + robust Arabic fallback)
var __speechUnlocked = false;

function unlockSpeechSynthesisIfNeeded() {
    if (__speechUnlocked) return;
    if (!('speechSynthesis' in window)) return;
    __speechUnlocked = true;
    try {
        var u = new SpeechSynthesisUtterance(' ');
        u.volume = 0;
        u.rate = 1;
        u.pitch = 1;
        // محاولة تهيئة المحرك على أول تفاعل (مهم للجوال)
        window.speechSynthesis.speak(u);
        window.speechSynthesis.cancel();
    } catch (e) {}
}

function getPreferredArabicVoice(lang) {
    if (!('speechSynthesis' in window)) return null;
    var voices = window.speechSynthesis.getVoices() || [];
    if (!voices.length) return null;
    var targetLang = lang || 'ar-SA';
    for (var i = 0; i < voices.length; i++) {
        if ((voices[i].lang || '').toLowerCase() === targetLang.toLowerCase()) return voices[i];
    }
    for (var j = 0; j < voices.length; j++) {
        if ((voices[j].lang || '').toLowerCase().indexOf('ar') === 0) return voices[j];
    }
    return null; // fallback to system default later
}

function speakText(text, opts) {
    if (!('speechSynthesis' in window)) return false;
    opts = opts || {};
    try {
        unlockSpeechSynthesisIfNeeded();
        window.speechSynthesis.cancel();
        
        var u = new SpeechSynthesisUtterance(text || '');
        
        // 1. تحديد اللغة بشكل صارم للعربية
        u.lang = 'ar-EG'; 
        u.rate = typeof opts.rate === 'number' ? opts.rate : 0.8; // بطأنا السرعة شوية للوضوح
        u.pitch = typeof opts.pitch === 'number' ? opts.pitch : 1;

        // 2. محاولة جلب الأصوات المتاحة في المتصفح فوراً
        var voices = window.speechSynthesis.getVoices();
        
        // 3. البحث عن أي صوت يدعم العربية (ar)
        var arabicVoice = voices.find(function(v) { 
            return v.lang.indexOf('ar') !== -1; 
        });

        if (arabicVoice) {
            u.voice = arabicVoice;
        } else {
            // لو ملقاش صوت عربي مخزن، بنجبره يستخدم تعريف اللغة
            u.lang = 'ar-SA'; 
        }

        window.speechSynthesis.speak(u);
        return true;
    } catch (e) {
        console.error("Speech error:", e);
        return false;
    }
}

function stopSpeechSynthesis() {
    if (!('speechSynthesis' in window)) return;
    try { window.speechSynthesis.cancel(); } catch (e) {}
}

// 6. عرض إشعار للمتصفح
function showNotification(title, body, optionsOrTag) {
    if (!('Notification' in window)) return;
    var opts = { body: body, icon: 'logo.png' };
    var tag = null;
    if (typeof optionsOrTag === 'string') {
        tag = optionsOrTag;
    } else if (optionsOrTag && typeof optionsOrTag === 'object') {
        if (optionsOrTag.tag) tag = optionsOrTag.tag;
        if (optionsOrTag.url) opts.data = { url: optionsOrTag.url };
    }
    if (tag) opts.tag = tag;

    function notifyNow() {
        if (!('serviceWorker' in navigator)) {
            try { new Notification(title, opts); } catch (e) {}
            return;
        }
        navigator.serviceWorker.getRegistration().then(function (reg) {
            if (reg && typeof reg.showNotification === 'function') {
                reg.showNotification(title, opts).catch(function () {
                    try { new Notification(title, opts); } catch (e) {}
                });
            } else {
                try { new Notification(title, opts); } catch (e) {}
            }
        }).catch(function () {
            try { new Notification(title, opts); } catch (e) {}
        });
    }

    if (Notification.permission === 'granted') {
        notifyNow();
    } else if (Notification.permission !== 'denied') {
        Notification.requestPermission().then(function (perm) {
            if (perm === 'granted') notifyNow();
        });
    }
}

function requestNotificationPermissionIfNeeded() {
    if (!('Notification' in window)) return;
    if (Notification.permission === 'default') {
        Notification.requestPermission().catch(function () {});
    }
}

// 7. حساب نسبة التقدم
function calculateProgress(completed, total) {
    if (!total || total === 0) return 0;
    return Math.round((completed / total) * 100);
}

// 8. تشغيل عام
function initUtils() {
    startClock();
    updateDateDisplay();
    setInterval(updateDateDisplay, 60000);
    ['click', 'touchstart'].forEach(function (evt) {
        document.addEventListener(evt, unlockSpeechSynthesisIfNeeded, { once: true, passive: true });
    });
    if ('speechSynthesis' in window && typeof window.speechSynthesis.onvoiceschanged !== 'undefined') {
        window.speechSynthesis.onvoiceschanged = function () {
            // تحضير الأصوات مبكراً حتى تكون متاحة عند أول تنبيه
            try { window.speechSynthesis.getVoices(); } catch (e) {}
        };
    }
}
// 9. دوال تشغيل أصوات الأذكار والورد (فصل الملفات الصوتية)
var __currentAudio = null;

function playAzkarSound() {
    stopAllSounds();
    __currentAudio = new Audio('audio/mishary_azkar.mp3'); // ملف الأذكار
    __currentAudio.play().catch(function(e) { console.log("Audio play failed:", e); });
}

function playWirdSound() {
    stopAllSounds();
    __currentAudio = new Audio('audio/mishary_quran.mp3'); // ملف القرآن
    __currentAudio.play().catch(function(e) { console.log("Audio play failed:", e); });
}

function stopAllSounds() {
    stopSpeechSynthesis();
    if (__currentAudio) {
        __currentAudio.pause();
        __currentAudio.currentTime = 0;
        __currentAudio = null;
    }
}
// ========================================
// 10. نظام التايمر المستمر (يظهر في كل الصفحات)
// ========================================

// دالة لرسم التايمر برمجياً في أي صفحة تفتح
function injectFocusTimerUI() {
    if (document.getElementById('focusTimerContainer')) return; // منع التكرار

    var timerHTML = 
        '<div id="focusTimerContainer" style="display:none; text-align:center; padding: 15px; background: rgba(251, 191, 36, 0.15); border-radius: 12px; margin: 15px; border: 1px dotted #fbbf24; backdrop-filter: blur(5px);">' +
            '<h3 id="focusTimerDisplay" style="font-size: 2.8rem; color: #fbbf24; font-family: monospace; margin: 0; text-shadow: 0 0 10px rgba(251,191,36,0.3);">00:00</h3>' +
            '<p style="color: #cbd5e1; font-size: 0.9rem; margin: 5px 0 0 0;">🎯 وضع التركيز نشط الآن..</p>' +
        '</div>';

    // حقن التايمر في أعلى محتوى الصفحة (بعد الـ body مباشرة أو قبل أول عنصر)
    document.body.insertAdjacentHTML('afterbegin', timerHTML);
}


// 1. عرّفي دالة الاحتفال أولاً (خارج أي دالة ثانية)
function celebrateFocusCompletion() {
    var successAudio = new Audio('audio/success.mp3');
    successAudio.play().catch(function(e) { console.log("Audio play blocked: " + e); });

    if (typeof MinhajModal !== 'undefined') {
        MinhajModal.show({
            type: 'success',
            title: '🎉 بطل! أتممت المهمة',
            message: 'ما شاء الله! "سوف نبقى هنا كي يزول الألم".. خلصت وضع التركيز بنجاح.',
            confirmText: 'الحمد لله'
        });
    }
}

// 2. دالة تشغيل التايمر المستمر
function runPersistentFocusTimer() {
    var isFocus = Storage.load('focusMode', false);
    var endTime = Storage.load('focusEndTime', 0);
    var now = Date.now();

    if (!isFocus || now >= endTime) {
        if (isFocus && now >= endTime) {
            Storage.save('focusMode', false);
            Storage.remove('focusEndTime');
        }
        return;
    }

    // استدعاء واجهة التايمر
    if (typeof injectFocusTimerUI === 'function') injectFocusTimerUI();
    
    var container = document.getElementById('focusTimerContainer');
    var display = document.getElementById('focusTimerDisplay');
    if (container) container.style.display = 'block';

    var interval = setInterval(function() {
        var currentTime = Date.now();
        var diff = endTime - currentTime;

        if (diff <= 0) {
            clearInterval(interval);
            if (container) container.style.display = 'none';
            Storage.save('focusMode', false);
            
            // نداء دالة الاحتفال
            celebrateFocusCompletion(); 
            return;
        }

        var m = Math.floor(diff / 60000);
        var s = Math.floor((diff % 60000) / 1000);
        if (display) display.innerText = (m < 10 ? '0' + m : m) + ":" + (s < 10 ? '0' + s : s);
    }, 1000);
}

// 3. تشغيل الفحص عند تحميل الصفحة
window.addEventListener('DOMContentLoaded', runPersistentFocusTimer);