// ========================================
// auth.js - إدارة تسجيل الدخول والمستخدمين
// ========================================

var currentUser = null;

function loadCurrentUser() {
    currentUser = Storage.load('currentUser', null);
    return currentUser;
}

function saveCurrentUser(user) {
    currentUser = user;
    Storage.save('currentUser', user);
    var users = Storage.load('users', {});
    users[user.name] = user;
    Storage.save('users', users);
}

function login(username) {
    if (!username || username.trim() === '') {
        return { success: false, message: 'الرجاء إدخال اسم المستخدم' };
    }
    username = username.trim();
    var users = Storage.load('users', {});
    if (!users[username]) {
        users[username] = {
            name: username,
            createdAt: new Date().toISOString(),
            settings: {
                morningAzkar: '06:00',
                eveningAzkar: '18:00',
                quranTime: '20:00'
            },
            stats: {
                totalTasks: 0,
                completedTasks: 0,
                streak: 0,
                lastActive: null
            }
        };
        Storage.save('users', users);
    }
    saveCurrentUser({
        name: username,
        createdAt: users[username].createdAt,
        settings: users[username].settings,
        stats: users[username].stats
    });
    updateWelcomeMessage(username);
    return { success: true, message: 'مرحباً ' + username };
}

function logout() {
    Storage.remove('currentUser');
    currentUser = null;
    window.location.href = 'login.html';
}

function checkAuth() {
    var user = loadCurrentUser();
    if (!user) {
        window.location.href = 'login.html';
        return false;
    }
    updateWelcomeMessage(user.name);
    return true;
}

function updateWelcomeMessage(name) {
    var hour = new Date().getHours();
    var greeting = '';
    if (hour < 12) greeting = '🌅 اسعد الله صباحك';
    else if (hour < 18) greeting = '☀️ طاب نهارك';
    else greeting = '🌙 مساؤك مبارك';
    var welcomeElem = document.getElementById('welcome-msg');
    if (welcomeElem) {
        welcomeElem.innerHTML = greeting + ' <span style="color:#fbbf24;">' + name + '</span>';
    }
}

function showEncouragementMessage() {
    var user = loadCurrentUser();
    if (!user) return;
    var messages = [
        '🎉 ماشاء الله تبارك الله يا ' + user.name + '! أكملت كل مهامك اليوم!',
        '💪 ' + user.name + ' أنت قدوة حسنة! حافظ على هذا الالتزام!',
        '🌟 الله أكبر! ' + user.name + ' حققت إنجاز 100% اليوم!',
        '📿 ' + user.name + ' بارك الله فيك وجعلك من المداومين!'
    ];
    var msg = messages[Math.floor(Math.random() * messages.length)];
    showNotification('تهانينا! 🏆', msg);
    var box = document.getElementById('encouragement-message');
    if (box) {
        box.innerHTML = '<div style="margin-top:15px;padding:14px 18px;background:linear-gradient(135deg, rgba(76,175,80,0.15), rgba(251,191,36,0.1));border:1px solid rgba(251,191,36,0.3);border-radius:16px;color:#fbbf24;text-align:center;font-weight:600;">' + msg + '</div>';
        setTimeout(function () { box.innerHTML = ''; }, 8000);
    }
    if (typeof notifyFriendsAboutCompletion === 'function') {
        notifyFriendsAboutCompletion();
    }
}
