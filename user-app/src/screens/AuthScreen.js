import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, Alert,
  ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../api';
import { C, shadow, radius } from '../theme';

export default function AuthScreen({ onLoggedIn }) {
  const [mode, setMode] = useState('login');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!phone || !password || (mode === 'register' && !name)) {
      Alert.alert('Adhura form', 'Sabhi fields bharein');
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.post(`/auth/user/${mode}`, { name, phone, password });
      await AsyncStorage.setItem('token', data.token);
      await AsyncStorage.setItem('profile', JSON.stringify(data.profile));
      onLoggedIn(data.token);
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Kuch galat ho gaya');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.logoWrap}>
          <View style={styles.logoCircle}>
            <Text style={styles.logoEmoji}>🤝</Text>
          </View>
          <Text style={styles.logo}>Humsafar</Text>
          <Text style={styles.tagline}>Jab koi baat karne wala na ho, hum hain</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            {mode === 'login' ? 'Wapas swagat hai 👋' : 'Naya account banayein'}
          </Text>

          {mode === 'register' && (
            <View style={styles.inputWrap}>
              <Text style={styles.label}>Naam</Text>
              <TextInput
                style={styles.input} placeholder="Aapka naam"
                placeholderTextColor={C.muted} value={name} onChangeText={setName}
              />
            </View>
          )}
          <View style={styles.inputWrap}>
            <Text style={styles.label}>Phone number</Text>
            <TextInput
              style={styles.input} placeholder="10 digit number" keyboardType="phone-pad"
              placeholderTextColor={C.muted} value={phone} onChangeText={setPhone}
            />
          </View>
          <View style={styles.inputWrap}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input} placeholder="••••••••" secureTextEntry
              placeholderTextColor={C.muted} value={password} onChangeText={setPassword}
            />
          </View>

          <TouchableOpacity style={styles.button} onPress={submit} disabled={loading} activeOpacity={0.85}>
            {loading ? <ActivityIndicator color="#fff" /> : (
              <Text style={styles.buttonText}>
                {mode === 'login' ? 'Login karein' : 'Account banayein'}
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => setMode(mode === 'login' ? 'register' : 'login')}>
            <Text style={styles.switchText}>
              {mode === 'login' ? 'Naye hain? Account banayein' : 'Pehle se account hai? Login karein'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.disclaimerCard}>
          <Text style={styles.disclaimerTitle}>🔒 Aapki privacy, hamara vaada</Text>
          <Text style={styles.disclaimer}>
            Ye app sirf friendly conversation ke liye hai — koi therapy ya medical service
            nahi. Calls kabhi record nahi hoti aur screenshot bhi block hai.
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, justifyContent: 'center', padding: 20, backgroundColor: C.bg },
  logoWrap: { alignItems: 'center', marginBottom: 24 },
  logoCircle: {
    width: 84, height: 84, borderRadius: 42, backgroundColor: C.primarySoft,
    alignItems: 'center', justifyContent: 'center', marginBottom: 12, ...shadow,
  },
  logoEmoji: { fontSize: 40 },
  logo: { fontSize: 32, fontWeight: '800', color: C.text, letterSpacing: 0.5 },
  tagline: { color: C.muted, marginTop: 6, fontSize: 14 },
  card: {
    backgroundColor: C.surface, borderRadius: radius.lg, padding: 20, ...shadow,
  },
  cardTitle: { fontSize: 18, fontWeight: '700', color: C.text, marginBottom: 16 },
  inputWrap: { marginBottom: 14 },
  label: { fontSize: 13, fontWeight: '600', color: C.muted, marginBottom: 6 },
  input: {
    borderWidth: 1, borderColor: C.border, borderRadius: radius.md,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 16,
    color: C.text, backgroundColor: '#F8FAFC',
  },
  button: {
    backgroundColor: C.primary, borderRadius: radius.md, paddingVertical: 15,
    alignItems: 'center', marginTop: 4, ...shadow,
  },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  switchText: { textAlign: 'center', color: C.primary, marginTop: 16, fontWeight: '600' },
  disclaimerCard: {
    backgroundColor: C.primarySoft, borderRadius: radius.md, padding: 14, marginTop: 20,
  },
  disclaimerTitle: { fontWeight: '700', color: C.primaryDark, marginBottom: 4, fontSize: 13 },
  disclaimer: { color: C.primaryDark, fontSize: 12, lineHeight: 18, opacity: 0.85 },
});
