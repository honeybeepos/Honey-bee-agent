# 🔔 ব্যাকগ্রাউন্ড নোটিফিকেশন (FCM) চালু করার ধাপ

আমি কোড লিখে দিয়েছি, কিন্তু ৩টা কাজ Firebase Console/CLI থেকে
আপনাকে (বা যে কেউ প্রজেক্টে অ্যাক্সেস আছে তাকে) নিজে করতে হবে —
আমি এখান থেকে সরাসরি আপনার Firebase প্রজেক্টে কিছু ডিপ্লয় করতে পারি না।

---

## ধাপ ১ — VAPID Key জেনারেট করুন

1. Firebase Console → আপনার প্রজেক্ট (`honeybee-984dd`) → ⚙️ Project Settings
2. **Cloud Messaging** ট্যাব → নিচে **Web configuration** সেকশন
3. **Generate key pair** বাটনে চাপ দিন — একটা লম্বা কী (key) পাবেন
4. এই কী কপি করে `delivery-man-app.html` ফাইলে খুঁজুন:
   ```js
   const VAPID_KEY = "PASTE-YOUR-VAPID-PUBLIC-KEY-HERE";
   ```
   `"PASTE-YOUR-VAPID-PUBLIC-KEY-HERE"` এর জায়গায় নিজের কী বসিয়ে সেভ করুন।

---

## ধাপ ২ — Firestore Rules আপডেট করুন

Firebase Console → **Firestore Database** → **Rules** ট্যাবে গিয়ে
আপনার বর্তমান rules-এর ভেতরে `shops/{shopId}` ব্লকের মধ্যে এই দুটো
sub-collection এর নিয়ম যোগ করুন (আগে থেকে থাকলে বাদ দিন):

```
match /shops/{shopId} {
  allow get: if true;   // ডেলিভারি অ্যাপ শপের নাম দেখানোর জন্য

  match /deliveryCalls/{callId} {
    allow read: if true;                 // ডেলিভারি অ্যাপ শোনার জন্য (লগইন ছাড়া)
    allow create: if request.auth != null; // শুধু লগইন করা দোকান থেকেই কল যাবে
  }

  match /deliveryDevices/{token} {
    allow read, write: if true;   // ডেলিভারি অ্যাপ টোকেন সেভ/আপডেট করার জন্য
  }
}
```

⚠️ **সততার সাথে বলা দরকার:** এই নিয়মগুলো একটু "খোলা" — কারণ ডেলিভারি
অ্যাপে কোনো লগইন সিস্টেম নেই (শুধু শপ কোড দিয়ে কানেক্ট)। কেউ যদি
আপনার শপ কোডটা জেনে ফেলে, সে থিওরিটিক্যালি রিং পাঠাতে/দেখতে পারবে।
শপ কোডটা শুধু বিশ্বস্ত ডেলিভারি ম্যানকেই দিন। ভবিষ্যতে চাইলে এখানে
সাধারণ পিন/পাসওয়ার্ড যোগ করে আরও নিরাপদ করা যায়।

---

## ধাপ ৩ — Cloud Function ডিপ্লয় করুন

এটার জন্য কম্পিউটারে Node.js ও Firebase CLI লাগবে। টার্মিনালে:

```bash
npm install -g firebase-tools
firebase login
```

তারপর এই চ্যাট থেকে পাওয়া `functions/` ফোল্ডারটা আপনার প্রজেক্টের
মূল ফোল্ডারে রাখুন (`firebase-messaging-sw.js`, `delivery-man-app.html`
ইত্যাদির পাশে না, বরং একধাপ ভেতরে `functions/index.js` +
`functions/package.json` — এভাবেই আছে)। প্রজেক্টের মূল ফোল্ডারে
`firebase.json` না থাকলে প্রথমে:

```bash
firebase init functions
```
চালিয়ে existing project (`honeybee-984dd`) সিলেক্ট করুন, JavaScript
বেছে নিন, এবং যখন জিজ্ঞেস করবে existing files overwrite করবেন কিনা —
**"No"** বলুন (আমার দেওয়া `index.js`/`package.json` রাখতে)।

⚠️ Cloud Functions চালাতে Firebase-এর **Blaze (pay-as-you-go) প্ল্যান**
লাগে (ফ্রি Spark প্ল্যানে হয় না)। খরচ সাধারণত এই সাইজের ব্যবহারে
প্রায় বিনামূল্যেই থাকে (Firebase-এর ফ্রি quota অনেকখানি কভার করে)।

তারপর ডিপ্লয়:
```bash
cd functions
npm install
cd ..
firebase deploy --only functions
```

ডিপ্লয় শেষ হলে টার্মিনালে ফাংশনের নাম (`onDeliveryCall`) দেখাবে —
তখনই এটা লাইভ হয়ে যাবে।

---

## ধাপ ৪ — টেস্ট করুন

1. `delivery-man-app.html` ফোনে খুলুন, শপ কোড দিয়ে কানেক্ট করুন
2. "🔔 নোটিফিকেশন চালু করুন" বাটনে চাপুন, পারমিশন দিন
3. ফোনের স্ক্রিন লক করুন বা অ্যাপ মিনিমাইজ করুন
4. দোকানের অ্যাপ থেকে "📞 ডেলিভারি ম্যান কে ডাকুন" চাপুন
5. কয়েক সেকেন্ডের মধ্যে নোটিফিকেশন + ভাইব্রেশন আসা উচিত

কাজ না করলে Firebase Console → Functions → Logs-এ গিয়ে
`onDeliveryCall` ফাংশনের লগ চেক করুন — এরর মেসেজ পেলে বুঝতে সুবিধা হবে।

---

## ফাইলগুলো কোথায় রাখতে হবে (হোস্টিং)

- `delivery-man-app.html`, `firebase-messaging-sw.js` — একই ফোল্ডারে,
  ওয়েবসাইটের রুটে (`firebase-messaging-sw.js` নামটা ঠিক এভাবেই থাকতে হবে)
- `functions/` ফোল্ডার — শুধু ডিপ্লয়ের জন্য, ওয়েবে হোস্ট করার দরকার নেই
