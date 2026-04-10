// ── Firebase Messaging Service Worker — مزرعة الأمل ──
// هذا الملف يستقبل الإشعارات عندما يكون المتصفح مغلقاً أو التطبيق في الخلفية

importScripts('https://www.gstatic.com/firebasejs/9.22.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.22.1/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey:            "AIzaSyBCu8-z7-JZe9Z3BpJMAJ562OZBSa11W0w",
  authDomain:        "tarikmanger.firebaseapp.com",
  projectId:         "tarikmanger",
  storageBucket:     "tarikmanger.firebasestorage.app",
  messagingSenderId: "633933725815",
  appId:             "1:633933725815:web:a07dea02a383cb2d5c0672"
});

const messaging = firebase.messaging();

// معالجة الرسائل في الخلفية (اختياري، Firebase يتعامل معها تلقائياً إذا كان هناك بلاود إشعار)
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  
  const notificationTitle = payload.notification.title || 'تنبیه جديد';
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/icon.svg', // تأكد من وجود الأيقونة
    data: payload.data
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
