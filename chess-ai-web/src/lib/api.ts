const SERVER_URL = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:4000';

function getHeaders() {
  const token = typeof window !== 'undefined' ? localStorage.getItem('chess_token') : null;
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function apiFetch(path: string, options?: RequestInit) {
  const res = await fetch(`${SERVER_URL}${path}`, {
    ...options,
    headers: { ...getHeaders(), ...(options?.headers ?? {}) },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

export async function register(username: string, password: string) {
  const data = await apiFetch('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
  localStorage.setItem('chess_token', data.token);
  localStorage.setItem('chess_user', JSON.stringify(data.user));
  return data.user;
}

export async function login(username: string, password: string) {
  const data = await apiFetch('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
  localStorage.setItem('chess_token', data.token);
  localStorage.setItem('chess_user', JSON.stringify(data.user));
  return data.user;
}

export async function getProfile() {
  const data = await apiFetch('/api/profile');
  return data.user;
}

export async function getLeaderboard() {
  const data = await apiFetch('/api/leaderboard');
  return data.leaderboard;
}

export function logout() {
  localStorage.removeItem('chess_token');
  localStorage.removeItem('chess_user');
}

export function getCachedUser() {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem('chess_user');
  return raw ? JSON.parse(raw) : null;
}

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
