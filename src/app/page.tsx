'use client';
export const dynamic = 'force-dynamic';
import { useState, useEffect } from 'react';
import AuthModal from '@/components/AuthModal';
import AIGame from '@/components/AIGame';
import OnlineGame from '@/components/OnlineGame';
import Leaderboard from '@/components/Leaderboard';
import {
  onAuthChange, getProfileById, logout,
  updateStats, userWithTier, getTier,
  type UserProfile,
} from '@/lib/api';

type Screen = 'home' | 'ai' | 'online';

export default function HomePage() {
  const [screen, setScreen] = useState<Screen>('home');
  const [user, setUser] = useState<any>(null);
  const [showAuth, setShowAuth] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [pendingMode, setPendingMode] = useState<Screen | null>(null);
  const [notification, setNotification] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Listen to Firebase auth state
  useEffect(() => {
    const unsub = onAuthChange(async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const profile = await getProfileById(firebaseUser.uid);
          setUser(userWithTier(profile));
        } catch {
          setUser(null);
        }
      } else {
        setUser(null);
      }
      setAuthLoading(false);
    });
    return unsub;
  }, []);

  function showToast(msg: string) {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3500);
  }

  function handleAuthSuccess(profile: UserProfile) {
    setUser(userWithTier(profile));
    setShowAuth(false);
    showToast(`Welcome, ${profile.username}! 👋`);
    if (pendingMode) { setScreen(pendingMode); setPendingMode(null); }
  }

  function handlePlayMode(mode: Screen) {
    if (!user) { setPendingMode(mode); setShowAuth(true); return; }
    setScreen(mode);
  }

  async function handleLogout() {
    await logout();
    setUser(null);
    setScreen('home');
    showToast('Signed out successfully');
  }

  async function handleGameEnd(result: 'win' | 'loss' | 'draw') {
    // Update Firebase stats
    if (user?.uid) {
      try {
        await updateStats(user.uid, result);
        const fresh = await getProfileById(user.uid);
        setUser(userWithTier(fresh));
        if (result === 'win')  showToast(`🏆 You won! Rank: ${getTier(fresh.wins).name}`);
        else if (result === 'draw') showToast('🤝 It\'s a draw!');
        else showToast('Better luck next time!');
      } catch {}
    }
    setScreen('home');
  }

  const tier = user ? getTier(user.wins) : null;

  return (
    <div className="app-layout">
      {/* Header */}
      <header className="app-header">
        <div className="app-logo">
          <span className="app-logo-icon">♟</span>
          ChessAI
        </div>
        <nav style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <button className="btn btn-secondary" onClick={() => setShowLeaderboard(true)}>🏆 Leaderboard</button>

          {authLoading ? (
            <div style={{ width: 80, height: 36, background: 'rgba(255,255,255,0.05)', borderRadius: 10 }} />
          ) : user ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 700 }}>{user.username}</div>
                <div style={{ fontSize: '0.7rem', fontWeight: 600, display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                  <span style={{ color: tier?.color }}>{tier?.emoji} {tier?.name}</span>
                  <span style={{ color: 'var(--text-muted)' }}>{user.wins}W · {user.losses}L</span>
                </div>
              </div>
              <button className="btn btn-secondary" onClick={handleLogout} style={{ fontSize: '0.78rem' }}>Sign Out</button>
            </div>
          ) : (
            <button className="btn btn-primary" onClick={() => setShowAuth(true)}>Sign In</button>
          )}
        </nav>
      </header>

      {/* Toast */}
      {notification && <div className="notification-toast">{notification}</div>}

      {/* Screens */}
      {screen === 'home' && (
        <main>
          {/* Hero */}
          <section className="hero-section">
            <div className="hero-content">
              <h1 className="hero-title">
                Chess.<br/>
                <span className="hero-gradient">Reimagined.</span>
              </h1>
              <p className="hero-subtitle">
                Challenge a powerful AI that adapts to your rank — or invite a friend to a real-time peer-to-peer game.
                No backend. Pure chess.
              </p>
              <div className="hero-buttons">
                <button className="btn btn-primary hero-btn" onClick={() => handlePlayMode('ai')}>
                  🤖 Play vs AI
                </button>
                <button className="btn btn-secondary hero-btn" onClick={() => handlePlayMode('online')}>
                  🌐 Play Online
                </button>
              </div>
            </div>

            {/* Decorative board */}
            <div className="hero-board">
              <div className="hero-board-inner">
                {Array.from({ length: 64 }, (_, i) => {
                  const r = Math.floor(i / 8), f = i % 8;
                  const isLight = (r + f) % 2 === 0;
                  const pieces: Record<number, string> = {
                    0:'♜',1:'♞',2:'♝',3:'♛',4:'♚',5:'♝',6:'♞',7:'♜',
                    8:'♟',9:'♟',10:'♟',11:'♟',12:'♟',13:'♟',14:'♟',15:'♟',
                    48:'♙',49:'♙',50:'♙',51:'♙',52:'♙',53:'♙',54:'♙',55:'♙',
                    56:'♖',57:'♘',58:'♗',59:'♕',60:'♔',61:'♗',62:'♘',63:'♖',
                  };
                  return (
                    <div key={i} className={`mini-square ${isLight ? 'light' : 'dark'}`}>
                      {pieces[i] && <span className={`mini-piece ${i < 32 ? 'black' : 'white'}`}>{pieces[i]}</span>}
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          {/* Features */}
          <section className="features-section">
            {[
              { icon: '🤖', title: 'Adaptive AI', desc: 'AI depth grows with your rank — from Pawn (easy) to King (brutal). All runs in your browser. No server needed.' },
              { icon: '🌐', title: 'Peer-to-Peer Online', desc: 'Create a room and share the code with a friend. Powered by WebRTC — zero backend, zero cost.' },
              { icon: '🏆', title: 'Firebase Rank System', desc: 'Your wins, losses and rank are stored in Firebase. Climb 6 tiers and watch the AI get tougher.' },
            ].map(f => (
              <div key={f.title} className="feature-card glass-card">
                <div className="feature-icon">{f.icon}</div>
                <h3 className="feature-title">{f.title}</h3>
                <p className="feature-desc">{f.desc}</p>
              </div>
            ))}
          </section>

          {/* Rank tiers */}
          <section className="tiers-section">
            <h2 className="section-title">Rank Progression</h2>
            <div className="tiers-grid">
              {[
                { emoji:'♙', name:'Pawn',   wins:'0–4',    depth:2, color:'#94a3b8' },
                { emoji:'♘', name:'Knight', wins:'5–14',   depth:3, color:'#10b981' },
                { emoji:'♗', name:'Bishop', wins:'15–29',  depth:3, color:'#3b82f6' },
                { emoji:'♖', name:'Rook',   wins:'30–49',  depth:4, color:'#8b5cf6' },
                { emoji:'♛', name:'Queen',  wins:'50–99',  depth:4, color:'#f59e0b' },
                { emoji:'♚', name:'King',   wins:'100+',   depth:5, color:'#f43f5e' },
              ].map(t => (
                <div key={t.name} className="tier-card glass-card" style={{ borderColor: `${t.color}33` }}>
                  <span className="tier-emoji" style={{ color: t.color }}>{t.emoji}</span>
                  <span className="tier-name"  style={{ color: t.color }}>{t.name}</span>
                  <span className="tier-wins">{t.wins} wins</span>
                  <span className="tier-depth">AI Depth {t.depth}</span>
                </div>
              ))}
            </div>
          </section>
        </main>
      )}

      {screen === 'ai' && user && (
        <AIGame user={user} onGameEnd={handleGameEnd} onBack={() => setScreen('home')} />
      )}

      {screen === 'online' && user && (
        <OnlineGame user={user} onGameEnd={handleGameEnd} onBack={() => setScreen('home')} />
      )}

      {showAuth && <AuthModal onSuccess={handleAuthSuccess} />}
      {showLeaderboard && <Leaderboard onClose={() => setShowLeaderboard(false)} />}
    </div>
  );
}
