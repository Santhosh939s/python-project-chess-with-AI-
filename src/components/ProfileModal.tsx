'use client';
import { useState } from 'react';
import { changeUsername, getTier, type UserProfile } from '@/lib/api';

interface Props {
  user: UserProfile;
  onUpdateUser: (updatedUser: UserProfile) => void;
  onClose: () => void;
}

export default function ProfileModal({ user, onUpdateUser, onClose }: Props) {
  const [isEditing, setIsEditing] = useState(false);
  const [newUsername, setNewUsername] = useState(user.username);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const rating = user.rating ?? Math.min(1000, (user.wins || 0) * 30);
  const tier = getTier(rating);

  async function handleSaveUsername(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');

    const trimmed = newUsername.trim();
    if (!trimmed) {
      setError('Username cannot be empty');
      return;
    }

    if (trimmed === user.username) {
      setIsEditing(false);
      return;
    }

    setLoading(true);

    try {
      const updatedName = await changeUsername(user.uid, user.username, trimmed);
      const updatedUser: UserProfile = { ...user, username: updatedName };
      onUpdateUser(updatedUser);
      setSuccess(`Username updated to "${updatedName}"! 🎉`);
      setIsEditing(false);
    } catch (err: any) {
      setError(err.message || 'Failed to update username');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card glass-card" onClick={e => e.stopPropagation()} style={{ maxWidth: 440, width: '92%', padding: '1.75rem' }}>
        <button className="modal-close" onClick={onClose}>×</button>

        {/* Profile Avatar & Rank Header */}
        <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
          <div style={{
            fontSize: '3rem',
            width: 76,
            height: 76,
            lineHeight: '76px',
            background: 'linear-gradient(135deg, rgba(139,92,246,0.2), rgba(6,182,212,0.15))',
            border: '1px solid rgba(139,92,246,0.4)',
            borderRadius: '50%',
            margin: '0 auto 0.75rem',
            boxShadow: '0 0 25px rgba(139,92,246,0.3)'
          }}>
            👤
          </div>

          {/* Username Row */}
          {!isEditing ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}>
              <h2 className="modal-title" style={{ margin: 0, fontSize: '1.45rem', fontWeight: 800 }}>
                {user.username}
              </h2>
              <button
                type="button"
                onClick={() => { setIsEditing(true); setError(''); setSuccess(''); }}
                style={{
                  background: 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  color: '#fff',
                  borderRadius: '50%',
                  width: 32,
                  height: 32,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                  marginLeft: '0.2rem',
                  transition: 'all 0.2s ease'
                }}
                title="Edit Username"
              >
                ✏️
              </button>
            </div>
          ) : (
            <div style={{ marginTop: '0.5rem' }}>
              <span style={{ fontSize: '0.78rem', color: 'var(--accent-light)', display: 'block', marginBottom: 6 }}>
                Edit Unique Display Name
              </span>
            </div>
          )}

          {/* Rating Score & Rank Badge */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginTop: 6 }}>
            <span style={{
              background: 'rgba(139, 92, 246, 0.25)',
              border: '1px solid rgba(139, 92, 246, 0.5)',
              color: 'var(--accent-light)',
              padding: '0.2rem 0.65rem',
              borderRadius: 20,
              fontSize: '0.82rem',
              fontWeight: 800
            }}>
              ⭐ {rating} / 1000 Rating
            </span>
            <span style={{ fontSize: '0.85rem', color: tier.color, fontWeight: 700 }}>
              {tier.emoji} {tier.name} Rank
            </span>
          </div>
        </div>

        {/* Stats Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '0.5rem',
          marginBottom: '1.25rem',
          background: 'rgba(255,255,255,0.03)',
          padding: '0.85rem',
          borderRadius: 14,
          border: '1px solid rgba(255,255,255,0.08)'
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#4ade80' }}>{user.wins || 0}</div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Wins</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#f87171' }}>{user.losses || 0}</div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Losses</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#93c5fd' }}>{user.draws || 0}</div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Draws</div>
          </div>
        </div>

        {/* Status Messages */}
        {error && (
          <div className="auth-error" style={{ marginBottom: '1rem', fontSize: '0.82rem', textAlign: 'center' }}>
            {error}
          </div>
        )}
        {success && (
          <div style={{
            background: 'rgba(74, 222, 128, 0.15)',
            border: '1px solid rgba(74, 222, 128, 0.4)',
            color: '#4ade80',
            padding: '0.5rem 0.85rem',
            borderRadius: 10,
            fontSize: '0.82rem',
            marginBottom: '1rem',
            textAlign: 'center'
          }}>
            {success}
          </div>
        )}

        {/* Edit Form (Only visible when clicking ✏️ Edit Icon) */}
        {isEditing && (
          <form onSubmit={handleSaveUsername} style={{ marginTop: '0.5rem' }}>
            <div style={{ marginBottom: '1rem' }}>
              <input
                type="text"
                className="form-input"
                value={newUsername}
                onChange={e => setNewUsername(e.target.value)}
                placeholder="Enter unique username"
                maxLength={20}
                autoFocus
                required
              />
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', marginTop: 6, textAlign: 'center' }}>
                Usernames are compressed and verified across database for uniqueness.
              </span>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                type="submit"
                className="btn btn-primary"
                style={{ flex: 1 }}
                disabled={loading || !newUsername.trim()}
              >
                {loading ? 'Checking Database…' : 'Save Username'}
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => { setIsEditing(false); setNewUsername(user.username); setError(''); }}
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {!isEditing && (
          <div style={{ textAlign: 'center', marginTop: '0.5rem' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Compressed database storage active for unique username matching
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
