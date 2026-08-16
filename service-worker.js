/* ============================================================
   service-worker.js
   অ্যাপের "শেল" (HTML/JS/ফন্ট) ক্যাশ করে রাখে, যাতে ইন্টারনেট
   না থাকলেও অ্যাপ খোলা যায় এবং সেল/এন্ট্রি করা যায়।
   ডেটা সিঙ্কের কাজ এটা করে না — সেটা Firestore SDK নিজেই
   অফলাইন-কিউ দিয়ে সামলায় (firebase-init.js এ enablePersistence)।
   ============================================================ */

/* গুরুত্বপূর্ণ: প্রতিবার কোড আপডেট করে সার্ভারে দেওয়ার সময় এই ভার্সন নাম্বারটা
   বাড়িয়ে দিন (v2 → v3 → v4 ...)। এটা বাড়ালে পুরনো ক্যাশ মুছে ফেলা হয় এবং
   ইউজার নতুন ভার্সন পায়। */
const CACHE_VERSION = "shop-app-v78";

const APP_SHELL = [
  "login.html",
  "admin.html",
  "shop-ledger-app.html",
  "delivery-man-app.html",
  "honey-bee-track.html",
  "firebase-init.js",
  "manifest.json",
  "icon-192.png",
  "icon-512.png",
  "https://fonts.googleapis.com/css2?family=Noto+Sans+Bengali:wght@400;500;600;700;800&family=Space+Mono:wght@400;700&display=swap",
  "https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js",
  "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth-compat.js",
  "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore-compat.js"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => {
      return Promise.all(
        APP_SHELL.map((url) =>
          fetch(url, { mode: url.startsWith("http") ? "no-cors" : "same-origin" })
            .then((res) => cache.put(url, res))
            .catch(() => {}) // একটা ফাইল ফেইল করলেও বাকিগুলো ক্যাশ হবে
        )
      );
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.filter((n) => n !== CACHE_VERSION).map((n) => caches.delete(n)))
    ).then(() => self.clients.claim())
  );
});

// Firestore/Auth-এর নিজস্ব নেটওয়ার্ক কল (googleapis.com, firestore.googleapis.com ইত্যাদি)
// এই সার্ভিস ওয়ার্কার স্পর্শ করে না — Firestore SDK নিজেই সেগুলো অফলাইনে সামলায়।
self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = req.url;
  if (url.includes("firestore.googleapis.com") || url.includes("googleapis.com/identitytoolkit")) {
    return; // নেটওয়ার্কেই যেতে দাও, Firestore SDK নিজে ক্যাশ/রিট্রাই সামলাবে
  }

  /* HTML/পেজ রিকোয়েস্টের জন্য "নেটওয়ার্ক-ফার্স্ট": আগে সরাসরি ইন্টারনেট থেকে
     সর্বশেষ ভার্সন আনার চেষ্টা হয়, পাওয়া গেলে সাথে সাথেই সেটা দেখানো হয় এবং
     ক্যাশও আপডেট হয়ে যায় — তাই কোড আপডেট করলে ইউজার অনলাইনে থাকা অবস্থায়
     পরের বার অ্যাপ খোলা/রিফ্রেশ করা মাত্রই নতুন ভার্সন পেয়ে যাবে। ইন্টারনেট
     না থাকলে (fetch ব্যর্থ হলে) তখনই শুধু ক্যাশ থেকে পুরনো ভার্সন দেখানো হয়,
     যাতে অফলাইনেও অ্যাপ বন্ধ না হয়ে যায়। */
  const isNavigation = req.mode === "navigate" || req.destination === "document" || url.endsWith(".html");
  if (isNavigation) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res && res.status === 200 && req.method === "GET") {
            const clone = res.clone();
            caches.open(CACHE_VERSION).then((cache) => cache.put(req, clone));
          }
          return res;
        })
        .catch(() => caches.match(req))
    );
    return;
  }

  // Cache API শুধু GET রিকোয়েস্ট ক্যাশ করতে পারে — POST/PUT ইত্যাদি (যেমন
  // Firestore-এর ডেটা পাঠানো) ক্যাশ করার চেষ্টা করলে এরর দেয়, তাই সেসব
  // রিকোয়েস্ট সরাসরি নেটওয়ার্কে পাঠিয়ে দেওয়া হয়, ক্যাশ ছোঁয়াই হয় না
  if (event.request.method !== "GET") {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      const networkFetch = fetch(event.request)
        .then((res) => {
          if (res && res.status === 200) {
            const clone = res.clone();
            caches.open(CACHE_VERSION).then((cache) => cache.put(event.request, clone));
          }
          return res;
        })
        .catch(() => cached); // অফলাইনে নেটওয়ার্ক ফেইল করলে ক্যাশ থেকে দাও

      // stale-while-revalidate: ক্যাশ থাকলে সাথে সাথে সেটা দেখাও (দ্রুত + অফলাইনে কাজ করে),
      // পাশাপাশি নেটওয়ার্ক থেকে আপডেট আনার চেষ্টা চলতে থাকে পরের বারের জন্য
      return cached || networkFetch;
    })
  );
});
