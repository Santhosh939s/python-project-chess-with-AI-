import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  type User,
} from 'firebase/auth';
import {
  doc, setDoc, getDoc, updateDoc, increment,
  collection, query, orderBy, limit, getDocs,
} from 'firebase/firestore';
import { getFirebaseAuth, getFirebaseDb } from './firebase';

// ─── Rank Tiers ───────────────────────────────────────────────────────────────
export const RANK_TIERS = [
  { name: 'Pawn',   min: 0,   max: 4,   depth: 2, color: '#94a3b8', emoji: '♙' },
  { name: 'Knight', min: 5,   max: 14,  depth: 3, color: '#10b981', emoji: '♘' },
  { name: 'Bishop', min: 15,  max: 29,  depth: 3, color: '#3b82f6', emoji: '♗' },
  { name: 'Rook',   min: 30,  max: 49,  depth: 4, color: '#8b5cf6', emoji: '♖' },
  { name: 'Queen',  min: 50,  max: 99,  depth: 4, color: '#f59e0b', emoji: '♛' },
  { name: 'King',   min: 100, max: Infinity, depth: 5, color: '#f43f5e', emoji: '♚' },
];

export function getTier(wins: number) {
  return RANK_TIERS.find(t => wins >= t.min && wins <= t.max) || RANK_TIERS[0];
}

export interface UserProfile {
  uid: string;
  username: string;
  email: string;
  wins: number;
  losses: number;
  draws: number;
  gamesPlayed: number;
  createdAt: string;
}

export function userWithTier(user: UserProfile) {
  const tier = getTier(user.wins);
  return { ...user, rank: tier.name, rankColor: tier.color, rankEmoji: tier.emoji, aiDepth: tier.depth };
}

// ─── Auth ──────────────────────────────────────────────────────────────────────
export async function register(username: string, email: string, password: string): Promise<UserProfile> {
  const db = getFirebaseDb();
  const auth = getFirebaseAuth();

  const snap = await getDoc(doc(db, 'usernames', username.toLowerCase()));
  if (snap.exists()) throw new Error('Username already taken');

  const cred = await createUserWithEmailAndPassword(auth, email, password);
  const profile: UserProfile = {
    uid: cred.user.uid,
    username: username.toLowerCase(),
    email,
    wins: 0, losses: 0, draws: 0, gamesPlayed: 0,
    createdAt: new Date().toISOString(),
  };
  await setDoc(doc(db, 'users', cred.user.uid), profile);
  await setDoc(doc(db, 'usernames', username.toLowerCase()), { uid: cred.user.uid });
  return profile;
}

export async function login(email: string, password: string): Promise<UserProfile> {
  const auth = getFirebaseAuth();
  const cred = await signInWithEmailAndPassword(auth, email, password);
  return getProfileById(cred.user.uid);
}

export async function logout() {
  const auth = getFirebaseAuth();
  await signOut(auth);
}

export function onAuthChange(cb: (user: User | null) => void) {
  const auth = getFirebaseAuth();
  return onAuthStateChanged(auth, cb);
}

// ─── Profile ───────────────────────────────────────────────────────────────────
export async function getProfileById(uid: string): Promise<UserProfile> {
  const db = getFirebaseDb();
  const snap = await getDoc(doc(db, 'users', uid));
  if (!snap.exists()) throw new Error('Profile not found');
  return snap.data() as UserProfile;
}

export async function updateStats(uid: string, result: 'win' | 'loss' | 'draw'): Promise<void> {
  const db = getFirebaseDb();
  await updateDoc(doc(db, 'users', uid), {
    gamesPlayed: increment(1),
    ...(result === 'win'  ? { wins:   increment(1) } : {}),
    ...(result === 'loss' ? { losses: increment(1) } : {}),
    ...(result === 'draw' ? { draws:  increment(1) } : {}),
  });
}

export async function getLeaderboard(): Promise<UserProfile[]> {
  const db = getFirebaseDb();
  const q = query(collection(db, 'users'), orderBy('wins', 'desc'), limit(20));
  const snap = await getDocs(q);
  return snap.docs.map(d => d.data() as UserProfile);
}
