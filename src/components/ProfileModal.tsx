'use client';
import { useState } from 'react';
import { changeUsername, getTier, type UserProfile } from '@/lib/api';

interface Props {
  user: UserProfile;
  onUpdateUser: (updatedUser: UserProfile) => void;
  onClose: () => void;
}

export default function ProfileModal({ user, onUpdateUser, onClose }: Props) {
  const [newUsername, setNewUsername] = useState(user.username);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const tier = getTier(user.wins || 0);

  async function handleSaveUsername(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!newUsername.trim()) {
      setError('Username cannot be empty');
      return;
    }

    if (newUsername.trim() === user.username) {
      setSuccess('No changes made');
      return;
    }

    setLoading(true);

    try {
      const updatedName = await changeUsername(user.uid, user.username, newUsername);
      const updatedUser: UserProfile = { ...user, username: updatedName };
      onUpdateUser(updatedUser);
      setSuccess('Username successfully updated! 🎉');
    } catch (err: any) {
      setError(err.message || 'Failed to update username');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: 440, width: '90%' }}>
        <button className="modal-close" onClick={onClose}>×</button>

        {/* Profile Banner */}
        <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
          <div style={{
            fontSize: '3rem',
            width: 72,
            height: 72,
            lineHeight: '72px',
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: '50%',
            margin: '0 auto 0.75rem',
            boxShadow: '0 0 20px rgba(139,92,246,0.3)'
          }}>
            👤
          </div>
          <h2 className="modal-title" style={{ margin: 0, fontSize: '1.4rem' }}>
            {user.username} <span style={{ color: 'var(--accent-light)', fontSize: '0.85rem' }}>{user.userTag}</span>
          </h2>
          <div style={{ fontSize: '0.85rem', color: tier.color, fontWeight: 700, marginTop: 4 }}>
            {tier.emoji} {tier.name} Rank
          </div>
        </div>

        {/* Stats Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '0.5rem',
          marginBottom: '1.5rem',
          background: 'rgba(255,255,255,0.03)',
          padding: '0.85rem',
          borderRadius: 12,
          border: '1px solid rgba(255,255,255,0.08)'
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#4ade80' }}>{user.wins || 0}</div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Wins</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#f87171' }}>{user.losses || 0}</div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Losses</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#93c5fd' }}>{user.draws || 0}</div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Draws</div>
          </div>
        </div>

        {/* Edit Username Section */}
        <form onSubmit={handleSaveUsername}>
          <div className="form-group" style={{ marginBottom: '1rem' }}>
            <label className="form-label">Unique Display Username</label>
            <input
              type="text"
              className="form-input"
              value={newUsername}
              onChange={e => setNewUsername(e.target.value)}
              placeholder="Enter unique username"
              maxLength={20}
              required
            />
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', marginTop: 4 }}>
              Usernames are checked for uniqueness across all players in database.
            </span>
          </div>

          {error && <div className="auth-error" style={{ marginBottom: '1rem' }}>{error}</div>}
          {success && (
            <div style={{
              background: 'rgba(74, 222, 128, 0.15)',
              border: '1px solid rgba(74, 222, 128, 0.4)',
              color: '#4ade80',
              padding: '0.5rem 0.85rem',
              borderRadius: 10,
              fontSize: '0.82rem',
              marginBottom: '1rem'
            }}>
              {success}
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%' }}
            disabled={loading || newUsername.trim() === user.username}
          >
            {loading ? 'Checking Availability…' : 'Save Username'}
          </button>
        </form>
      </div>
    </div>
  );
}
