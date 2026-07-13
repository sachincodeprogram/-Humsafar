import React, { useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, StatusBar,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../api';
import { getSocket, disconnectSocket } from '../socket';
import { C, shadow, radius } from '../theme';

export default function HomeScreen({ navigation, onLogout }) {
  const [ringing, setRinging] = useState(false);
  const [name, setName] = useState('');

  useEffect(() => {
    AsyncStorage.getItem('profile').then((p) => p && setName(JSON.parse(p).name));

    const socket = getSocket();
    if (!socket) return;

    const onStarted = (data) => {
      console.log('[Home] call:started mila, Call screen par ja rahe hain', data.channelName);
      setRinging(false);
      navigation.navigate('Call', data);
    };
    const onUnavailable = ({ reason }) => {
      setRinging(false);
      Alert.alert(
        'Abhi koi available nahi',
        reason === 'timeout'
          ? 'Team member ne jawab nahi diya. Callback book karein?'
          : 'Sabhi team members busy hain. Callback ya scheduled call book karein?',
        [
          { text: 'Baad me', style: 'cancel' },
          { text: 'Book karein', onPress: () => navigation.navigate('Schedule') },
        ],
      );
    };
    socket.on('call:started', onStarted);
    socket.on('call:unavailable', onUnavailable);
    return () => {
      socket.off('call:started', onStarted);
      socket.off('call:unavailable', onUnavailable);
    };
  }, [navigation]);

  const talkNow = async () => {
    setRinging(true);
    try {
      const { data } = await api.post('/calls/request');
      if (!data.available) {
        setRinging(false);
        Alert.alert(
          'Abhi koi available nahi',
          'Callback ya scheduled call book kar lein — team aapko jaldi call karegi.',
          [
            { text: 'Baad me', style: 'cancel' },
            { text: 'Book karein', onPress: () => navigation.navigate('Schedule') },
          ],
        );
      }
    } catch (err) {
      setRinging(false);
      Alert.alert('Error', err.response?.data?.message || 'Connection failed');
    }
  };

  const logout = async () => {
    await AsyncStorage.multiRemove(['token', 'profile']);
    disconnectSocket();
    onLogout();
  };

  const initial = (name || 'H').charAt(0).toUpperCase();

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.hello}>Namaste 👋</Text>
          <Text style={styles.name}>{name || 'Dost'}</Text>
        </View>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initial}</Text>
        </View>
      </View>

      {/* Hero card */}
      <View style={styles.heroCard}>
        <Text style={styles.heroTitle}>Koi baat karni hai?</Text>
        <Text style={styles.heroSub}>Hamari team aapki baat sunne ke liye hamesha taiyar hai</Text>

        <TouchableOpacity
          style={styles.talkOuter} onPress={talkNow} disabled={ringing} activeOpacity={0.85}
        >
          <View style={styles.talkButton}>
            {ringing ? (
              <>
                <ActivityIndicator color="#fff" size="large" />
                <Text style={styles.talkText}>Connect ho raha hai…</Text>
              </>
            ) : (
              <>
                <Text style={styles.talkEmoji}>📞</Text>
                <Text style={styles.talkText}>Abhi Baat Karein</Text>
              </>
            )}
          </View>
        </TouchableOpacity>

        <View style={styles.badgeRow}>
          <View style={styles.badge}><Text style={styles.badgeText}>🔒 No recording</Text></View>
          <View style={styles.badge}><Text style={styles.badgeText}>💙 Friendly baat</Text></View>
        </View>
      </View>

      {/* Quick actions */}
      <View style={styles.row}>
        <TouchableOpacity
          style={styles.actionCard} activeOpacity={0.8}
          onPress={() => navigation.navigate('Schedule')}
        >
          <View style={[styles.actionIcon, { backgroundColor: C.warnSoft }]}>
            <Text style={styles.actionEmoji}>🗓️</Text>
          </View>
          <Text style={styles.actionTitle}>Call Schedule</Text>
          <Text style={styles.actionSub}>Apne time par baat karein</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionCard} activeOpacity={0.8}
          onPress={() => navigation.navigate('History')}
        >
          <View style={[styles.actionIcon, { backgroundColor: C.successSoft }]}>
            <Text style={styles.actionEmoji}>🕘</Text>
          </View>
          <Text style={styles.actionTitle}>History</Text>
          <Text style={styles.actionSub}>Pichli calls dekhein</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity onPress={logout} style={styles.logoutBtn}>
        <Text style={styles.logout}>Logout</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: C.bg },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginTop: 12, marginBottom: 20,
  },
  hello: { color: C.muted, fontSize: 14 },
  name: { color: C.text, fontSize: 24, fontWeight: '800' },
  avatar: {
    width: 48, height: 48, borderRadius: 24, backgroundColor: C.primary,
    alignItems: 'center', justifyContent: 'center', ...shadow,
  },
  avatarText: { color: '#fff', fontSize: 20, fontWeight: '700' },
  heroCard: {
    backgroundColor: C.surface, borderRadius: radius.lg, padding: 24,
    alignItems: 'center', ...shadow,
  },
  heroTitle: { fontSize: 20, fontWeight: '800', color: C.text },
  heroSub: { color: C.muted, textAlign: 'center', marginTop: 6, marginBottom: 22, fontSize: 13 },
  talkOuter: {
    width: 190, height: 190, borderRadius: 95, backgroundColor: C.primarySoft,
    alignItems: 'center', justifyContent: 'center',
  },
  talkButton: {
    width: 160, height: 160, borderRadius: 80, backgroundColor: C.primary,
    alignItems: 'center', justifyContent: 'center', ...shadow, elevation: 8,
  },
  talkEmoji: { fontSize: 42 },
  talkText: { color: '#fff', fontSize: 15, fontWeight: '700', marginTop: 6 },
  badgeRow: { flexDirection: 'row', gap: 10, marginTop: 22 },
  badge: {
    backgroundColor: C.bg, borderRadius: 999, paddingVertical: 6, paddingHorizontal: 12,
  },
  badgeText: { fontSize: 12, color: C.muted, fontWeight: '600' },
  row: { flexDirection: 'row', gap: 14, marginTop: 16 },
  actionCard: {
    flex: 1, backgroundColor: C.surface, borderRadius: radius.lg, padding: 16, ...shadow,
  },
  actionIcon: {
    width: 44, height: 44, borderRadius: 12, alignItems: 'center',
    justifyContent: 'center', marginBottom: 10,
  },
  actionEmoji: { fontSize: 22 },
  actionTitle: { fontWeight: '700', color: C.text, fontSize: 15 },
  actionSub: { color: C.muted, fontSize: 12, marginTop: 2 },
  logoutBtn: { marginTop: 'auto', alignSelf: 'center', padding: 12 },
  logout: { color: C.danger, fontWeight: '600' },
});
