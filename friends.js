// ========================================
// friends.js - نظام الأصدقاء والإشعارات
// ========================================

function getFriendsList() {
    var user = loadCurrentUser();
    if (!user) return [];
    return Storage.load('friends_' + user.name, []);
}

function addFriend(friendName) {
    var user = loadCurrentUser();
    if (!user) return false;
    friendName = (friendName || '').trim();
    if (!friendName) return false;
    if (friendName === user.name) {
        if (typeof showMinhajAlert === 'function') {
            showMinhajAlert('لا يمكنك إضافة نفسك كصديق.', 'warning', 'تنبيه');
        }
        return false;
    }
    var friends = getFriendsList();
    for (var i = 0; i < friends.length; i++) {
        if (friends[i].name === friendName) {
            if (typeof showMinhajAlert === 'function') {
                showMinhajAlert('هذا الصديق مضاف بالفعل في قائمتك.', 'info', 'تنبيه');
            }
            return false;
        }
    }
    var users = Storage.load('users', {});
    if (!users[friendName]) {
        // إنشاء سجل خفيف للصديق ليمكن متابعته لاحقاً
        users[friendName] = {
            name: friendName,
            createdAt: new Date().toISOString(),
            settings: { morningAzkar: '06:00', eveningAzkar: '18:00', quranTime: '20:00' },
            stats: { totalTasks: 0, completedTasks: 0, streak: 0, lastActive: null }
        };
        Storage.save('users', users);
    }
    friends.push({ name: friendName, addedDate: new Date().toISOString() });
    Storage.save('friends_' + user.name, friends);
    addNotificationForFriend(friendName, user.name + ' أضافك كصديق في منصة منهاج');
    return true;
}

function removeFriend(friendName) {
    var user = loadCurrentUser();
    if (!user) return false;
    var friends = getFriendsList();
    var newFriends = [];
    for (var i = 0; i < friends.length; i++) {
        if (friends[i].name !== friendName) newFriends.push(friends[i]);
    }
    Storage.save('friends_' + user.name, newFriends);
    return true;
}

function getFriendProgress(friendName) {
    // قراءة آخر تقدم حفظه الصديق (إن كان يستخدم نفس المتصفح)
    var snapshot = Storage.load('progressSnapshot_' + friendName, null);
    if (snapshot && typeof snapshot.percentage === 'number') {
        return snapshot;
    }
    return { percentage: 0, completed: 0, total: 0 };
}

function saveProgressSnapshot() {
    var user = loadCurrentUser();
    if (!user) return;
    var mandatory = (typeof getMandatoryProgress === 'function') ? getMandatoryProgress() : { total: 0, completed: 0 };
    var optional = (typeof getOptionalProgress === 'function') ? getOptionalProgress() : { total: 0, completed: 0 };
    var total = mandatory.total + optional.total;
    var completed = mandatory.completed + optional.completed;
    var percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
    Storage.save('progressSnapshot_' + user.name, {
        percentage: percentage,
        completed: completed,
        total: total,
        date: new Date().toISOString()
    });
}

function addNotificationForFriend(friendName, message) {
    var notifications = Storage.load('notifications_' + friendName, []);
    notifications.unshift({
        message: message,
        date: new Date().toLocaleString('ar-EG'),
        read: false
    });
    if (notifications.length > 50) notifications = notifications.slice(0, 50);
    Storage.save('notifications_' + friendName, notifications);
}

function getNotifications() {
    var user = loadCurrentUser();
    if (!user) return [];
    return Storage.load('notifications_' + user.name, []);
}

function notifyFriendsAboutShortcoming() {
    var user = loadCurrentUser();
    if (!user) return;
    var friends = getFriendsList();
    var message = user.name + ' لم يكمل مهامه اليوم بالكامل 🤝 شجعه على الالتزام';
    for (var i = 0; i < friends.length; i++) {
        addNotificationForFriend(friends[i].name, message);
    }
}

function notifyFriendsAboutCompletion() {
    var user = loadCurrentUser();
    if (!user) return;
    var friends = getFriendsList();
    var message = '🎉 ' + user.name + ' أكمل جميع مهامه اليوم! ماشاء الله تبارك الله';
    for (var i = 0; i < friends.length; i++) {
        addNotificationForFriend(friends[i].name, message);
    }
}
