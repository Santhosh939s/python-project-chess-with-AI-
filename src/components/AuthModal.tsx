'use client';
import { useState } from 'react';
import { login, register } from '@/lib/api';

interface Props {
  onSuccess: (user: any) => void;
}

export default function AuthModal({ onSuccess }: Props) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = mode === 'login'
        ? await login(email, password)
        : await register(username, email, password);
      onSuccess(user);
    } catch (err: any) {
      // Clean up Firebase error messages
      const msg = err.message?.replace('Firebase: ', '').replace(/\(auth\/.*\)\.?/, '').trim();
      setError(msg || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-overlay">
      <div className="modal-card auth-card">
        <div className="auth-logo">♟ ChessAI</div>
        <div className="auth-tabs">
          <button className={`auth-tab ${mode === 'login' ? 'active' : ''}`} onClick={() => { setMode('login'); setError(''); }}>
            Sign In
          </button>
          <button className={`auth-tab ${mode === 'register' ? 'active' : ''}`} onClick={() => { setMode('register'); setError(''); }}>
            Register
          </button>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          {mode === 'register' && (
            <div className="auth-field">
              <label htmlFor="auth-username">Username</label>
              <input
                id="auth-username"
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="Choose a username"
                required
                minLength={3}
                maxLength={20}
              />
            </div>
          )}
          <div className="auth-field">
            <label htmlFor="auth-email">Email</label>
            <input
              id="auth-email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="your@email.com"
              autoComplete="email"
              required
            />
          </div>
          <div className="auth-field">
            <label htmlFor="auth-password">Password</label>
            <input
              id="auth-password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Min. 6 characters"
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              required
              minLength={6}
            />
          </div>

          {error && <div className="auth-error">{error}</div>}

          <button type="submit" className="btn btn-primary auth-submit" disabled={loading}>
            {loading
              ? <span className="thinking-dots"><span/><span/><span/></span>
              : (mode === 'login' ? 'Sign In' : 'Create Account')}
          </button>
        </form>

        {mode === 'register' && (
          <p className="auth-hint">
            🏆 Win games to climb ranks. The AI gets harder as you improve!
          </p>
        )}
      </div>
    </div>
  );
}
