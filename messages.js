// ========================================
// messages.js - رسائل التحفيز والتنبيه
// ========================================
var motivationMessages = [
    'ما تضيعش وقتك 💪',
    'قربت توصل، كمل 🔥',
    'الالتزام سر النجاح ✨',
    'كل خطوة بتقربك من ربك 🌟',
    'استمر، النية الصافية ترفع الدرجات 📿'
];
var warningMessages = [
    'قمت متأخر 😅',
    'حاسب وقتك بيضيع ⏰',
    'ارجع ركز 💔',
    'لسه فاضل وقت تعوّض، يلا 🤲'
];
function getRandomMessage(type) {
    var arr = type === 'motivation' ? motivationMessages : warningMessages;
    return arr[Math.floor(Math.random() * arr.length)];
}
