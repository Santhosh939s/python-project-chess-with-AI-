import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, setPersistence, browserLocalPersistence, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';

let app: FirebaseApp;
let auth: Auth;
let db: Firestore;

function getFirebaseApp(): FirebaseApp {
  if (!app) {
    app = getApps().length
      ? getApps()[0]
      : initializeApp({
          apiKey:            process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
          authDomain:        process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
          projectId:         process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
          storageBucket:     process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
          messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
          appId:             process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
        });
  }
  return app;
}

export function getFirebaseAuth(): Auth {
  if (!auth) {
    auth = getAuth(getFirebaseApp());
    setPersistence(auth, browserLocalPersistence).catch(() => {});
  }
  return auth;
}

export function getFirebaseDb(): Firestore {
  if (!db) db = getFirestore(getFirebaseApp());
  return db;
}
