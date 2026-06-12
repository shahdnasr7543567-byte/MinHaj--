// ========================================
// prayer.js - حساب وعرض مواقيت الصلاة + تشغيل الأذان
// ========================================

var __minhajPrayerCache = null;
var __minhajPrayerCacheDate = null;
var __minhajLastAdhanTime = '';
var __minhajIsAdhanPlaying = false;

// إحداثيات افتراضية (القاهرة) ويمكن للمستخدم تحديثها من الإعدادات
function getCoordinates() {
    var coords = Storage.load('coordinates', null);
    if (coords && typeof coords.latitude === 'number' && typeof coords.longitude === 'number') {
        return coords;
    }
    return { latitude: 30.0444, longitude: 31.2357 };
}

function setCoordinates(lat, lng) {
    Storage.save('coordinates', { latitude: lat, longitude: lng });
    __minhajPrayerCache = null;
    __minhajPrayerCacheDate = null;
}

// حساب مواقيت الصلاة لليوم الحالي
function computePrayerTimes() {
    var today = new Date().toISOString().split('T')[0];
    if (__minhajPrayerCache && __minhajPrayerCacheDate === today) {
        return __minhajPrayerCache;
    }
    if (typeof adhan === 'undefined') {
        return null;
    }
    var c = getCoordinates();
    var coordinates = new adhan.Coordinates(c.latitude, c.longitude);
    var params = adhan.CalculationMethod.Egyptian();
    params.madhab = adhan.Madhab.Shafi;
    var pt = new adhan.PrayerTimes(coordinates, new Date(), params);

    __minhajPrayerCache = pt;
    __minhajPrayerCacheDate = today;
    return pt;
}

function formatPrayerTime(d) {
    if (!d) return '--:--';
    return d.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', hour12: true });
}

function getPrayerData() {
    // مفتاح -> "HH:MM" بصيغة 24 ساعة لمقارنة الوقت
    // ملاحظة: adhan.js و Date يستخدمان توقيت الجهاز فيتأقلمان مع DST تلقائياً.
    var pt = computePrayerTimes();
    var data = { fajr: '', dhuhr: '', asr: '', maghrib: '', isha: '' };
    if (!pt) return data;
    function fmt24(d) {
        return d.getHours().toString().padStart(2, '0') + ':' + d.getMinutes().toString().padStart(2, '0');
    }
    data.fajr = fmt24(pt.fajr);
    data.dhuhr = fmt24(pt.dhuhr);
    data.asr = fmt24(pt.asr);
    data.maghrib = fmt24(pt.maghrib);
    data.isha = fmt24(pt.isha);
    return data;
}

// ====== منع الغش: هل دخل وقت هذه الصلاة فعلاً؟ ======
function isPrayerTimeReached(prayerKey) {
    var data = getPrayerData();
    var t = data[prayerKey];
    if (!t) return true; // لو لم تتوفر المواقيت، لا تحجب
    var parts = t.split(':');
    var ph = parseInt(parts[0], 10);
    var pm = parseInt(parts[1], 10);
    var now = new Date();
    var currentMinutes = now.getHours() * 60 + now.getMinutes();
    var prayerMinutes = ph * 60 + pm;
    return currentMinutes >= prayerMinutes;
}

// إرجاع كائن يصف حالة الصلاة لاستخدامه في الواجهة
function getPrayerStatus(prayerKey) {
    var data = getPrayerData();
    var t = data[prayerKey] || '--:--';
    return {
        time: t,
        reached: isPrayerTimeReached(prayerKey)
    };
}

function getPrayerListForDisplay() {
    var pt = computePrayerTimes();
    if (!pt) return [];
    var nextName = '';
    try { nextName = pt.nextPrayer(); } catch (e) {}
    var nameMap = { fajr: 'الفجر', dhuhr: 'الظهر', asr: 'العصر', maghrib: 'المغرب', isha: 'العشاء' };
    var keys = ['fajr','dhuhr','asr','maghrib','isha'];
    var list = [];
    for (var i = 0; i < keys.length; i++) {
        var k = keys[i];
        list.push({
            key: k,
            name: nameMap[k],
            time: formatPrayerTime(pt[k]),
            active: nextName === k
        });
    }
    return list;
}

function renderPrayerTimes() {
    var container = document.getElementById('prayerTimesList');
    if (!container) return;
    var list = getPrayerListForDisplay();
    if (list.length === 0) {
        container.innerHTML = '<div style="color:#94a3b8;text-align:center;padding:14px;">جاري حساب المواقيت...</div>';
        return;
    }
    var html = '';
    for (var i = 0; i < list.length; i++) {
        var p = list[i];
        html += '<div class="prayer-item ' + (p.active ? 'active' : '') + '">';
        html += '<span><i class="fas fa-clock"></i> ' + p.name + (p.active ? ' (التالية)' : '') + '</span>';
        html += '<span>' + p.time + '</span>';
        html += '</div>';
    }
    container.innerHTML = html;
}

// فحص وقت الصلاة وتشغيل الأذان
function checkPrayerTime(prayerData) {
    var data = prayerData || getPrayerData();
    var now = new Date();
    var currentTime = now.getHours().toString().padStart(2, '0') + ':' +
                      now.getMinutes().toString().padStart(2, '0');
    var mainPrayers = ['fajr','dhuhr','asr','maghrib','isha'];
    var nameMap = { fajr: 'الفجر', dhuhr: 'الظهر', asr: 'العصر', maghrib: 'المغرب', isha: 'العشاء' };
    for (var i = 0; i < mainPrayers.length; i++) {
        var p = mainPrayers[i];
        if (data[p] === currentTime && __minhajLastAdhanTime !== currentTime) {
            __minhajLastAdhanTime = currentTime;
            if (typeof playAdhan === 'function') playAdhan();
            showNotification('🕌 موعد الصلاة', 'حان الآن موعد أذان ' + nameMap[p]);
            __minhajIsAdhanPlaying = true;
        }
    }
}

// طلب الموقع لتحسين دقة المواقيت
function tryDetectLocation() {
    if (!('geolocation' in navigator)) return;
    if (Storage.load('coordinates', null)) return;
    navigator.geolocation.getCurrentPosition(
        function (pos) {
            setCoordinates(pos.coords.latitude, pos.coords.longitude);
            renderPrayerTimes();
        },
        function () { /* تجاهل الفشل */ },
        { timeout: 8000, maximumAge: 3600000 }
    );
}
