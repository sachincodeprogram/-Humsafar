const fs = require('fs');
const path = require('path');
const { initializeApp, cert } = require('firebase-admin/app');
const { getMessaging } = require('firebase-admin/messaging');

let messaging = null;

// Firebase key do jagah se aa sakti hai:
// 1. FIREBASE_SERVICE_ACCOUNT_JSON env var (Render/cloud ke liye — poora JSON string)
// 2. firebase-service-account.json file (local development)
// Dono na ho to push gracefully band rehta hai.
function initPush() {
  // Push me koi bhi problem ho to server crash NAHI hona chahiye —
  // push band rakh kar baaki app chalti rahe.
  try {
    let serviceAccount = null;

    if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
      serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON.trim());
    } else {
      const keyPath = path.resolve(
        process.env.FIREBASE_SERVICE_ACCOUNT_PATH || './firebase-service-account.json'
      );
      if (fs.existsSync(keyPath)) {
        serviceAccount = JSON.parse(fs.readFileSync(keyPath, 'utf8'));
      }
    }

    if (!serviceAccount) {
      console.log('Push notifications OFF (Firebase key nahi mili)');
      return;
    }
    const app = initializeApp({ credential: cert(serviceAccount) });
    messaging = getMessaging(app);
    console.log('Push notifications ON');
  } catch (err) {
    console.log('Push notifications OFF (Firebase key galat hai):', err.message);
  }
}

// Fire-and-forget: push fail hone se call flow nahi rukna chahiye
async function sendPush(token, { title, body, data = {} }) {
  if (!messaging || !token) return;
  try {
    const id = await messaging.send({
      token,
      notification: { title, body },
      data,
      android: {
        priority: 'high',
        // channelId jaan-bujh kar nahi diya: custom channel app me banana padta hai,
        // warna Android notification gira deta hai. Default FCM channel use hoga.
        notification: { sound: 'default' },
      },
    });
    console.log('Push sent:', id);
  } catch (err) {
    console.log('Push send failed:', err.message);
  }
}

module.exports = { initPush, sendPush };
