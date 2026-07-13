import React, { useEffect, useState } from 'react';
import { StatusBar, ActivityIndicator, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';

import AuthScreen from './src/screens/AuthScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import CallScreen from './src/screens/CallScreen';
import { connectSocket } from './src/socket';
import { registerPush } from './src/push';

const Stack = createNativeStackNavigator();

function App() {
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem('token').then(t => {
      if (t) {
        setToken(t);
        connectSocket(t);
        registerPush();
      }
      setLoading(false);
    });
  }, []);

  const onLoggedIn = (t: string) => {
    connectSocket(t);
    registerPush();
    setToken(t);
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center' }}>
        <ActivityIndicator size="large" color="#0FA47A" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <StatusBar barStyle="dark-content" />
      <Stack.Navigator>
        {!token ? (
          <Stack.Screen name="Auth" options={{ headerShown: false }}>
            {() => <AuthScreen onLoggedIn={onLoggedIn} />}
          </Stack.Screen>
        ) : (
          <>
            <Stack.Screen name="Dashboard" options={{ headerShown: false }}>
              {props => <DashboardScreen {...props} onLogout={() => setToken(null)} />}
            </Stack.Screen>
            <Stack.Screen
              name="Call"
              component={CallScreen}
              options={{ headerShown: false, gestureEnabled: false }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default App;
