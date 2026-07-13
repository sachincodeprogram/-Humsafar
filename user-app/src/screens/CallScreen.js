import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, PermissionsAndroid, Platform, StatusBar,
} from 'react-native';
import {
  createAgoraRtcEngine, ChannelProfileType, ClientRoleType, RtcSurfaceView,
} from 'react-native-agora';
import { getSocket } from '../socket';

async function askPermissions() {
  if (Platform.OS === 'android') {
    await PermissionsAndroid.requestMultiple([
      PermissionsAndroid.PERMISSIONS.CAMERA,
      PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
    ]);
  }
}

function fmtTime(sec) {
  const m = String(Math.floor(sec / 60)).padStart(2, '0');
  const s = String(sec % 60).padStart(2, '0');
  return `${m}:${s}`;
}

export default function CallScreen({ route, navigation }) {
  const { callId, channelName, appId, uid, token } = route.params;
  const engineRef = useRef(null);
  const [remoteUid, setRemoteUid] = useState(null);
  const [joined, setJoined] = useState(false);
  const [muted, setMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    let engine;
    (async () => {
      await askPermissions();
      engine = createAgoraRtcEngine();
      engineRef.current = engine;
      console.log('[Call] mounting, channel=', channelName, 'uid=', uid, 'appId?', !!appId, 'token?', !!token);
      engine.initialize({
        appId,
        channelProfile: ChannelProfileType.ChannelProfileCommunication,
      });
      engine.registerEventHandler({
        onJoinChannelSuccess: () => {
          console.log('[Call] JOINED channel');
          setJoined(true);
        },
        onUserJoined: (_conn, rUid) => {
          console.log('[Call] REMOTE joined uid=', rUid);
          setRemoteUid(rUid);
        },
        onUserOffline: (_conn, rUid, reason) => {
          console.log('[Call] REMOTE left uid=', rUid, 'reason=', reason);
          setRemoteUid(null);
          endCall(); // dusra bandh kar de to call khatam
        },
        onError: (err, msg) => console.log('[Call] AGORA ERROR', err, msg),
        onConnectionStateChanged: (_conn, state, reason) =>
          console.log('[Call] conn state=', state, 'reason=', reason),
      });
      engine.enableVideo();
      engine.startPreview();
      engine.joinChannel(token, channelName, uid, {
        clientRoleType: ClientRoleType.ClientRoleBroadcaster,
      });
    })();

    const socket = getSocket();
    const onEnded = () => cleanupAndLeave();
    if (socket) socket.on('call:ended', onEnded);

    return () => {
      if (socket) socket.off('call:ended', onEnded);
      if (engine) {
        engine.leaveChannel();
        engine.release();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cleanupAndLeave = () => {
    navigation.goBack();
  };

  const endCall = () => {
    const socket = getSocket();
    if (socket) socket.emit('call:end', { callId });
    cleanupAndLeave();
  };

  const toggleMute = () => {
    engineRef.current?.muteLocalAudioStream(!muted);
    setMuted(!muted);
  };

  const toggleCamera = () => {
    engineRef.current?.muteLocalVideoStream(!cameraOff);
    setCameraOff(!cameraOff);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />

      {remoteUid !== null ? (
        <RtcSurfaceView style={styles.remote} canvas={{ uid: remoteUid }} />
      ) : (
        <View style={[styles.remote, styles.waiting]}>
          <View style={styles.waitCircle}>
            <Text style={{ fontSize: 40 }}>💙</Text>
          </View>
          <Text style={styles.waitingText}>
            {joined ? 'Dusre ka intezar hai…' : 'Connect ho rahe hain…'}
          </Text>
        </View>
      )}

      {/* Top bar */}
      <View style={styles.topBar}>
        <View style={styles.livePill}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>{fmtTime(elapsed)}</Text>
        </View>
        <View style={styles.securePill}>
          <Text style={styles.secureText}>🔒 Private — no recording</Text>
        </View>
      </View>

      {joined && !cameraOff && (
        <View style={styles.localWrap}>
          <RtcSurfaceView style={styles.local} canvas={{ uid: 0 }} zOrderMediaOverlay />
        </View>
      )}

      <View style={styles.controls}>
        <TouchableOpacity
          style={[styles.controlBtn, muted && styles.controlActive]} onPress={toggleMute}
        >
          <Text style={styles.controlText}>{muted ? '🔇' : '🎤'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.controlBtn, styles.endBtn]} onPress={endCall}>
          <Text style={styles.controlText}>📵</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.controlBtn, cameraOff && styles.controlActive]} onPress={toggleCamera}
        >
          <Text style={styles.controlText}>{cameraOff ? '🚫' : '📷'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B1120' },
  remote: { flex: 1 },
  waiting: { alignItems: 'center', justifyContent: 'center' },
  waitCircle: {
    width: 110, height: 110, borderRadius: 55, backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 18,
  },
  waitingText: { color: 'rgba(255,255,255,0.85)', fontSize: 16, fontWeight: '600' },
  topBar: {
    position: 'absolute', top: 48, left: 16, right: 16,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  livePill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(0,0,0,0.45)', borderRadius: 999,
    paddingVertical: 6, paddingHorizontal: 12,
  },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#22C55E' },
  liveText: { color: '#fff', fontWeight: '700', fontVariant: ['tabular-nums'] },
  securePill: {
    backgroundColor: 'rgba(0,0,0,0.45)', borderRadius: 999,
    paddingVertical: 6, paddingHorizontal: 12,
  },
  secureText: { color: 'rgba(255,255,255,0.9)', fontSize: 11, fontWeight: '600' },
  localWrap: {
    position: 'absolute', top: 100, right: 16, width: 112, height: 164,
    borderRadius: 16, overflow: 'hidden', borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  local: { flex: 1 },
  controls: {
    position: 'absolute', bottom: 44, left: 0, right: 0,
    flexDirection: 'row', justifyContent: 'center', gap: 22,
  },
  controlBtn: {
    width: 62, height: 62, borderRadius: 31, backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center', justifyContent: 'center',
  },
  controlActive: { backgroundColor: 'rgba(255,255,255,0.38)' },
  endBtn: { backgroundColor: '#EF4444', width: 72, height: 72, borderRadius: 36 },
  controlText: { fontSize: 26 },
});
