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

export function compressUsername(raw: string): string {
  return raw.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
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
    wins: 0, losses: 0, draws: 0, gamesPlayed: 0,
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
    wins: 0, losses: 0, draws: 0, gamesPlayed: 0,
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
      wins: 0, losses: 0, draws: 0, gamesPlayed: 0,
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
    deltaScore = movesCount < 6 ? 10 : movesCount < 16 ? 15 : 25;
  } else if (result === 'loss') {
    deltaScore = movesCount < 6 ? -5 : movesCount < 16 ? -10 : -15;
  } else {
    // Draw -> 0 score change, no points deducted on either side
    deltaScore = 0;
  }

  await updateDoc(doc(db, 'users', uid), {
    gamesPlayed: increment(1),
    ...(result === 'win'  ? { wins:   increment(1) } : {}),
    ...(result === 'loss' ? { losses: increment(1) } : {}),
    ...(result === 'draw' ? { draws:  increment(1) } : {}),
  });

  return { deltaScore };
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
  const myDocRef = doc(db, 'matchmaking_queue', user.uid);

  let matched = false;

  // Function to process candidates in queue
  async function checkForOpponent(snapDocs: any[]) {
    if (matched) return;

    let bestMatch: any = null;
    let minDiff = Infinity;

    for (const d of snapDocs) {
      const data = typeof d.data === 'function' ? d.data() : d;
      const age = Date.now() - (data.createdAt || 0);

      // Clean up stale entries older than 20 seconds
      if (data && data.uid && age > 20000) {
        deleteDoc(doc(db, 'matchmaking_queue', data.uid)).catch(() => {});
        continue;
      }

      // Filter for valid active waiting players
      if (data && data.uid && data.uid !== user.uid && data.status === 'waiting' && age <= 20000) {
        const diff = Math.abs((data.wins || 0) - (user.wins || 0));
        if (diff < minDiff) {
          minDiff = diff;
          bestMatch = data;
        }
      }
    }

    if (bestMatch && !matched) {
      matched = true;
      try {
        // Update target player's doc to matched
        await updateDoc(doc(db, 'matchmaking_queue', bestMatch.uid), {
          status: 'matched',
          matchedPeerId: peerId,
          matchedName: user.username,
          matchedRole: 'guest',
        });

        // Delete own queue doc
        deleteDoc(myDocRef).catch(() => {});

        onMatched({
          peerId: bestMatch.peerId,
          role: 'guest',
          oppName: bestMatch.username || 'Opponent',
        });
      } catch (e) {
        matched = false;
        console.warn('Match update error:', e);
      }
    }
  }

  // 1. Listen to real-time changes on the entire matchmaking_queue collection!
  const unsubCollection = onSnapshot(queueRef, (snapshot) => {
    if (!matched) {
      checkForOpponent(snapshot.docs);
    }
  });

  // 2. Also listen specifically to own document for when another player matches us!
  const unsubMyDoc = onSnapshot(myDocRef, (docSnap) => {
    if (docSnap.exists() && !matched) {
      const data = docSnap.data();
      if (data.status === 'matched' && data.matchedPeerId) {
        matched = true;

        onMatched({
          peerId: data.matchedPeerId,
          role: 'host',
          oppName: data.matchedName || 'Opponent',
        });

        deleteDoc(myDocRef).catch(() => {});
      }
    }
  });

  // 3. Register self in queue as 'waiting'
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

  // Cleanup function
  return () => {
    matched = true;
    unsubCollection();
    unsubMyDoc();
    deleteDoc(myDocRef).catch(() => {});
  };
}

export async function leaveMatchmakingQueue(uid: string) {
  const db = getFirebaseDb();
  try {
    await deleteDoc(doc(db, 'matchmaking_queue', uid));
  } catch {}
}
