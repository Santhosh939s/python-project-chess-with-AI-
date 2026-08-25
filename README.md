# ChessAI Web App ♟

A premium chess web application — **100% client-side, no backend needed**.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16 (React) |
| Chess Logic | chess.js |
| AI | Minimax + Alpha-Beta (runs in browser) |
| Auth & DB | Firebase (Auth + Firestore) |
| Online Play | PeerJS (WebRTC peer-to-peer) |
| Hosting | Vercel |

## Features
- 🤖 **Adaptive AI** — depth scales with your rank (Pawn depth-2 → King depth-5)
- 🌐 **Online Multiplayer** — share a room code, play peer-to-peer via WebRTC
- 🏆 **Firebase Rank System** — 6 tiers, wins/losses stored in Firestore
- 🎲 **Random color** assigned each game
- 🎨 Dark glassmorphism UI

## Setup

### 1. Firebase
1. Go to [Firebase Console](https://console.firebase.google.com)
2. Create a project → Enable **Authentication** (Email/Password) + **Firestore**
3. Copy your config

### 2. Environment Variables
```bash
cp .env.local.example .env.local
# Fill in your Firebase values
```

### 3. Run Locally
```bash
npm install
npm run dev
```

### 4. Deploy to Vercel
1. Push to GitHub
2. Import repo on [vercel.com](https://vercel.com)
3. Add Firebase env vars in Vercel → Settings → Environment Variables
4. Deploy!

## Firestore Rules (set in Firebase Console)
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{uid} {
      allow read: if true;
      allow write: if request.auth.uid == uid;
    }
    match /usernames/{username} {
      allow read: if true;
      allow create: if request.auth != null;
    }
  }
}
```

## AI — No Backend Needed
The chess AI (minimax + alpha-beta pruning) runs **entirely in your browser**.
Zero server costs. Zero latency. Works offline.