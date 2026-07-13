import React, { useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Switch, FlatList, Alert, Modal, StatusBar,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../api';
import { getSocket, disconnectSocket } from '../socket';
import { C, shadow, radius } from '../theme';

export default function DashboardScreen({ navigation, onLogout }) {
  const [online, setOnline] = useState(false);
  const [name, setName] = useState('');
  const [incoming, setIncoming] = useState(null);
  const [queue, setQueue] = useState([]);

  const loadQueue = async () => {
    try {
      const { data } = await api.get('/schedule/pending');
      setQueue(data);
    } catch {}
  };

  useEffect(() => {
    AsyncStorage.getItem('profile').then((p) => p && setName(JSON.parse(p).name));
    loadQueue();

    const socket = getSocket();
    if (!socket) return;

    const onIncoming = (data) => setIncoming(data);
    const onStarted = (data) => {
      console.log('[Dash] call:started mila, Call screen par ja rahe hain', data.channelName);
      setIncoming(null);
      navigation.navigate('Call', data);
    };
    socket.on('call:incoming', onIncoming);
    socket.on('call:started', onStarted);

    // Push notification se aaye hain to pending ring server se maang lo
    const askPending = () => socket.emit('listener:check-pending');
    askPending();
    socket.on('connect', askPending);

    return () => {
      socket.off('call:incoming', onIncoming);
      socket.off('call:started', onStarted);
      socket.off('connect', askPending);
    };
  }, [navigation]);

  // Socket toot kar dobara jude (backend restart, network drop, app freeze)
  // to server ko current online state dobara batao
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    const onReconnect = () => {
      if (online) socket.emit('listener:online');
    };
    socket.on('connect', onReconnect);
    return () => socket.off('connect', onReconnect);
  }, [online]);

  const toggleOnline = (value) => {
    const socket = getSocket();
    if (!socket) return;
    socket.emit(value ? 'listener:online' : 'listener:offline');
    setOnline(value);
  };

  const accept = () => {
    const socket = getSocket();
    if (socket && incoming) socket.emit('call:accept', { requestId: incoming.requestId });
  };

  const reject = () => {
    const socket = getSocket();
    if (socket && incoming) socket.emit('call:reject', { requestId: incoming.requestId });
    setIncoming(null);
  };

  const takeRequest = async (id) => {
    try {
      await api.post(`/schedule/${id}/take`);
      loadQueue();
    } catch (err) {
      Alert.alert('Info', err.response?.data?.message || 'Try again');
      loadQueue();
    }
  };

  const completeRequest = async (id) => {
    try {
      await api.post(`/schedule/${id}/complete`);
      loadQueue();
    } catch {}
  };

  const logout = async () => {
    await AsyncStorage.multiRemove(['token', 'profile']);
    disconnectSocket();
    onLogout();
  };

  const initial = (name || 'T').charAt(0).toUpperCase();

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.hello}>Team member 🎧</Text>
          <Text style={styles.name}>{name || 'Listener'}</Text>
        </View>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initial}</Text>
        </View>
      </View>

      {/* Duty card */}
      <View style={[styles.dutyCard, online && styles.dutyCardOn]}>
        <View style={{ flex: 1 }}>
          <Text style={styles.dutyTitle}>
            {online ? '🟢 Duty par hain' : '⚪ Duty se bahar'}
          </Text>
          <Text style={styles.dutySub}>
            {online
              ? 'Calls aa sakti hain — app band ho to bhi notification milegi'
              : 'Toggle on karke calls lena shuru karein'}
          </Text>
        </View>
        <Switch
          value={online}
          onValueChange={toggleOnline}
          trackColor={{ false: '#CBD5E1', true: '#99F6E4' }}
          thumbColor={online ? C.primary : '#F8FAFC'}
        />
      </View>

      <Text style={styles.section}>📋 Callback / Scheduled queue</Text>
      <FlatList
        data={queue}
        keyExtractor={(item) => item._id}
        refreshing={false}
        onRefresh={loadQueue}
        contentContainerStyle={{ paddingBottom: 12 }}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardRow}>
              <View style={[styles.typeIcon, {
                backgroundColor: item.type === 'callback' ? C.primarySoft : C.warnSoft,
              }]}>
                <Text style={{ fontSize: 20 }}>{item.type === 'callback' ? '📲' : '⏰'}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>
                  {item.type === 'callback'
                    ? `Callback — ${item.user?.name || 'User'}`
                    : `${new Date(item.scheduledAt).toLocaleString()} — ${item.user?.name || 'User'}`}
                </Text>
                {item.note ? <Text style={styles.note}>“{item.note}”</Text> : null}
              </View>
            </View>
            {item.status === 'pending' ? (
              <TouchableOpacity style={styles.takeBtn} onPress={() => takeRequest(item._id)}>
                <Text style={styles.takeBtnText}>Main lunga/lungi</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.doneBtn} onPress={() => completeRequest(item._id)}>
                <Text style={styles.doneBtnText}>✓ Complete karein</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={{ fontSize: 34 }}>🎉</Text>
            <Text style={styles.emptyText}>Queue khali hai — sab kaam ho gaya!</Text>
          </View>
        }
      />

      <TouchableOpacity onPress={logout} style={styles.logoutBtn}>
        <Text style={styles.logout}>Logout</Text>
      </TouchableOpacity>

      {/* Incoming call popup */}
      <Modal visible={!!incoming} transparent animationType="fade">
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <View style={styles.ringCircle}>
              <Text style={{ fontSize: 42 }}>📞</Text>
            </View>
            <Text style={styles.modalTitle}>Incoming Call</Text>
            <Text style={styles.modalSub}>Ek user baat karna chahta hai</Text>
            <View style={styles.modalRow}>
              <TouchableOpacity style={[styles.modalBtn, styles.acceptBtn]} onPress={accept}>
                <Text style={styles.modalBtnText}>✓ Accept</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, styles.rejectBtn]} onPress={reject}>
                <Text style={styles.modalBtnText}>✕ Reject</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: C.bg },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginTop: 12, marginBottom: 18,
  },
  hello: { color: C.muted, fontSize: 14 },
  name: { color: C.text, fontSize: 24, fontWeight: '800' },
  avatar: {
    width: 48, height: 48, borderRadius: 24, backgroundColor: C.primary,
    alignItems: 'center', justifyContent: 'center', ...shadow,
  },
  avatarText: { color: '#fff', fontSize: 20, fontWeight: '700' },
  dutyCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: C.surface,
    borderRadius: radius.lg, padding: 18, marginBottom: 18, ...shadow,
  },
  dutyCardOn: { borderWidth: 1.5, borderColor: '#5EEAD4' },
  dutyTitle: { fontWeight: '800', color: C.text, fontSize: 16 },
  dutySub: { color: C.muted, fontSize: 12, marginTop: 4, paddingRight: 8 },
  section: { fontSize: 15, fontWeight: '800', color: C.text, marginBottom: 10 },
  card: {
    backgroundColor: C.surface, borderRadius: radius.md, padding: 14,
    marginBottom: 10, ...shadow,
  },
  cardRow: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  typeIcon: {
    width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center',
  },
  cardTitle: { fontWeight: '700', color: C.text, fontSize: 14 },
  note: { color: C.muted, marginTop: 2, fontStyle: 'italic', fontSize: 12 },
  takeBtn: {
    backgroundColor: C.primary, borderRadius: 999, paddingVertical: 9,
    alignItems: 'center', marginTop: 12,
  },
  takeBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  doneBtn: {
    backgroundColor: C.primarySoft, borderRadius: 999, paddingVertical: 9,
    alignItems: 'center', marginTop: 12,
  },
  doneBtnText: { color: C.primaryDark, fontWeight: '700', fontSize: 13 },
  empty: { alignItems: 'center', paddingVertical: 28 },
  emptyText: { color: C.muted, marginTop: 8 },
  logoutBtn: { alignSelf: 'center', padding: 10 },
  logout: { color: C.danger, fontWeight: '600' },
  modalBg: {
    flex: 1, backgroundColor: 'rgba(2,6,23,0.7)', alignItems: 'center', justifyContent: 'center',
  },
  modalCard: {
    backgroundColor: C.surface, borderRadius: radius.xl, padding: 28,
    width: '84%', alignItems: 'center', ...shadow,
  },
  ringCircle: {
    width: 92, height: 92, borderRadius: 46, backgroundColor: C.primarySoft,
    alignItems: 'center', justifyContent: 'center', marginBottom: 14,
  },
  modalTitle: { fontSize: 22, fontWeight: '800', color: C.text },
  modalSub: { color: C.muted, marginTop: 6, marginBottom: 22 },
  modalRow: { flexDirection: 'row', gap: 14 },
  modalBtn: { borderRadius: 999, paddingVertical: 13, paddingHorizontal: 26 },
  acceptBtn: { backgroundColor: C.success },
  rejectBtn: { backgroundColor: C.danger },
  modalBtnText: { color: '#fff', fontWeight: '700' },
});
