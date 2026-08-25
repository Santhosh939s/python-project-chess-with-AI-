'use client';
import { useState, useEffect } from 'react';
import AuthModal from '@/components/AuthModal';
import AIGame from '@/components/AIGame';
import OnlineGame from '@/components/OnlineGame';
import Leaderboard from '@/components/Leaderboard';
import { getCachedUser, getProfile, logout, getTier } from '@/lib/api';

type Screen = 'home' | 'ai' | 'online';

export default function HomePage() {
  const [screen, setScreen] = useState<Screen>('home');
  const [user, setUser] = useState<any>(null);
  const [showAuth, setShowAuth] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [pendingMode, setPendingMode] = useState<Screen | null>(null);
  const [notification, setNotification] = useState<string | null>(null);

  useEffect(() => {
    const cached = getCachedUser();
    if (cached) {
      setUser(cached);
      // Refresh from server
      getProfile().then(u => {
        setUser(u);
        localStorage.setItem('chess_user', JSON.stringify(u));
      }).catch(() => {});
    }
  }, []);

  function showNotification(msg: string) {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3500);
  }

  function handleAuthSuccess(u: any) {
    setUser(u);
    setShowAuth(false);
    if (pendingMode) {
      setScreen(pendingMode);
      setPendingMode(null);
    }
    showNotification(`Welcome, ${u.username}! 👋`);
  }

  function handlePlayMode(mode: Screen) {
    if (!user) {
      setPendingMode(mode);
      setShowAuth(true);
      return;
    }
    setScreen(mode);
  }

  function handleLogout() {
    logout();
    setUser(null);
    setScreen('home');
    showNotification('Signed out successfully');
  }

  function handleGameEnd(result: 'win' | 'loss' | 'draw') {
    // Refresh user profile to get updated stats
    if (user) {
      getProfile().then(u => {
        setUser(u);
        localStorage.setItem('chess_user', JSON.stringify(u));
        if (result === 'win') showNotification(`🏆 You won! Rank: ${u.rank}`);
        else if (result === 'draw') showNotification('🤝 It\'s a draw!');
        else showNotification('Better luck next time!');
      }).catch(() => {});
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
          <button className="btn btn-secondary" onClick={() => setShowLeaderboard(true)}>
            🏆 Leaderboard
          </button>

          {user ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 700 }}>{user.username}</div>
                <div style={{ fontSize: '0.7rem', fontWeight: 600 }} className="rank-badge">
                  <span style={{ color: tier?.color }}>{tier?.emoji} {tier?.name}</span>
                  <span style={{ color: 'var(--text-muted)', marginLeft: 6 }}>{user.wins}W · {user.losses}L</span>
                </div>
              </div>
              <button className="btn btn-secondary" onClick={handleLogout} style={{ fontSize: '0.78rem' }}>
                Sign Out
              </button>
            </div>
          ) : (
            <button className="btn btn-primary" onClick={() => setShowAuth(true)}>
              Sign In
            </button>
          )}
        </nav>
      </header>

      {/* Notification */}
      {notification && (
        <div className="notification-toast">{notification}</div>
      )}

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
                Challenge a powerful AI that adapts to your rank — or battle a friend in real-time online multiplayer.
                Your wins shape your destiny.
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

            {/* Decorative board preview */}
            <div className="hero-board">
              <div className="hero-board-inner">
                {Array.from({ length: 64 }, (_, i) => {
                  const r = Math.floor(i / 8);
                  const f = i % 8;
                  const isLight = (r + f) % 2 === 0;
                  const pieces: Record<number, string> = {
                    0: '♜', 1: '♞', 2: '♝', 3: '♛', 4: '♚', 5: '♝', 6: '♞', 7: '♜',
                    8: '♟', 9: '♟', 10: '♟', 11: '♟', 12: '♟', 13: '♟', 14: '♟', 15: '♟',
                    48: '♙', 49: '♙', 50: '♙', 51: '♙', 52: '♙', 53: '♙', 54: '♙', 55: '♙',
                    56: '♖', 57: '♘', 58: '♗', 59: '♕', 60: '♔', 61: '♗', 62: '♘', 63: '♖',
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
            <div className="feature-card glass-card">
              <div className="feature-icon">🤖</div>
              <h3 className="feature-title">Adaptive AI</h3>
              <p className="feature-desc">
                The AI difficulty scales with your rank. Begin at Pawn level (depth 2) and face a King-level threat (depth 5) as you win more games.
              </p>
            </div>
            <div className="feature-card glass-card">
              <div className="feature-icon">🌐</div>
              <h3 className="feature-title">Real-Time Online</h3>
              <p className="feature-desc">
                Instantly matched with a live opponent via WebSocket. Colors are randomly assigned — no picking sides!
              </p>
            </div>
            <div className="feature-card glass-card">
              <div className="feature-icon">🏆</div>
              <h3 className="feature-title">Rank System</h3>
              <p className="feature-desc">
                6 ranks: Pawn → Knight → Bishop → Rook → Queen → King. Every win pushes your rank higher and the AI gets harder.
              </p>
            </div>
          </section>

          {/* Rank tiers */}
          <section className="tiers-section">
            <h2 className="section-title">Rank Progression</h2>
            <div className="tiers-grid">
              {[
                { emoji: '♙', name: 'Pawn',   wins: '0–4 wins',    depth: 2, color: '#94a3b8' },
                { emoji: '♘', name: 'Knight', wins: '5–14 wins',   depth: 3, color: '#10b981' },
                { emoji: '♗', name: 'Bishop', wins: '15–29 wins',  depth: 3, color: '#3b82f6' },
                { emoji: '♖', name: 'Rook',   wins: '30–49 wins',  depth: 4, color: '#8b5cf6' },
                { emoji: '♛', name: 'Queen',  wins: '50–99 wins',  depth: 4, color: '#f59e0b' },
                { emoji: '♚', name: 'King',   wins: '100+ wins',   depth: 5, color: '#f43f5e' },
              ].map(t => (
                <div key={t.name} className="tier-card glass-card" style={{ borderColor: `${t.color}33` }}>
                  <span className="tier-emoji" style={{ color: t.color }}>{t.emoji}</span>
                  <span className="tier-name" style={{ color: t.color }}>{t.name}</span>
                  <span className="tier-wins">{t.wins}</span>
                  <span className="tier-depth">AI Depth {t.depth}</span>
                </div>
              ))}
            </div>
          </section>
        </main>
      )}

      {screen === 'ai' && user && (
        <AIGame
          user={user}
          onGameEnd={handleGameEnd}
          onBack={() => setScreen('home')}
        />
      )}

      {screen === 'online' && user && (
        <OnlineGame
          user={user}
          onGameEnd={handleGameEnd}
          onBack={() => setScreen('home')}
        />
      )}

      {showAuth && <AuthModal onSuccess={handleAuthSuccess} />}
      {showLeaderboard && <Leaderboard onClose={() => setShowLeaderboard(false)} />}
    </div>
  );
}
