/* ============================================================
   firebase-messaging-sw.js
   এই ফাইলটা delivery-man-app.html এর ঠিক পাশে (একই ফোল্ডারে, রুটে)
   রাখতে হবে — নাম অবিকল "firebase-messaging-sw.js" রাখা জরুরি।
   এই সার্ভিস ওয়ার্কার ব্রাউজার/অ্যাপ বন্ধ বা ব্যাকগ্রাউন্ডে থাকলেও
   পুশ নোটিফিকেশন রিসিভ করে দেখানোর কাজ করে।
   ============================================================ */

importScripts("https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyD6qmuWkNUrskMIBHq8Z_AQ0N_WT1DL8Is",
  authDomain: "honeybee-984dd.firebaseapp.com",
  projectId: "honeybee-984dd",
  storageBucket: "honeybee-984dd.firebasestorage.app",
  messagingSenderId: "610211112501",
  appId: "1:610211112501:web:9ea40b9060d425e85b737c"
});

const messaging = firebase.messaging();

// অ্যাপ ব্যাকগ্রাউন্ডে/বন্ধ থাকা অবস্থায় পুশ আসলে এখানে হ্যান্ডেল হয়
messaging.onBackgroundMessage((payload) => {
  const title = (payload.notification && payload.notification.title) || "🔔 দোকান থেকে ডাকছে!";
  const body = (payload.notification && payload.notification.body) || "নতুন ডেলিভারি অর্ডার আছে — দোকানে যোগাযোগ করুন।";

  self.registration.showNotification(title, {
    body,
    icon: "icon-192.png",
    badge: "icon-192.png",
    vibrate: [500, 200, 500, 200, 500],
    requireInteraction: true,
    tag: "honeybee-delivery-call",
    renotify: true,
    data: payload.data || {}
  });
});

// নোটিফিকেশনে ট্যাপ করলে অ্যাপ খুলে যাবে
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes("delivery-man-app.html") && "focus" in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow("delivery-man-app.html");
      }
    })
  );
});
