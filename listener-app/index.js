/**
 * @format
 */

import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';

// Background/killed state me FCM message aane par (notification Android khud dikhata hai).
// Firebase config na ho to app crash nahi honi chahiye, isliye try/catch.
try {
  const messaging = require('@react-native-firebase/messaging').default;
  messaging().setBackgroundMessageHandler(async () => {});
} catch (e) {}

AppRegistry.registerComponent(appName, () => App);
