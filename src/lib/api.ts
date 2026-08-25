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
  userTag: string;
  email: string;
  wins: number;
  losses: number;
  draws: number;
  gamesPlayed: number;
  createdAt: string;
}

export function generateUserTag(uid: string): string {
  return `#${uid.slice(-4).toUpperCase()}`;
}

export function userWithTier(user: UserProfile) {
  const tier = getTier(user.wins);
  const tag = user.userTag || generateUserTag(user.uid);
  return { ...user, userTag: tag, rank: tier.name, rankColor: tier.color, rankEmoji: tier.emoji, aiDepth: tier.depth };
}

// ─── Auth ──────────────────────────────────────────────────────────────────────
export async function register(username: string, email: string, password: string): Promise<UserProfile> {
  const db = getFirebaseDb();
  const auth = getFirebaseAuth();

  const snap = await getDoc(doc(db, 'usernames', username.toLowerCase()));
  if (snap.exists()) throw new Error('Username already taken');

  const cred = await createUserWithEmailAndPassword(auth, email, password);
  const tag = generateUserTag(cred.user.uid);
  const profile: UserProfile = {
    uid: cred.user.uid,
    username: username.toLowerCase(),
    userTag: tag,
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
  return getProfileById(cred.user.uid, cred.user);
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
  const rawName = cred.user.displayName?.replace(/\s+/g, '').toLowerCase() || `player${uid.slice(0,6)}`;
  const username = rawName.slice(0, 20);
  const tag = generateUserTag(uid);
  const profile: UserProfile = {
    uid,
    username,
    userTag: tag,
    email: cred.user.email || '',
    wins: 0, losses: 0, draws: 0, gamesPlayed: 0,
    createdAt: new Date().toISOString(),
  };
  await setDoc(doc(db, 'users', uid), profile);
  await setDoc(doc(db, 'usernames', username), { uid });
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
      wins: 0, losses: 0, draws: 0, gamesPlayed: 0,
      createdAt: new Date().toISOString(),
    };
    await setDoc(doc(db, 'users', uid), profile).catch(() => {});
    return profile;
  }

  throw new Error('Profile not found');
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

// ─── Automated Matchmaking ───────────────────────────────────────────────────
export async function enterMatchmakingQueue(
  user: UserProfile,
  peerId: string,
  onMatched: (matchedData: { peerId: string; role: 'host' | 'guest'; oppName: string }) => void
): Promise<() => void> {
  const db = getFirebaseDb();
  const queueRef = collection(db, 'matchmaking_queue');

  // Query players currently waiting in queue
  const q = query(queueRef, where('status', '==', 'waiting'));
  const snap = await getDocs(q);

  let bestMatch: any = null;
  let minDiff = Infinity;

  snap.forEach((d) => {
    const data = d.data();
    // Exclude self and expired entries (> 2 mins old)
    if (data.uid !== user.uid && Date.now() - (data.createdAt || 0) < 120000) {
      const diff = Math.abs((data.wins || 0) - (user.wins || 0));
      if (diff < minDiff) {
        minDiff = diff;
        bestMatch = data;
      }
    }
  });

  if (bestMatch) {
    // Found a match! Pair up with bestMatch
    const matchedRef = doc(db, 'matchmaking_queue', bestMatch.uid);
    await updateDoc(matchedRef, {
      status: 'matched',
      matchedPeerId: peerId,
      matchedName: user.username,
      matchedRole: 'guest',
    });

    onMatched({
      peerId: bestMatch.peerId,
      role: 'guest',
      oppName: bestMatch.username || 'Opponent',
    });

    return () => {};
  } else {
    // No one currently waiting: register in queue and listen for someone joining us
    const myDocRef = doc(db, 'matchmaking_queue', user.uid);
    await setDoc(myDocRef, {
      uid: user.uid,
      username: user.username,
      wins: user.wins || 0,
      peerId,
      status: 'waiting',
      matchedPeerId: null,
      matchedName: null,
      matchedRole: null,
      createdAt: Date.now(),
    });

    const unsub = onSnapshot(myDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.status === 'matched' && data.matchedPeerId) {
          onMatched({
            peerId: data.matchedPeerId,
            role: 'host',
            oppName: data.matchedName || 'Opponent',
          });
          deleteDoc(myDocRef).catch(() => {});
        }
      }
    });

    return () => {
      unsub();
      deleteDoc(myDocRef).catch(() => {});
    };
  }
}

export async function leaveMatchmakingQueue(uid: string) {
  const db = getFirebaseDb();
  try {
    await deleteDoc(doc(db, 'matchmaking_queue', uid));
  } catch {}
}
