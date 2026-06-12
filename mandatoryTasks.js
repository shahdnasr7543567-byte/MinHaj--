// ========================================
// mandatoryTasks.js - المهام الإجبارية (صلوات + أذكار + ورد)
// ========================================

var defaultMandatoryTasks = {
    prayers: [
        { id: 'fajr',    name: 'صلاة الفجر',    completed: false, time: null, points: 10 },
        { id: 'dhuhr',   name: 'صلاة الظهر',    completed: false, time: null, points: 10 },
        { id: 'asr',     name: 'صلاة العصر',    completed: false, time: null, points: 10 },
        { id: 'maghrib', name: 'صلاة المغرب',   completed: false, time: null, points: 10 },
        { id: 'isha',    name: 'صلاة العشاء',   completed: false, time: null, points: 10 }
    ],
    azkar: [
        { id: 'morning', name: 'أذكار الصباح', completed: false, time: null, points: 5 },
        { id: 'evening', name: 'أذكار المساء', completed: false, time: null, points: 5 }
    ],
    quran: [
        { id: 'daily_wird', name: 'الورد اليومي من القرآن', completed: false, time: null, points: 10 }
    ],
    lastResetDate: null
};

function loadMandatoryTasks() {
    var saved = Storage.load('mandatoryTasks', null);
    if (!saved) {
        Storage.save('mandatoryTasks', defaultMandatoryTasks);
        return defaultMandatoryTasks;
    }
    // إعادة تعيين يومية للمهام
    var today = new Date().toISOString().split('T')[0];
    if (saved.lastResetDate !== today) {
        var preserveTimes = {};
        ['prayers','azkar','quran'].forEach(function (cat) {
            if (saved[cat]) {
                saved[cat].forEach(function (t) {
                    preserveTimes[cat + ':' + t.id] = t.time;
                    t.completed = false;
                });
            }
        });
        saved.lastResetDate = today;
        Storage.save('mandatoryTasks', saved);
    }
    return saved;
}

function saveMandatoryTasks(tasks) {
    Storage.save('mandatoryTasks', tasks);
}

function updateMandatoryTaskTime(category, taskId, time) {
    var tasks = loadMandatoryTasks();
    if (tasks[category]) {
        for (var i = 0; i < tasks[category].length; i++) {
            if (tasks[category][i].id === taskId) {
                tasks[category][i].time = time;
                break;
            }
        }
        saveMandatoryTasks(tasks);
        return true;
    }
    return false;
}

function toggleMandatoryTask(category, taskId) {
    var tasks = loadMandatoryTasks();
    var task = null;

    // ===== منع الغش للصلوات: لا يُسمح بتعليم صلاة لم يحن وقتها =====
    if (category === 'prayers' && typeof isPrayerTimeReached === 'function') {
        if (!isPrayerTimeReached(taskId)) {
            return { allowed: false, reason: 'time-not-reached' };
        }
    }

    if (tasks[category]) {
        for (var i = 0; i < tasks[category].length; i++) {
            if (tasks[category][i].id === taskId) {
                tasks[category][i].completed = !tasks[category][i].completed;
                task = tasks[category][i];
                break;
            }
        }
        saveMandatoryTasks(tasks);
        if (typeof updateOverallStats === 'function') updateOverallStats();
        if (typeof checkFullCompletion === 'function') checkFullCompletion();
        return { allowed: true, completed: task ? task.completed : false };
    }
    return { allowed: false, reason: 'not-found' };
}

function getMandatoryProgress() {
    var tasks = loadMandatoryTasks();
    var total = 0, completed = 0, totalPoints = 0, earnedPoints = 0;
    ['prayers','azkar','quran'].forEach(function (cat) {
        var arr = tasks[cat] || [];
        for (var i = 0; i < arr.length; i++) {
            total++;
            totalPoints += arr[i].points;
            if (arr[i].completed) {
                completed++;
                earnedPoints += arr[i].points;
            }
        }
    });
    return {
        total: total,
        completed: completed,
        percentage: calculateProgress(completed, total),
        totalPoints: totalPoints,
        earnedPoints: earnedPoints
    };
}

function getOptionalProgress() {
    var optionalTasks = Storage.load('myOptionalTasks', []);
    var total = optionalTasks.length;
    var completed = 0;
    for (var i = 0; i < optionalTasks.length; i++) {
        if (optionalTasks[i].completed) completed++;
    }
    return {
        total: total,
        completed: completed,
        percentage: calculateProgress(completed, total)
    };
}

function checkMissingTimes() {
    var tasks = loadMandatoryTasks();
    var missing = [];
    if (!tasks.azkar[0].time) missing.push('أذكار الصباح');
    if (!tasks.azkar[1].time) missing.push('أذكار المساء');
    if (!tasks.quran[0].time) missing.push('الورد اليومي من القرآن');

    var warningElem = document.getElementById('times-warning');
    if (missing.length > 0) {
        var message = '⚠️ تنبيه: لم تقم بتحديد مواعيد لـ: ' + missing.join('، ');
        if (warningElem) {
            warningElem.innerHTML = '<div style="background:rgba(251,191,36,0.12);border:1px solid rgba(251,191,36,0.35);border-radius:18px;padding:12px 18px;margin-bottom:1.5rem;color:#fbbf24;font-size:0.95rem;">' +
                message + ' <a href="settings.html" style="color:#fde68a;text-decoration:underline;font-weight:700;">اضغط هنا لتحديد المواعيد</a></div>';
        }
        return false;
    }
    if (warningElem) warningElem.innerHTML = '';
    return true;
}

function checkFullCompletion() {
    var mandatory = getMandatoryProgress();
    var optional = getOptionalProgress();
    var totalAll = mandatory.total + optional.total;
    var totalCompleted = mandatory.completed + optional.completed;
    var totalPercent = totalAll > 0 ? Math.round((totalCompleted / totalAll) * 100) : 0;

    var today = new Date().toISOString().split('T')[0];
    var lastCompletionDate = Storage.load('lastCompletionDate', null);
    if (totalPercent === 100 && lastCompletionDate !== today) {
        Storage.save('lastCompletionDate', today);
        if (typeof showEncouragementMessage === 'function') showEncouragementMessage();
        updateStreak();
    }
}

// ====== updateStreak ======
// يحدّث سلسلة الأيام المتتالية بناءً على دخول المستخدم اليومي.
// - إن دخل اليوم لأول مرة وكان دخوله السابق أمس → يزيد بواحد.
// - إن كانت الفترة أكبر من يوم → السلسلة تُعاد إلى 1.
// - يُستدعى يومياً عند تحميل اللوحة (بصرف النظر عن نسبة الإنجاز)،
//   كما يُستدعى عند الوصول لـ 100% للحفاظ على التوافق مع المنطق القديم.
function updateStreak() {
    var user = loadCurrentUser();
    if (!user) return;
    if (!user.stats) {
        user.stats = { totalTasks: 0, completedTasks: 0, streak: 0, lastActive: null };
    }
    var today = new Date().toISOString().split('T')[0];
    if (user.stats.lastActive === today) return; // محسوب اليوم بالفعل

    var yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    var yesterdayStr = yesterday.toISOString().split('T')[0];

    if (user.stats.lastActive === yesterdayStr) {
        user.stats.streak = (user.stats.streak || 0) + 1;
    } else {
        // غاب أكثر من يوم — أعد التهيئة
        user.stats.streak = 1;
    }
    user.stats.lastActive = today;
    saveCurrentUser(user);
}

// يُستدعى من dashboard.js عند فتح اللوحة لتحديث السلسلة على أساس الدخول اليومي
function ensureDailyStreak() {
    updateStreak();
}

function updateOverallStats() {
    if (typeof updateProgressBars === 'function') updateProgressBars();
}
