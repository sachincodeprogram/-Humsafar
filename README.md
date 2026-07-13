# Humsafar — Friendly Conversation Video Call App

Jab kisi ka koi dost na ho, wo hamari team se video call par baat kar sakta hai.
**Sirf friendly conversation — koi therapy/medical service nahi. Calls kabhi record nahi hoti (GPay/PhonePe jaisi privacy — screenshot bhi blocked hai).**

## Project Structure

```
ME/
├── backend/        Express + MongoDB + Socket.io + JWT + Agora tokens
├── user-app/       React Native app — users ke liye (blue theme)
└── listener-app/   React Native app — team members ke liye (green theme)
```

## Kaise chalayein (Development)

### 1. Agora account (ek baar)
1. https://console.agora.io par free account banao
2. Naya project banao (Secure mode: APP ID + Token)
3. `backend/.env` me `AGORA_APP_ID` aur `AGORA_APP_CERTIFICATE` daalo
4. Free tier: 10,000 minutes/month

### 2. Backend
```powershell
cd backend
# .env me MONGO_URI, JWT_SECRET, Agora keys check karo
npm run dev
```
Server: http://localhost:5000 (MongoDB chalna chahiye)

### 3. Apps (Android)
```powershell
cd user-app      # ya listener-app
npx react-native run-android
```
- **Emulator:** `src/config.js` me `http://10.0.2.2:5000` (already set)
- **Real phone:** apne PC ka LAN IP daalo, e.g. `http://192.168.1.5:5000`
  (PC aur phone same WiFi par hone chahiye)

## Call ka flow

1. User "Abhi Baat Karein" dabata hai → `POST /api/calls/request`
2. Backend online + free listener dhundta hai → socket se `call:incoming` bhejta hai
3. Listener Accept karta hai → dono ko Agora token + channel milta hai (`call:started`)
4. Koi free nahi → user **callback** ya **scheduled call** book karta hai
5. Listener app me queue dikhti hai — "Main lunga/lungi" se assign hota hai

## Privacy & Safety (day-1 se built-in)

- ❌ Call recording — backend me sirf metadata (kab, kitni der) save hota hai
- ❌ Screenshot/screen recording — `FLAG_SECURE` dono apps me (GPay jaisa)
- ✅ "Friendly conversation only" disclaimer app me
- ✅ JWT auth, passwords bcrypt-hashed

## Baad ke features (planned)

- Subscription (abhi sab free hai — `User.plan` field ready hai)
- Admin panel (listeners manage, reports)
- Report/block system
- Push notifications (scheduled call reminder ke liye)

## API Summary

| Method | Route | Kaun | Kya |
|--------|-------|------|-----|
| POST | /api/auth/user/register, /login | User | Account |
| POST | /api/auth/listener/register, /login | Listener | Account |
| POST | /api/calls/request | User | Talk Now |
| GET | /api/calls/history | Dono | Call history |
| POST | /api/schedule | User | Callback/scheduled book |
| GET | /api/schedule/mine | User | Apni requests |
| GET | /api/schedule/pending | Listener | Queue |
| POST | /api/schedule/:id/take, /complete | Listener | Assign/done |
| POST | /api/schedule/:id/cancel | User | Cancel |

**Socket events:** `listener:online/offline`, `call:incoming`, `call:accept/reject`, `call:started`, `call:end/ended`, `call:unavailable`
