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
      <div className="modal-card leaderboard-modal" onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <h2 className="modal-title" style={{ margin: 0 }}>🏆 Leaderboard</h2>
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
              const tier = getTier(player.wins);
              return (
                <div key={player.uid || player.username} className="lb-row">
                  <span className="lb-rank">{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}</span>
                  <div className="lb-info">
                    <span className="lb-name">{player.username}</span>
                    <span className="lb-tier" style={{ color: tier.color }}>{tier.emoji} {tier.name}</span>
                  </div>
                  <div className="lb-stats">
                    <span style={{ color: '#10b981', fontSize: '0.8rem' }}>{player.wins}W</span>
                    <span style={{ color: '#f43f5e', fontSize: '0.8rem' }}>{player.losses}L</span>
                    <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>{player.draws}D</span>
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
