import React, { useEffect, useState } from 'react';
import { StatusBar, ActivityIndicator, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';

import AuthScreen from './src/screens/AuthScreen';
import HomeScreen from './src/screens/HomeScreen';
import CallScreen from './src/screens/CallScreen';
import ScheduleScreen from './src/screens/ScheduleScreen';
import HistoryScreen from './src/screens/HistoryScreen';
import { connectSocket } from './src/socket';

const Stack = createNativeStackNavigator();

function App() {
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem('token').then(t => {
      if (t) {
        setToken(t);
        connectSocket(t);
      }
      setLoading(false);
    });
  }, []);

  const onLoggedIn = (t: string) => {
    connectSocket(t);
    setToken(t);
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center' }}>
        <ActivityIndicator size="large" color="#4A6CF7" />
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
            <Stack.Screen name="Home" options={{ headerShown: false }}>
              {props => <HomeScreen {...props} onLogout={() => setToken(null)} />}
            </Stack.Screen>
            <Stack.Screen
              name="Call"
              component={CallScreen}
              options={{ headerShown: false, gestureEnabled: false }}
            />
            <Stack.Screen
              name="Schedule"
              component={ScheduleScreen}
              options={{
                title: 'Call Book Karein',
                headerStyle: { backgroundColor: '#F5F7FB' },
                headerTitleStyle: { fontWeight: '800', color: '#0F172A' },
                headerTintColor: '#4F46E5',
                headerShadowVisible: false,
              }}
            />
            <Stack.Screen
              name="History"
              component={HistoryScreen}
              options={{
                title: 'Call History',
                headerStyle: { backgroundColor: '#F5F7FB' },
                headerTitleStyle: { fontWeight: '800', color: '#0F172A' },
                headerTintColor: '#4F46E5',
                headerShadowVisible: false,
              }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default App;
