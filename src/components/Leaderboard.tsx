'use client';
import { useState, useEffect } from 'react';
import { getLeaderboard, getTier } from '@/lib/api';

export default function Leaderboard({ onClose }: { onClose: () => void }) {
  const [board, setBoard] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getLeaderboard().then(setBoard).catch(console.error).finally(() => setLoading(false));
  }, []);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card leaderboard-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 520, width: '92%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <div>
            <h2 className="modal-title" style={{ margin: 0, fontSize: '1.35rem' }}>🏆 Global Leaderboard</h2>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Ranked by Rating Points (0 to 1000+)</span>
          </div>
          <button className="btn btn-secondary" onClick={onClose} style={{ padding: '0.35rem 0.75rem' }}>✕</button>
        </div>

        {loading ? (
          <div className="ai-thinking" style={{ justifyContent: 'center' }}>
            <div className="thinking-dots"><span/><span/><span/></div>
            Loading…
          </div>
        ) : board.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '1rem 0' }}>
            No players yet. Register and be the first!
          </p>
        ) : (
          <div className="lb-list">
            {board.map((player, i) => {
              const rating = player.rating ?? Math.min(1000, (player.wins || 0) * 30);
              const tier = getTier(rating);
              return (
                <div key={player.uid || player.username} className="lb-row">
                  <span className="lb-rank">{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}</span>
                  <div className="lb-info">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span className="lb-name" style={{ fontWeight: 800 }}>{player.username}</span>
                    </div>
                    <span className="lb-tier" style={{ color: tier.color, fontSize: '0.75rem', fontWeight: 600 }}>
                      {tier.emoji} {tier.name}
                    </span>
                  </div>
                  <div className="lb-stats" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <div style={{
                      background: 'rgba(139, 92, 246, 0.2)',
                      border: '1px solid rgba(139, 92, 246, 0.4)',
                      color: 'var(--accent-light)',
                      padding: '0.2rem 0.55rem',
                      borderRadius: 8,
                      fontSize: '0.8rem',
                      fontWeight: 800
                    }}>
                      {rating} pts
                    </div>
                    <div style={{ fontSize: '0.75rem', display: 'flex', gap: 4 }}>
                      <span style={{ color: '#10b981', fontWeight: 700 }}>{player.wins || 0}W</span>
                      <span style={{ color: '#f43f5e', fontWeight: 700 }}>{player.losses || 0}L</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
