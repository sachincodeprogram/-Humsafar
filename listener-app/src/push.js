import { Platform, PermissionsAndroid } from 'react-native';
import { api } from './api';

// Firebase config na hone par bhi app crash nahi honi chahiye,
// isliye messaging ko lazily load karke sab kuch try/catch me hai.
export async function registerPush() {
  try {
    const messaging = require('@react-native-firebase/messaging').default;

    if (Platform.OS === 'android' && Platform.Version >= 33) {
      await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
      );
    }
    await messaging().requestPermission();

    const token = await messaging().getToken();
    await api.post('/auth/fcm-token', { token });

    messaging().onTokenRefresh(async (newToken) => {
      try {
        await api.post('/auth/fcm-token', { token: newToken });
      } catch {}
    });
    console.log('[Push] token register ho gaya');
  } catch (err) {
    console.log('[Push] register nahi hua:', err.message);
  }
}
