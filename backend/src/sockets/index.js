const jwt = require('jsonwebtoken');
const Listener = require('../models/Listener');
const User = require('../models/User');
const Call = require('../models/Call');
const { buildRtcToken } = require('../utils/agora');
const { sendPush } = require('../utils/push');

// 45s: push se aane wale listener ko app kholne ka time milta hai
const RING_TIMEOUT_MS = 45000;

// In Agora channel: user always joins with uid 1, listener with uid 2
const USER_UID = 1;
const LISTENER_UID = 2;

let ioRef = null;
const userSockets = new Map(); // userId -> socket
const listenerSockets = new Map(); // listenerId -> socket
const pendingRequests = new Map(); // requestId -> { userId, listenerId, timer }

function initSockets(io) {
  ioRef = io;

  io.use((socket, next) => {
    try {
      const payload = jwt.verify(socket.handshake.auth.token, process.env.JWT_SECRET);
      socket.auth = payload; // { id, role }
      next();
    } catch {
      next(new Error('Unauthorized'));
    }
  });

  io.on('connection', (socket) => {
    const { id, role } = socket.auth;

    if (role === 'user') userSockets.set(id, socket);
    if (role === 'listener') {
      listenerSockets.set(id, socket);
      // Push notification se aaya listener: uski pending ring turant dikha do
      for (const [requestId, pending] of pendingRequests) {
        if (pending.listenerId === id) {
          socket.emit('call:incoming', { requestId });
        }
      }
    }

    // Dashboard mount hone ke baad app khud pending ring maangti hai
    // (connection ke waqt bhejne me race hai: UI listener tab tak bana nahi hota)
    socket.on('listener:check-pending', () => {
      if (role !== 'listener') return;
      console.log(`check-pending from ${id}, pending count: ${pendingRequests.size}`);
      for (const [requestId, pending] of pendingRequests) {
        if (pending.listenerId === id) {
          console.log(`re-emitting call:incoming ${requestId} to ${id}`);
          socket.emit('call:incoming', { requestId });
        }
      }
    });

    // ---- Listener availability ----
    socket.on('listener:online', async () => {
      if (role !== 'listener') return;
      await Listener.findByIdAndUpdate(id, { isOnline: true });
    });

    socket.on('listener:offline', async () => {
      if (role !== 'listener') return;
      await Listener.findByIdAndUpdate(id, { isOnline: false });
    });

    // ---- Listener answers an incoming call request ----
    socket.on('call:accept', async ({ requestId }) => {
      const pending = pendingRequests.get(requestId);
      if (!pending || pending.listenerId !== id) return;
      clearTimeout(pending.timer);
      pendingRequests.delete(requestId);

      const call = await Call.create({
        user: pending.userId,
        listener: id,
        channelName: `call_${requestId}`,
      });
      const listenerDoc = await Listener.findByIdAndUpdate(
        id, { isBusy: true, $inc: { totalCalls: 1 } }, { new: true }
      ).select('name');
      const userDoc = await User.findById(pending.userId).select('name');

      const channelName = call.channelName;
      // otherId/otherName: dusre party ki basic info — report/block UI ke liye chahiye
      const payloadFor = (uid, otherId, otherName) => ({
        callId: call._id.toString(),
        channelName,
        appId: process.env.AGORA_APP_ID,
        uid,
        token: buildRtcToken(channelName, uid),
        otherId,
        otherName,
      });

      const userSocket = userSockets.get(pending.userId);
      if (userSocket) userSocket.emit('call:started', payloadFor(USER_UID, id, listenerDoc?.name));
      socket.emit('call:started', payloadFor(LISTENER_UID, pending.userId, userDoc?.name));
    });

    socket.on('call:reject', ({ requestId }) => {
      const pending = pendingRequests.get(requestId);
      if (!pending || pending.listenerId !== id) return;
      clearTimeout(pending.timer);
      pendingRequests.delete(requestId);

      const userSocket = userSockets.get(pending.userId);
      if (userSocket) userSocket.emit('call:unavailable', { reason: 'rejected' });
    });

    // ---- Either side ends the call ----
    socket.on('call:end', async ({ callId }) => {
      const call = await Call.findById(callId);
      if (!call || call.status !== 'ongoing') return;

      call.endedAt = new Date();
      call.durationSec = Math.round((call.endedAt - call.startedAt) / 1000);
      call.status = 'completed';
      await call.save();
      await Listener.findByIdAndUpdate(call.listener, { isBusy: false });

      const other =
        role === 'user'
          ? listenerSockets.get(call.listener.toString())
          : userSockets.get(call.user.toString());
      if (other) other.emit('call:ended', { callId });
    });

    socket.on('disconnect', async () => {
      if (role === 'user') userSockets.delete(id);
      if (role === 'listener') {
        listenerSockets.delete(id);
        // isOnline ko nahi chhoo rahe: wo "duty par hu" ka manual toggle hai.
        // App band hone par bhi push se ring pahunchni chahiye.
        await Listener.findByIdAndUpdate(id, { isBusy: false });
      }
    });
  });
}

// Called from REST when a user taps "Talk Now".
// Returns { available: true, requestId } or { available: false }.
async function requestCall(userId) {
  const user = await User.findById(userId).select('blockedListeners');
  const candidates = (
    await Listener.find({
      isOnline: true,
      isBusy: false,
      isActive: true,
      _id: { $nin: user?.blockedListeners || [] },
    })
  ).filter((l) => !l.blockedUsers?.some((blockedId) => blockedId.toString() === userId));
  // Pehle live socket wala listener, warna push token wala (app band hogi to push se ring)
  const listener =
    candidates.find((l) => listenerSockets.has(l._id.toString())) ||
    candidates.find((l) => l.fcmToken);
  if (!listener) return { available: false };

  const listenerId = listener._id.toString();
  const requestId = `${Date.now()}_${userId.slice(-6)}`;

  const timer = setTimeout(() => {
    // Listener never answered
    pendingRequests.delete(requestId);
    const userSocket = userSockets.get(userId);
    if (userSocket) userSocket.emit('call:unavailable', { reason: 'timeout' });
  }, RING_TIMEOUT_MS);

  pendingRequests.set(requestId, { userId, listenerId, timer });

  const liveSocket = listenerSockets.get(listenerId);
  if (liveSocket) liveSocket.emit('call:incoming', { requestId });
  sendPush(listener.fcmToken, {
    title: '📞 Incoming Call',
    body: 'Ek user baat karna chahta hai — abhi app kholein',
    data: { type: 'incoming_call', requestId },
  });

  return { available: true, requestId };
}

module.exports = initSockets;
module.exports.requestCall = requestCall;
