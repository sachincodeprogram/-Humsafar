import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { api } from '../api';
import { C, shadow, radius } from '../theme';

function fmtDuration(sec) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return m > 0 ? `${m} min ${s} sec` : `${s} sec`;
}

export default function HistoryScreen() {
  const [calls, setCalls] = useState([]);

  const load = async () => {
    try {
      const { data } = await api.get('/calls/history');
      setCalls(data);
    } catch {}
  };
  useEffect(() => { load(); }, []);

  return (
    <View style={styles.container}>
      <FlatList
        data={calls}
        keyExtractor={(item) => item._id}
        refreshing={false}
        onRefresh={load}
        contentContainerStyle={{ padding: 16 }}
        renderItem={({ item }) => {
          const who = item.listener?.name || 'Team member';
          return (
            <View style={styles.card}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{who.charAt(0).toUpperCase()}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{who}</Text>
                <Text style={styles.meta}>{new Date(item.startedAt).toLocaleString()}</Text>
              </View>
              <View style={styles.durChip}>
                <Text style={styles.durText}>⏱ {fmtDuration(item.durationSec)}</Text>
              </View>
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={{ fontSize: 34 }}>🕘</Text>
            <Text style={styles.emptyText}>Abhi koi call nahi hui</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: C.surface, borderRadius: radius.md, padding: 14,
    marginBottom: 10, ...shadow,
  },
  avatar: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: C.primarySoft,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { color: C.primary, fontWeight: '800', fontSize: 17 },
  name: { fontWeight: '700', color: C.text, fontSize: 15 },
  meta: { color: C.muted, fontSize: 12, marginTop: 2 },
  durChip: {
    backgroundColor: C.successSoft, borderRadius: 999, paddingVertical: 5, paddingHorizontal: 10,
  },
  durText: { color: '#047857', fontSize: 11, fontWeight: '700' },
  empty: { alignItems: 'center', paddingVertical: 40 },
  emptyText: { color: C.muted, marginTop: 8 },
});
