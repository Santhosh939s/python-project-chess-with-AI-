'use client';
import { useState } from 'react';

interface Props {
  onOfferDraw: () => void;
  onResign: () => void;
  onOpenTheme: () => void;
  onClose: () => void;
  isOnlineGame?: boolean;
}

export default function GameOptionsMenu({
  onOfferDraw,
  onResign,
  onOpenTheme,
  onClose,
  isOnlineGame = false,
}: Props) {
  const [confirmResign, setConfirmResign] = useState(false);
  const [drawSent, setDrawSent] = useState(false);

  function handleDraw() {
    onOfferDraw();
    setDrawSent(true);
    setTimeout(() => {
      onClose();
    }, 1200);
  }

  function handleResign() {
    if (!confirmResign) {
      setConfirmResign(true);
      return;
    }
    onResign();
    onClose();
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card options-modal" onClick={e => e.stopPropagation()}>
        <h3 className="modal-title">⚙️ Game Options</h3>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
          Select an action for your current match:
        </p>

        <div className="options-btn-list">
          {/* Draw Offer Button */}
          <button
            className="options-action-btn draw-btn"
            onClick={handleDraw}
            disabled={drawSent}
          >
            <span className="opt-icon">🤝</span>
            <div className="opt-info">
              <div className="opt-title">
                {drawSent ? 'Draw Offer Sent!' : 'Offer Draw'}
              </div>
              <div className="opt-desc">
                {isOnlineGame
                  ? 'Request a draw. If accepted, 0 points deducted.'
                  : 'Propose a peaceful draw with AI.'}
              </div>
            </div>
          </button>

          {/* Resign Button */}
          <button
            className={`options-action-btn resign-btn ${confirmResign ? 'confirming' : ''}`}
            onClick={handleResign}
          >
            <span className="opt-icon">🏳️</span>
            <div className="opt-info">
              <div className="opt-title">
                {confirmResign ? 'TAP AGAIN TO CONFIRM RESIGNATION' : 'Resign Game'}
              </div>
              <div className="opt-desc">
                {confirmResign
                  ? 'Rating points will be deducted based on moves played.'
                  : 'Forfeit match. Rating penalty applied.'}
              </div>
            </div>
          </button>

          {/* Color Theme Button */}
          <button
            className="options-action-btn theme-btn"
            onClick={() => {
              onOpenTheme();
              onClose();
            }}
          >
            <span className="opt-icon">🎨</span>
            <div className="opt-info">
              <div className="opt-title">Board Color Theme</div>
              <div className="opt-desc">Switch between invented neon board themes.</div>
            </div>
          </button>
        </div>

        <button
          className="btn btn-secondary"
          style={{ width: '100%', marginTop: '1.25rem' }}
          onClick={onClose}
        >
          Resume Game
        </button>
      </div>
    </div>
  );
}
