import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  signInWithPopup,
  GoogleAuthProvider,
  type User,
} from 'firebase/auth';
import {
  doc, setDoc, getDoc, updateDoc, increment, deleteDoc, onSnapshot,
  collection, query, orderBy, limit, getDocs, where,
} from 'firebase/firestore';
import { getFirebaseAuth, getFirebaseDb } from './firebase';

// ─── Rank Tiers (0 to 1000+ Rating Points) ───────────────────────────────────
export const RANK_TIERS = [
  { name: 'Pawn',   min: 0,   max: 150,  depth: 2, color: '#94a3b8', emoji: '♙' },
  { name: 'Knight', min: 151, max: 350,  depth: 3, color: '#10b981', emoji: '♘' },
  { name: 'Bishop', min: 351, max: 550,  depth: 3, color: '#3b82f6', emoji: '♗' },
  { name: 'Rook',   min: 551, max: 750,  depth: 4, color: '#8b5cf6', emoji: '♖' },
  { name: 'Queen',  min: 751, max: 900,  depth: 4, color: '#f59e0b', emoji: '♛' },
  { name: 'King',   min: 901, max: Infinity, depth: 5, color: '#f43f5e', emoji: '♚' },
];

export function getTier(rating: number = 0) {
  const r = Math.max(0, rating);
  return RANK_TIERS.find(t => r >= t.min && r <= t.max) || RANK_TIERS[0];
}

export interface UserProfile {
  uid: string;
  username: string;
  userTag?: string;
  email: string;
  rating: number; // 0 to 1000+
  wins: number;
  losses: number;
  draws: number;
  gamesPlayed: number;
  createdAt: string;
}

export function compressUsername(raw: string): string {
  return raw.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
}

export function generateUserTag(uid: string): string {
  return `#${uid.slice(-4).toUpperCase()}`;
}

export function userWithTier(user: UserProfile) {
  const rating = user.rating ?? Math.min(1000, (user.wins || 0) * 30);
  const tier = getTier(rating);
  return { ...user, rating, rank: tier.name, rankColor: tier.color, rankEmoji: tier.emoji, aiDepth: tier.depth };
}

// ─── Auth ──────────────────────────────────────────────────────────────────────
export async function register(username: string, email: string, password: string): Promise<UserProfile> {
  const db = getFirebaseDb();
  const auth = getFirebaseAuth();

  const compressed = compressUsername(username);
  if (compressed.length < 3) throw new Error('Username must contain at least 3 alphanumeric characters');

  const snap = await getDoc(doc(db, 'usernames', compressed));
  if (snap.exists()) throw new Error('Username already taken');

  const cred = await createUserWithEmailAndPassword(auth, email, password);
  const tag = generateUserTag(cred.user.uid);
  const profile: UserProfile = {
    uid: cred.user.uid,
    username: username.trim(),
    userTag: tag,
    email,
    wins: 0, losses: 0, draws: 0, gamesPlayed: 0, rating: 0,
    createdAt: new Date().toISOString(),
  };
  await setDoc(doc(db, 'users', cred.user.uid), profile);
  await setDoc(doc(db, 'usernames', compressed), { uid: cred.user.uid, username: username.trim() });
  return profile;
}

export async function login(email: string, password: string): Promise<UserProfile> {
  const auth = getFirebaseAuth();
  const cred = await signInWithEmailAndPassword(auth, email, password);
  return getProfileById(cred.user.uid, cred.user);
}

export async function changeUsername(uid: string, currentUsername: string, newUsername: string): Promise<string> {
  const db = getFirebaseDb();
  const trimmed = newUsername.trim();
  const newCompressed = compressUsername(trimmed);
  const currentCompressed = compressUsername(currentUsername);

  if (newCompressed.length < 3) {
    throw new Error('Username must contain at least 3 alphanumeric characters');
  }

  if (newCompressed === currentCompressed) {
    return trimmed;
  }

  // Check if new compressed username exists in DB
  const snap = await getDoc(doc(db, 'usernames', newCompressed));
  if (snap.exists()) {
    throw new Error('Username is already taken by another player');
  }

  // Update user document
  await updateDoc(doc(db, 'users', uid), { username: trimmed });

  // Add new compressed entry and remove old compressed entry
  await setDoc(doc(db, 'usernames', newCompressed), { uid, username: trimmed });
  if (currentCompressed) {
    deleteDoc(doc(db, 'usernames', currentCompressed)).catch(() => {});
  }

  return trimmed;
}

export async function loginWithGoogle(): Promise<UserProfile> {
  const auth = getFirebaseAuth();
  const db = getFirebaseDb();
  const provider = new GoogleAuthProvider();
  const cred = await signInWithPopup(auth, provider);
  const uid = cred.user.uid;

  // Check if profile exists already
  const snap = await getDoc(doc(db, 'users', uid));
  if (snap.exists()) {
    const existing = snap.data() as UserProfile;
    if (!existing.userTag) {
      existing.userTag = generateUserTag(uid);
      await updateDoc(doc(db, 'users', uid), { userTag: existing.userTag });
    }
    return existing;
  }

  // First time — create profile using Google display name
  const rawName = cred.user.displayName || cred.user.email?.split('@')[0] || `player${uid.slice(0,4)}`;
  const compressed = compressUsername(rawName) || `player${uid.slice(0,4)}`;
  const username = rawName.slice(0, 20);
  const tag = generateUserTag(uid);
  const profile: UserProfile = {
    uid,
    username,
    userTag: tag,
    email: cred.user.email || '',
    wins: 0, losses: 0, draws: 0, gamesPlayed: 0, rating: 0,
    createdAt: new Date().toISOString(),
  };
  await setDoc(doc(db, 'users', uid), profile);
  await setDoc(doc(db, 'usernames', compressed), { uid, username });
  return profile;
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
export async function getProfileById(uid: string, firebaseUser?: User): Promise<UserProfile> {
  const db = getFirebaseDb();
  try {
    const snap = await getDoc(doc(db, 'users', uid));
    if (snap.exists()) {
      const profile = snap.data() as UserProfile;
      if (!profile.userTag) {
        profile.userTag = generateUserTag(uid);
        await updateDoc(doc(db, 'users', uid), { userTag: profile.userTag }).catch(() => {});
      }
      return profile;
    }
  } catch (e) {
    console.warn('Error fetching Firestore user profile:', e);
  }

  // Auto-recovery if logged in via Auth but doc is missing or errored
  if (firebaseUser) {
    const rawName = firebaseUser.displayName?.replace(/\s+/g, '').toLowerCase() || firebaseUser.email?.split('@')[0] || `player${uid.slice(0,4)}`;
    const username = rawName.slice(0, 20);
    const tag = generateUserTag(uid);
    const profile: UserProfile = {
      uid,
      username,
      userTag: tag,
      email: firebaseUser.email || '',
      wins: 0, losses: 0, draws: 0, gamesPlayed: 0, rating: 0,
      createdAt: new Date().toISOString(),
    };
    await setDoc(doc(db, 'users', uid), profile).catch(() => {});
    return profile;
  }

  throw new Error('Profile not found');
}

export async function updateStats(
  uid: string,
  result: 'win' | 'loss' | 'draw',
  movesCount: number = 0
): Promise<{ deltaScore: number }> {
  const db = getFirebaseDb();

  let deltaScore = 0;
  if (result === 'win') {
    deltaScore = movesCount < 10 ? 40 : movesCount < 30 ? 30 : 25;
  } else if (result === 'loss') {
    deltaScore = movesCount < 6 ? -10 : -15;
  } else {
    deltaScore = 0;
  }

  try {
    const snap = await getDoc(doc(db, 'users', uid));
    const currentRating = snap.exists() ? (snap.data().rating ?? Math.min(1000, (snap.data().wins || 0) * 30)) : 0;
    const newRating = Math.max(0, currentRating + deltaScore);

    await updateDoc(doc(db, 'users', uid), {
      rating: newRating,
      gamesPlayed: increment(1),
      ...(result === 'win'  ? { wins:   increment(1) } : {}),
      ...(result === 'loss' ? { losses: increment(1) } : {}),
      ...(result === 'draw' ? { draws:  increment(1) } : {}),
    });
  } catch (e) {
    console.warn('Error updating user stats:', e);
  }

  return { deltaScore };
}

export async function getLeaderboard(): Promise<UserProfile[]> {
  const db = getFirebaseDb();
  try {
    const q = query(collection(db, 'users'), orderBy('rating', 'desc'), limit(20));
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data() as UserProfile);
  } catch {
    const qFallback = query(collection(db, 'users'), orderBy('wins', 'desc'), limit(20));
    const snapFallback = await getDocs(qFallback);
    return snapFallback.docs.map(d => d.data() as UserProfile);
  }
}

// ─── Automated Matchmaking ───────────────────────────────────────────────────
export async function enterMatchmakingQueue(
  user: UserProfile,
  peerId: string,
  onMatched: (matchedData: { peerId: string; role: 'host' | 'guest'; oppName: string }) => void
): Promise<() => void> {
  const db = getFirebaseDb();
  const queueRef = collection(db, 'matchmaking_queue');
  const myUid = user?.uid || `user_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const myDocRef = doc(db, 'matchmaking_queue', myUid);

  let matched = false;

  // Function to process candidates in queue
  async function checkForOpponent(snapDocs: any[]) {
    if (matched) return;

    let bestMatch: any = null;
    let minDiff = Infinity;

    const myRating = user?.rating ?? Math.min(1000, (user?.wins || 0) * 30);

    for (const d of snapDocs) {
      const data = typeof d.data === 'function' ? d.data() : d;
      const age = Date.now() - (data?.createdAt || 0);

      // Ignore invalid entries
      if (!data || !data.uid || !data.peerId) continue;

      // Filter for valid active waiting players (excluding self)
      if (data.uid !== myUid && data.status === 'waiting') {
        const oppRating = data.rating ?? Math.min(1000, (data.wins || 0) * 30);
        const diff = Math.abs(oppRating - myRating);
        if (diff < minDiff) {
          minDiff = diff;
          bestMatch = data;
        }
      }
    }

    if (bestMatch && !matched) {
      matched = true;
      // Delete own queue doc so no one else picks us
      deleteDoc(myDocRef).catch(() => {});

      onMatched({
        peerId: bestMatch.peerId,
        role: 'guest',
        oppName: bestMatch.username || 'Opponent',
      });
    }
  }

  // 1. Listen to real-time changes on the entire matchmaking_queue collection
  const unsubCollection = onSnapshot(
    queueRef,
    (snapshot) => {
      if (!matched) checkForOpponent(snapshot.docs);
    },
    (err) => console.warn('Collection snapshot warning:', err)
  );

  // 3. Register self in queue as 'waiting'
  try {
    await setDoc(myDocRef, {
      uid: myUid,
      username: user?.username || 'Player',
      wins: user?.wins || 0,
      peerId,
      status: 'waiting',
      matchedPeerId: null,
      matchedName: null,
      matchedRole: null,
      createdAt: Date.now(),
    });
  } catch (e) {
    console.warn('Failed to set queue document:', e);
  }

  // Cleanup function
  return () => {
    matched = true;
    try { unsubCollection(); } catch {}
    deleteDoc(myDocRef).catch(() => {});
  };
}

export async function leaveMatchmakingQueue(uid: string) {
  const db = getFirebaseDb();
  try {
    await deleteDoc(doc(db, 'matchmaking_queue', uid));
  } catch {}
}
