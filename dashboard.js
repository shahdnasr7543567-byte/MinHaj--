// v1.4.2 - Custom Input Fix
// ========================================
// dashboard.js - تشغيل اللوحة الرئيسية
// ========================================

var __minhajChart = null;

function renderMandatoryTasks() {
    var tasks = loadMandatoryTasks();
    var container = document.getElementById('mandatoryTasksContainer');
    if (!container) return;

    var prayerNameAr = { fajr:'الفجر', dhuhr:'الظهر', asr:'العصر', maghrib:'المغرب', isha:'العشاء' };

    var html = '';
    function buildSection(title, icon, list, category) {
        html += '<div class="task-category">';
        html += '<h4><i class="' + icon + '"></i> ' + title + '</h4>';
        for (var i = 0; i < list.length; i++) {
            var t = list[i];

            // ===== منع الغش: تأمين الصلوات قبل وقتها =====
            var isLocked = false;
            var prayerTimeStr = '';
            if (category === 'prayers' && typeof getPrayerStatus === 'function') {
                var st = getPrayerStatus(t.id);
                prayerTimeStr = st.time;
                isLocked = !st.reached && !t.completed;
            }

            var classes = 'task-item';
            if (t.completed) classes += ' completed';
            if (isLocked) classes += ' locked';

            html += '<div class="' + classes + '" data-cat="' + category + '" data-id="' + t.id + '"' +
                    (isLocked ? ' data-locked="true"' : '') + '>';
            html += '<div class="task-check ' + (t.completed ? 'checked' : '') + '">' +
                    (isLocked ? '<i class="fas fa-lock"></i>' : '') + '</div>';
            html += '<span class="task-name">' + t.name +
                    (isLocked ? ' <small style="color:#fb923c;">(لم يحن وقتها بعد)</small>' : '') +
                    '</span>';

            if (category === 'prayers' && prayerTimeStr) {
                html += '<span class="task-time">🕐 ' + prayerTimeStr + '</span>';
            } else if (t.time) {
                html += '<span class="task-time">🕐 ' + t.time + '</span>';
            } else if (category !== 'prayers') {
                html += '<span class="task-time warning">⚠️ لم يحدد</span>';
            }
            html += '<span class="task-points">+' + t.points + '</span>';
            html += '</div>';
        }
        html += '</div>';
    }
    buildSection('الصلوات الخمس', 'fas fa-mosque', tasks.prayers, 'prayers');
    buildSection('الأذكار', 'fas fa-praying-hands', tasks.azkar, 'azkar');
    buildSection('الورد اليومي', 'fas fa-quran', tasks.quran, 'quran');
    container.innerHTML = html;

    var items = container.querySelectorAll('.task-item');
    items.forEach(function (el) {
        el.addEventListener('click', function () {
            var cat = el.getAttribute('data-cat');
            var id = el.getAttribute('data-id');

            var result = toggleMandatoryTask(cat, id);
            // result قد يكون كائناً جديداً { allowed, reason } أو boolean من الكود القديم
            if (result && result.allowed === false) {
                if (result.reason === 'time-not-reached') {
                    var nameAr = prayerNameAr[id] || id;
                    if (typeof MinhajModal !== 'undefined') {
                        MinhajModal.show({
                            type: 'warning',
                            title: '⏳ لم يحن الوقت بعد',
                            message: 'لا يمكنك تعليم صلاة <strong>' + nameAr + '</strong> قبل دخول وقتها.<br>اصبر يا حبيب الرحمن، الأجر على قدر النصب.',
                            confirmText: 'فهمت',
                            autoClose: 5000
                        });
                    }
                    return;
                }
            }
            renderMandatoryTasks();
            updateProgressBars();
            renderOptionalTasks();
        });
    });
}

function renderOptionalTasks() {
    var tasks = Storage.load('myOptionalTasks', []);
    var container = document.getElementById('optionalTasksContainer');
    if (!container) return;
    if (tasks.length === 0) {
        container.innerHTML = '<div style="text-align:center;padding:18px;color:#64748b;">📭 لا توجد مهام اختيارية</div>';
        document.getElementById('optional-percent').innerText = '0%';
        document.getElementById('optional-progress-bar').style.width = '0%';
        document.getElementById('optional-stats').innerText = '0/0';
        return;
    }
    var html = '', completed = 0;
    for (var i = 0; i < tasks.length; i++) {
        if (tasks[i].completed) completed++;
        html += '<div class="task-item ' + (tasks[i].completed ? 'completed' : '') + '" data-id="' + tasks[i].id + '">';
        html += '<div class="task-check ' + (tasks[i].completed ? 'checked' : '') + '"></div>';
        html += '<span class="task-name">' + tasks[i].text + '</span>';
        if (tasks[i].time) html += '<span class="task-time">🕐 ' + tasks[i].time + '</span>';
        html += '</div>';
    }
    container.innerHTML = html;
    var pct = Math.round((completed / tasks.length) * 100);
    document.getElementById('optional-percent').innerText = pct + '%';
    document.getElementById('optional-progress-bar').style.width = pct + '%';
    document.getElementById('optional-stats').innerText = completed + '/' + tasks.length;

    var items = container.querySelectorAll('.task-item');
    items.forEach(function (el) {
        el.addEventListener('click', function () {
            var id = parseInt(el.getAttribute('data-id'), 10);
            toggleOptionalTask(id);
        });
    });
}

function toggleOptionalTask(id) {
    var tasks = Storage.load('myOptionalTasks', []);
    for (var i = 0; i < tasks.length; i++) {
        if (tasks[i].id === id) {
            tasks[i].completed = !tasks[i].completed;
            break;
        }
    }
    Storage.save('myOptionalTasks', tasks);
    renderOptionalTasks();
    updateProgressBars();
    if (typeof checkFullCompletion === 'function') checkFullCompletion();
}

function updateProgressBars() {
    var mandatory = getMandatoryProgress();
    var optional = getOptionalProgress();
    var totalCompleted = mandatory.completed + optional.completed;
    var totalAll = mandatory.total + optional.total;
    var totalPercent = totalAll > 0 ? Math.round((totalCompleted / totalAll) * 100) : 0;

    var setBar = function (id, pct) {
        var el = document.getElementById(id);
        if (el) el.style.width = pct + '%';
    };
    var setText = function (id, txt) {
        var el = document.getElementById(id);
        if (el) el.innerText = txt;
    };

    setText('mandatory-percent', mandatory.percentage + '%');
    setBar('mandatory-progress-bar', mandatory.percentage);
    setText('mandatory-stats', mandatory.completed + '/' + mandatory.total);
    setText('mandatory-points', mandatory.earnedPoints);

    setText('optional-percent', optional.percentage + '%');
    setBar('optional-progress-bar', optional.percentage);

    setText('total-percent', totalPercent + '%');
    setBar('total-progress-bar', totalPercent);

    var user = loadCurrentUser();
    setText('streakValue', (user && user.stats && user.stats.streak) ? user.stats.streak : 0);
    setText('pointsValue', mandatory.earnedPoints);

    // حفظ لقطة للأصدقاء
    if (typeof saveProgressSnapshot === 'function') saveProgressSnapshot();

    // اختر رسالة تشجيع/تنبيه حسب النسبة
    var motiv = document.getElementById('motivationText');
    if (motiv && typeof getRandomMessage === 'function') {
        motiv.innerText = totalPercent >= 70 ? getRandomMessage('motivation') : getRandomMessage('warning');
    }
}

function initMarquee() {
    var stream = document.getElementById('quran-stream');
    if (!stream) return;
    var ayahs = [
        '﴿ وَأَقِمِ الصَّلَاةَ لِذِكْرِي ﴾',
        '﴿ إِنَّ الصَّلَاةَ كَانَتْ عَلَى الْمُؤْمِنِينَ كِتَابًا مَّوْقُوتًا ﴾',
        '﴿ وَاسْتَعِينُوا بِالصَّبْرِ وَالصَّلَاةِ ﴾',
        '﴿ حَافِظُوا عَلَى الصَّلَوَاتِ وَالصَّلَاةِ الْوُسْطَىٰ ﴾',
        '﴿ يَا أَيُّهَا الَّذِينَ آمَنُوا اذْكُرُوا اللَّهَ ذِكْرًا كَثِيرًا ﴾'
    ];
    var line = ayahs.join('  ✦  ');
    stream.innerText = line + '   ✦   ' + line;
}

// === حفظ سجلّ يومي للنسبة + النقاط (بنية موحّدة) ===
function persistTodayStats() {
    var stats = Storage.load('dailyStats', {});
    var history = Storage.load('dailyHistory', {}); // إبقاء التوافق مع الإصدار القديم
    var today = new Date().toISOString().split('T')[0];
    var mandatory = getMandatoryProgress();
    var optional = getOptionalProgress();
    var totalAll = mandatory.total + optional.total;
    var totalCompleted = mandatory.completed + optional.completed;
    var todayPct = totalAll > 0 ? Math.round((totalCompleted / totalAll) * 100) : 0;
    var todayPoints = mandatory.earnedPoints || 0;
    stats[today] = { pct: todayPct, points: todayPoints };
    history[today] = todayPct;
    Storage.save('dailyStats', stats);
    Storage.save('dailyHistory', history);
    return { stats: stats, today: today };
}

function getDayStat(stats, dateStr) {
    var rec = stats[dateStr];
    if (!rec) return { pct: 0, points: 0 };
    if (typeof rec === 'number') return { pct: rec, points: 0 }; // توافق قديم
    return { pct: rec.pct || 0, points: rec.points || 0 };
}

function buildDailySeries() {
    var s = persistTodayStats().stats;
    var labels = [], pcts = [], points = [];
    var dayNames = ['الأحد','الإثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت'];
    for (var i = 6; i >= 0; i--) {
        var d = new Date();
        d.setDate(d.getDate() - i);
        var key = d.toISOString().split('T')[0];
        var rec = getDayStat(s, key);
        labels.push(dayNames[d.getDay()]);
        pcts.push(rec.pct);
        points.push(rec.points);
    }
    return { labels: labels, pcts: pcts, points: points };
}

function buildWeeklySeries() {
    var s = persistTodayStats().stats;
    var labels = [], pcts = [], points = [];
    for (var w = 3; w >= 0; w--) {
        var sumPct = 0, sumPts = 0, days = 0;
        for (var i = 0; i < 7; i++) {
            var d = new Date();
            d.setDate(d.getDate() - (w * 7 + i));
            var key = d.toISOString().split('T')[0];
            var rec = getDayStat(s, key);
            sumPct += rec.pct;
            sumPts += rec.points;
            days++;
        }
        labels.push('الأسبوع ' + (4 - w));
        pcts.push(days ? Math.round(sumPct / days) : 0);
        points.push(sumPts);
    }
    return { labels: labels, pcts: pcts, points: points };
}

function buildMonthlySeries() {
    var s = persistTodayStats().stats;
    var monthsAr = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];
    var labels = [], pcts = [], points = [];
    var now = new Date();
    for (var m = 5; m >= 0; m--) {
        var d = new Date(now.getFullYear(), now.getMonth() - m, 1);
        var year = d.getFullYear();
        var month = d.getMonth();
        var sumPct = 0, sumPts = 0, days = 0;
        for (var k in s) {
            if (!Object.prototype.hasOwnProperty.call(s, k)) continue;
            var dt = new Date(k);
            if (dt.getFullYear() === year && dt.getMonth() === month) {
                var rec = getDayStat(s, k);
                sumPct += rec.pct;
                sumPts += rec.points;
                days++;
            }
        }
        labels.push(monthsAr[month]);
        pcts.push(days ? Math.round(sumPct / days) : 0);
        points.push(sumPts);
    }
    return { labels: labels, pcts: pcts, points: points };
}

function buildYearlySeries() {
    var s = persistTodayStats().stats;
    var labels = [], pcts = [], points = [];
    var now = new Date();
    for (var y = 2; y >= 0; y--) {
        var year = now.getFullYear() - y;
        var sumPct = 0, sumPts = 0, days = 0;
        for (var k in s) {
            if (!Object.prototype.hasOwnProperty.call(s, k)) continue;
            var dt = new Date(k);
            if (dt.getFullYear() === year) {
                var rec = getDayStat(s, k);
                sumPct += rec.pct;
                sumPts += rec.points;
                days++;
            }
        }
        labels.push(String(year));
        pcts.push(days ? Math.round(sumPct / days) : 0);
        points.push(sumPts);
    }
    return { labels: labels, pcts: pcts, points: points };
}

function initChart(period) {
    var canvas = document.getElementById('prayerChart');
    if (!canvas || typeof Chart === 'undefined') return;
    var ctx = canvas.getContext('2d');

    var series;
    if (period === 'weekly') series = buildWeeklySeries();
    else if (period === 'monthly') series = buildMonthlySeries();
    else if (period === 'yearly') series = buildYearlySeries();
    else series = buildDailySeries();

    if (__minhajChart) __minhajChart.destroy();
    __minhajChart = new Chart(ctx, {
        data: {
            labels: series.labels,
            datasets: [
                {
                    type: 'line',
                    label: 'نسبة الالتزام %',
                    data: series.pcts,
                    borderColor: '#fbbf24',
                    backgroundColor: 'rgba(251,191,36,0.15)',
                    tension: 0.35,
                    fill: true,
                    pointBackgroundColor: '#fbbf24',
                    pointBorderColor: '#0a0f1e',
                    pointRadius: 4,
                    yAxisID: 'yPct',
                    order: 2
                },
                {
                    type: 'bar',
                    label: 'النقاط ⭐',
                    data: series.points,
                    backgroundColor: 'rgba(34,197,94,0.55)',
                    borderColor: 'rgba(34,197,94,0.9)',
                    borderWidth: 1,
                    borderRadius: 6,
                    yAxisID: 'yPts',
                    order: 1
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            scales: {
                yPct: {
                    type: 'linear',
                    position: 'right',
                    min: 0, max: 100,
                    ticks: { color: '#fbbf24', callback: function (v) { return v + '%'; } },
                    grid: { color: 'rgba(255,255,255,0.06)' },
                    title: { display: true, text: 'نسبة %', color: '#fbbf24' }
                },
                yPts: {
                    type: 'linear',
                    position: 'left',
                    beginAtZero: true,
                    ticks: { color: '#86efac' },
                    grid: { drawOnChartArea: false },
                    title: { display: true, text: 'نقاط', color: '#86efac' }
                },
                x: { ticks: { color: '#cbd5e1' }, grid: { color: 'rgba(255,255,255,0.04)' } }
            },
            plugins: { legend: { labels: { color: '#cbd5e1' } } }
        }
    });
}

function computeWeeklyDaily() {
    return buildDailySeries().pcts;
}

function initTabs() {
    var tabs = document.querySelectorAll('.tab-btn');
    tabs.forEach(function (btn) {
        btn.addEventListener('click', function () {
            tabs.forEach(function (b) { b.classList.remove('active'); });
            btn.classList.add('active');
            initChart(btn.getAttribute('data-period'));
        });
    });
}

function setupNavigation() {
    var items = document.querySelectorAll('.nav-links li[data-page]');
    items.forEach(function (li) {
        li.addEventListener('click', function () {
            var page = li.getAttribute('data-page');
            if (page === 'tasks') window.location.href = 'person3.html';
            else if (page === 'settings') window.location.href = 'settings.html';
            else if (page === 'friends') window.location.href = 'friends.html';
            else if (page === 'azkar') window.location.href = 'azkar.html';
            else if (page === 'ask') window.location.href = 'ask.html';
            else if (page === 'focus') toggleFocusMode();
        });
    });
    var logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function () {
            if (typeof showMinhajConfirm === 'function') {
                showMinhajConfirm('هل أنت متأكد من تسجيل الخروج؟', function () { logout(); }, null, 'تسجيل الخروج');
            } else {
                logout();
            }
        });
    }
    var goTasks = document.getElementById('goToTasksBtn');
    if (goTasks) goTasks.addEventListener('click', function () { window.location.href = 'person3.html'; });

    var menuBtn = document.getElementById('mobileMenuBtn');
    var sidebar = document.getElementById('sidebar');
    if (menuBtn && sidebar) {
        menuBtn.addEventListener('click', function () { sidebar.classList.toggle('open'); });
    }
    var locateBtn = document.getElementById('locateBtn');
    if (locateBtn) {
        locateBtn.addEventListener('click', function () {
            if (!('geolocation' in navigator)) {
                showMinhajAlert('المتصفح لا يدعم تحديد الموقع', 'warning', 'تنبيه');
                return;
            }
            navigator.geolocation.getCurrentPosition(function (pos) {
                setCoordinates(pos.coords.latitude, pos.coords.longitude);
                renderPrayerTimes();
                showMinhajAlert('تم تحديث موقعك بنجاح، وأُعيد حساب مواقيت الصلاة.', 'success', '📍 الموقع');
            }, function () {
                showMinhajAlert('تعذّر تحديد الموقع. تأكد من السماح للمتصفح بالوصول للموقع.', 'warning', 'تنبيه');
            });
        });
    }
}

function toggleFocusMode() {
    var current = Storage.load('focusMode', false);

    if (!current) {
        promptFocusDuration(function (minutes) {
            Storage.save('focusMode', true);
            var durationInMs = minutes * 60000;
            var endTime = Date.now() + durationInMs;
            Storage.save('focusEndTime', endTime);

            // تشغيل التايمر بصرياً
            const timerContainer = document.getElementById('focusTimerContainer');
            const timerDisplay = document.getElementById('focusTimerDisplay');
            
            if (timerContainer) timerContainer.style.display = 'block';

            // عداد الثواني
            const timerInterval = setInterval(function() {
                const now = Date.now();
                const diff = endTime - now;

                if (diff <= 0) {
                    clearInterval(timerInterval);
                    if (timerContainer) timerContainer.style.display = 'none';
                    Storage.save('focusMode', false);
                    
                    // نداء دالة الاحتفال اللي حطيناها في آخر الملف
                    if (typeof celebrateFocusCompletion === 'function') {
                        celebrateFocusCompletion();
                    }
                    return;
                }

                const m = Math.floor(diff / 60000);
                const s = Math.floor((diff % 60000) / 1000);
                if (timerDisplay) {
                    timerDisplay.innerText = (m < 10 ? '0' + m : m) + ":" + (s < 10 ? '0' + s : s);
                }
            }, 1000);

            // تفعيل حجب الإضافة
            if (typeof MinhajExtension !== 'undefined') MinhajExtension.startFocus(minutes);
        });
    } else {
        // إيقاف يدوي
        Storage.save('focusMode', false);
        Storage.remove('focusEndTime');
        if (document.getElementById('focusTimerContainer')) {
            document.getElementById('focusTimerContainer').style.display = 'none';
        }
        if (typeof MinhajExtension !== 'undefined') MinhajExtension.stopFocus();
        showMinhajAlert('تم إيقاف وضع التركيز.', 'info', 'وضع التركيز');
    }
}
// ========================================
// promptFocusDuration v1.4.2 - مكتوبة من جديد كاملاً
// تستعمل MinhajModal وتحتوي على أزرار جاهزة + حقل إدخال مخصّص
// ========================================
function promptFocusDuration(onConfirm) {
    // محتوى الـ Modal: قسم أزرار جاهزة + قسم إدخال مخصّص
    var bodyHtml =
        '<div class="preset-durations">' +
            '<button type="button" class="preset-btn" data-min="15">15 دقيقة</button>' +
            '<button type="button" class="preset-btn" data-min="25">25 دقيقة</button>' +
            '<button type="button" class="preset-btn" data-min="45">45 دقيقة</button>' +
            '<button type="button" class="preset-btn" data-min="60">60 دقيقة</button>' +
        '</div>' +
        '<div class="custom-duration">' +
            '<label for="customFocusMin" class="custom-duration-label">' +
                '<i class="fas fa-pen-to-square"></i> أو أدخل مدة مخصّصة:' +
            '</label>' +
            '<div class="custom-duration-row">' +
                '<input type="number" id="customFocusMin" min="1" max="480" step="1" placeholder="دقائق مخصصة" inputmode="numeric">' +
                '<button type="button" id="customStartBtn" class="custom-start-btn">' +
                    '<i class="fas fa-play"></i> ابدأ' +
                '</button>' +
            '</div>' +
        '</div>';

    // افتح Modal باستعمال MinhajModal الموحّد
    // ملاحظة: MinhajModal يعرض دائماً زر تأكيد، نستعمله كزر "إغلاق"
    MinhajModal.show({
        type: 'info',
        title: '🎯 وضع التركيز',
        message: 'اختر مدة جاهزة أو أدخل عدد دقائق مخصّص:<br><br>' + bodyHtml,
        confirmText: 'إغلاق'
    });

    // ربط الأحداث بعد ما يدخل الـ Modal للـ DOM
    setTimeout(function () {
        // أزرار المدد الجاهزة
        var presetBtns = document.querySelectorAll('.preset-durations .preset-btn');
        presetBtns.forEach(function (b) {
            b.addEventListener('click', function () {
                var m = parseInt(b.getAttribute('data-min'), 10);
                confirmFocus(m, onConfirm);
            });
        });

        // زر "ابدأ" للإدخال المخصّص
        var startBtn = document.getElementById('customStartBtn');
        if (startBtn) {
            startBtn.addEventListener('click', function () {
                var val = parseInt(document.getElementById('customFocusMin').value, 10);
                confirmFocus(val, onConfirm);
            });
        }

        // مفتاح Enter داخل حقل الإدخال
        var inp = document.getElementById('customFocusMin');
        if (inp) {
            inp.addEventListener('keydown', function (e) {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    var val = parseInt(inp.value, 10);
                    confirmFocus(val, onConfirm);
                }
            });
            inp.focus();
        }
    }, 60);
}

// ========================================
// confirmFocus v1.4.2 - يأخذ القيمة من زر أو من الحقل
// مع تحقّق من صحّة الإدخال
// ========================================
function confirmFocus(minutes, onConfirm) {
    // التحقّق من القيمة (تطلّبها المستخدم بالحرف)
    if (!minutes || minutes < 1) {
        showMinhajModal('خطأ', 'الرجاء إدخال مدة صحيحة', 'error');
        return;
    }
    if (minutes > 480) {
        showMinhajModal('خطأ', 'الحد الأقصى لمدة التركيز هو 480 دقيقة (8 ساعات).', 'error');
        return;
    }

    // أغلق أي Modal مفتوح (MinhajModal يستعمل hide وليس close)
    if (typeof MinhajModal !== 'undefined' && typeof MinhajModal.hide === 'function') {
        MinhajModal.hide();
    } else {
        document.querySelectorAll('.minhaj-modal-overlay').forEach(function (o) {
            o.classList.remove('show');
            setTimeout(function () {
                if (o.parentNode && o.id !== 'minhaj-modal-overlay') o.parentNode.removeChild(o);
                else if (o.style) o.style.display = 'none';
            }, 220);
        });
    }

    // نفّذ الـ callback اللي مرّرته الواجهة
    if (typeof onConfirm === 'function') onConfirm(minutes);
}

// Helper بسيط لو كانت الواجهة تستعمل showMinhajModal بدل MinhajModal.show
function showMinhajModal(title, message, type) {
    if (typeof MinhajModal !== 'undefined' && MinhajModal.show) {
        var t = type || 'info';
        if (t === 'error') t = 'warning';
        MinhajModal.show({
            type: t,
            title: title || 'تنبيه',
            message: message || '',
            confirmText: 'حسناً'
        });
    } else if (typeof showMinhajAlert === 'function') {
        showMinhajAlert(message, type === 'error' ? 'warning' : (type || 'info'), title);
    } else {
        // آخر ملاذ: اطبع في الـ console بدلاً من alert()
        try { console.warn('[Minhaj] ' + (title || '') + ' - ' + (message || '')); } catch (e) {}
    }
}

window.addEventListener('storage', function (e) {
    if (!e.key) return;
    if (e.key === 'minhaj_myOptionalTasks') {
        renderOptionalTasks();
        updateProgressBars();
    }
    if (e.key === 'minhaj_mandatoryTasks') {
        renderMandatoryTasks();
        updateProgressBars();
        // إخفاء/إظهار تحذير "لم تحدد المواعيد" فوراً عند تغير المواعيد من صفحة الإعدادات
        if (typeof checkMissingTimes === 'function') checkMissingTimes();
    }
});

// كذلك عند العودة للصفحة (على سبيل المثال back من settings)، أعد فحص حالة المواعيد
window.addEventListener('pageshow', function () {
    if (typeof checkMissingTimes === 'function') checkMissingTimes();
    if (typeof renderMandatoryTasks === 'function') renderMandatoryTasks();
    if (typeof updateProgressBars === 'function') updateProgressBars();
});

// ====== الأكورديون: فتح/إغلاق البطاقات ======
function initAccordions() {
    var saved = Storage.load('accordionState', {}); // { acc-id: 'open'|'closed' }
    var cards = document.querySelectorAll('.card.accordion');
    cards.forEach(function (card) {
        var id = card.getAttribute('data-acc') || '';
        // الافتراضي: مغلقة (كما في الـ HTML)؛ احترم التفضيل المحفوظ إن وُجد
        if (saved[id] === 'open') card.classList.remove('collapsed');
        else if (saved[id] === 'closed') card.classList.add('collapsed');

        var header = card.querySelector('.card-header.acc-toggle');
        if (header) {
            header.addEventListener('click', function () {
                card.classList.toggle('collapsed');
                saved[id] = card.classList.contains('collapsed') ? 'closed' : 'open';
                Storage.save('accordionState', saved);
                // عند فتح بطاقة الإحصائيات لأول مرة: أعد رسم الشارت بعد ظهوره
                if (id === 'stats' && !card.classList.contains('collapsed')) {
                    setTimeout(function () {
                        var activeBtn = document.querySelector('.stats-tabs .tab-btn.active');
                        var period = activeBtn ? activeBtn.getAttribute('data-period') : 'daily';
                        initChart(period);
                    }, 420);
                }
            });
        }
    });

    var expandBtn = document.getElementById('expandAllBtn');
    var collapseBtn = document.getElementById('collapseAllBtn');
    if (expandBtn) expandBtn.addEventListener('click', function () {
        cards.forEach(function (c) {
            c.classList.remove('collapsed');
            var i = c.getAttribute('data-acc') || '';
            saved[i] = 'open';
        });
        Storage.save('accordionState', saved);
        setTimeout(function () {
            var activeBtn = document.querySelector('.stats-tabs .tab-btn.active');
            initChart(activeBtn ? activeBtn.getAttribute('data-period') : 'daily');
        }, 420);
    });
    if (collapseBtn) collapseBtn.addEventListener('click', function () {
        cards.forEach(function (c) {
            c.classList.add('collapsed');
            var i = c.getAttribute('data-acc') || '';
            saved[i] = 'closed';
        });
        Storage.save('accordionState', saved);
    });
}


// تشغيل أولي
window.addEventListener('DOMContentLoaded', function () {
    if (!checkAuth()) return;
    initUtils();
    tryDetectLocation();
    renderPrayerTimes();
    setInterval(renderPrayerTimes, 60000);
    renderMandatoryTasks();
    renderOptionalTasks();
    updateProgressBars();
    checkMissingTimes();
    initMarquee();
    initChart('daily');
    initTabs();
    setupNavigation();
    initAccordions();
    // تحديث سلسلة الأيام المتتالية بناءً على دخول المستخدم اليومي
    if (typeof ensureDailyStreak === 'function') {
        ensureDailyStreak();
        updateProgressBars();
    }
    startReminderLoop();
});
