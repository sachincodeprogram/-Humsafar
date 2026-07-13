import React, { useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Alert, FlatList, TextInput,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { api } from '../api';
import { C, shadow, radius } from '../theme';

const STATUS = {
  pending: { label: 'Pending', bg: C.warnSoft, fg: '#B45309' },
  assigned: { label: 'Team member mil gaya', bg: C.primarySoft, fg: C.primaryDark },
  completed: { label: 'Ho gayi ✓', bg: C.successSoft, fg: '#047857' },
  cancelled: { label: 'Cancelled', bg: '#F1F5F9', fg: C.muted },
};

export default function ScheduleScreen() {
  const [list, setList] = useState([]);
  const [note, setNote] = useState('');
  const [date, setDate] = useState(new Date(Date.now() + 60 * 60 * 1000));
  const [showPicker, setShowPicker] = useState(null);

  const load = async () => {
    try {
      const { data } = await api.get('/schedule/mine');
      setList(data);
    } catch {}
  };
  useEffect(() => { load(); }, []);

  const book = async (type) => {
    try {
      await api.post('/schedule', {
        type,
        scheduledAt: type === 'scheduled' ? date.toISOString() : undefined,
        note,
      });
      setNote('');
      Alert.alert('Ho gaya! 🎉', type === 'callback'
        ? 'Team member free hote hi aapko call karega.'
        : 'Aapki call schedule ho gayi.');
      load();
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Try again');
    }
  };

  const cancel = async (id) => {
    try {
      await api.post(`/schedule/${id}/cancel`);
      load();
    } catch {}
  };

  const onPickerChange = (event, selected) => {
    const mode = showPicker;
    setShowPicker(null);
    if (event.type === 'dismissed' || !selected) return;
    setDate(selected);
    if (mode === 'date') setShowPicker('time');
  };

  const Header = (
    <View>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Kab baat karna chahenge?</Text>
        <TextInput
          style={styles.input}
          placeholder="Kis baare me baat karni hai? (optional)"
          placeholderTextColor={C.muted}
          value={note} onChangeText={setNote}
        />

        <TouchableOpacity style={styles.optionCard} onPress={() => book('callback')} activeOpacity={0.8}>
          <View style={[styles.optionIcon, { backgroundColor: C.primarySoft }]}>
            <Text style={{ fontSize: 22 }}>📲</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.optionTitle}>Callback</Text>
            <Text style={styles.optionSub}>Jaise hi koi team member free ho, call aa jayegi</Text>
          </View>
          <Text style={styles.chev}>›</Text>
        </TouchableOpacity>

        <View style={styles.optionCard}>
          <View style={[styles.optionIcon, { backgroundColor: C.warnSoft }]}>
            <Text style={{ fontSize: 22 }}>⏰</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.optionTitle}>Scheduled call</Text>
            <TouchableOpacity onPress={() => setShowPicker('date')}>
              <Text style={styles.dateText}>{date.toLocaleString()} — badlein</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={styles.bookBtn} onPress={() => book('scheduled')}>
            <Text style={styles.bookBtnText}>Book</Text>
          </TouchableOpacity>
        </View>
      </View>

      {showPicker && (
        <DateTimePicker
          value={date} mode={showPicker} minimumDate={new Date()} onChange={onPickerChange}
        />
      )}

      <Text style={styles.section}>Meri requests</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={list}
        keyExtractor={(item) => item._id}
        refreshing={false}
        onRefresh={load}
        ListHeaderComponent={Header}
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
        renderItem={({ item }) => {
          const st = STATUS[item.status] || STATUS.pending;
          return (
            <View style={styles.reqCard}>
              <View style={{ flex: 1 }}>
                <Text style={styles.reqTitle}>
                  {item.type === 'callback'
                    ? '📲 Callback'
                    : `⏰ ${new Date(item.scheduledAt).toLocaleString()}`}
                </Text>
                {item.note ? <Text style={styles.reqNote}>“{item.note}”</Text> : null}
                <View style={[styles.chip, { backgroundColor: st.bg }]}>
                  <Text style={[styles.chipText, { color: st.fg }]}>{st.label}</Text>
                </View>
              </View>
              {['pending', 'assigned'].includes(item.status) && (
                <TouchableOpacity onPress={() => cancel(item._id)} style={styles.cancelBtn}>
                  <Text style={styles.cancel}>Cancel</Text>
                </TouchableOpacity>
              )}
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={{ fontSize: 34 }}>🗓️</Text>
            <Text style={styles.emptyText}>Abhi koi request nahi hai</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  card: { backgroundColor: C.surface, borderRadius: radius.lg, padding: 16, ...shadow },
  cardTitle: { fontSize: 17, fontWeight: '800', color: C.text, marginBottom: 12 },
  input: {
    borderWidth: 1, borderColor: C.border, borderRadius: radius.md,
    paddingHorizontal: 14, paddingVertical: 11, color: C.text,
    backgroundColor: '#F8FAFC', marginBottom: 12,
  },
  optionCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderWidth: 1, borderColor: C.border, borderRadius: radius.md,
    padding: 12, marginBottom: 10, backgroundColor: C.surface,
  },
  optionIcon: {
    width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center',
  },
  optionTitle: { fontWeight: '700', color: C.text, fontSize: 15 },
  optionSub: { color: C.muted, fontSize: 12, marginTop: 2 },
  dateText: { color: C.primary, fontSize: 12, marginTop: 2, fontWeight: '600' },
  chev: { fontSize: 26, color: C.muted },
  bookBtn: {
    backgroundColor: C.primary, borderRadius: 999, paddingVertical: 8, paddingHorizontal: 16,
  },
  bookBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  section: { fontSize: 15, fontWeight: '800', color: C.text, marginTop: 20, marginBottom: 10 },
  reqCard: {
    flexDirection: 'row', backgroundColor: C.surface, borderRadius: radius.md,
    padding: 14, marginBottom: 10, ...shadow,
  },
  reqTitle: { fontWeight: '700', color: C.text },
  reqNote: { color: C.muted, marginTop: 4, fontStyle: 'italic', fontSize: 13 },
  chip: {
    alignSelf: 'flex-start', borderRadius: 999, paddingVertical: 4,
    paddingHorizontal: 10, marginTop: 8,
  },
  chipText: { fontSize: 11, fontWeight: '700' },
  cancelBtn: { justifyContent: 'center', paddingLeft: 10 },
  cancel: { color: C.danger, fontWeight: '600', fontSize: 13 },
  empty: { alignItems: 'center', paddingVertical: 30 },
  emptyText: { color: C.muted, marginTop: 8 },
});
