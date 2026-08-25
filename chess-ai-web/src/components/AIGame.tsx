'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { Chess } from 'chess.js';
import ChessBoard from '@/components/ChessBoard';
import { getAIMove } from '@/lib/chessAI';
import { getTier } from '@/lib/api';

interface Props {
  user: any;
  onGameEnd: (result: 'win' | 'loss' | 'draw') => void;
  onBack: () => void;
}

export default function AIGame({ user, onGameEnd, onBack }: Props) {
  const chessRef = useRef(new Chess());
  const [fen, setFen] = useState(chessRef.current.fen());
  const [playerColor] = useState<'w' | 'b'>(() => Math.random() < 0.5 ? 'w' : 'b');
  const [thinking, setThinking] = useState(false);
  const [status, setStatus] = useState('');
  const [gameOver, setGameOver] = useState<string | null>(null);
  const [lastMove, setLastMove] = useState<{ from: string; to: string } | null>(null);
  const [moveHistory, setMoveHistory] = useState<string[]>([]);
  const [checkSquare, setCheckSquare] = useState<string | null>(null);
  const historyEndRef = useRef<HTMLDivElement>(null);

  const tier = getTier(user?.wins ?? 0);
  const aiDepth = tier.depth;
  const aiColor = playerColor === 'w' ? 'b' : 'w';

  function findKingSquare(chess: Chess, color: 'w' | 'b') {
    const board = chess.board();
    for (let r = 0; r < 8; r++) {
      for (f = 0; f < 8; f++) {
        const p = board[r][f];
        if (p && p.type === 'k' && p.color === color) {
          return p.square;
        }
      }
    }
    return null;
  }
  let f = 0;

  function updateStatus(chess: Chess) {
    if (chess.isCheckmate()) {
      const winner = chess.turn() === 'w' ? 'Black' : 'White';
      setStatus(`Checkmate! ${winner} wins.`);
      const playerWon = chess.turn() === aiColor;
      setGameOver(playerWon ? 'win' : 'loss');
    } else if (chess.isStalemate()) {
      setStatus('Stalemate — Draw!');
      setGameOver('draw');
    } else if (chess.isInsufficientMaterial()) {
      setStatus('Insufficient material — Draw!');
      setGameOver('draw');
    } else if (chess.isThreefoldRepetition()) {
      setStatus('Threefold repetition — Draw!');
      setGameOver('draw');
    } else if (chess.isDraw()) {
      setStatus('Draw!');
      setGameOver('draw');
    } else if (chess.inCheck()) {
      const sq = findKingSquare(chess, chess.turn());
      setCheckSquare(sq);
      setStatus(`${chess.turn() === 'w' ? 'White' : 'Black'} is in check!`);
    } else {
      setCheckSquare(null);
      setStatus(`${chess.turn() === 'w' ? 'White' : 'Black'} to move`);
    }
  }

  // AI makes a move
  const makeAIMove = useCallback(async (chess: Chess) => {
    if (chess.isGameOver() || chess.turn() !== aiColor) return;
    setThinking(true);
    await new Promise(r => setTimeout(r, 300)); // brief pause for UX
    const move = getAIMove(chess, aiDepth);
    if (move) {
      chess.move(move);
      setLastMove({ from: move.from, to: move.to });
      setMoveHistory(chess.history());
      setFen(chess.fen());
      updateStatus(chess);
    }
    setThinking(false);
  }, [aiColor, aiDepth]);

  // If AI goes first (player is black), trigger immediately
  useEffect(() => {
    if (playerColor === 'b') {
      makeAIMove(chessRef.current);
    } else {
      updateStatus(chessRef.current);
    }
    // eslint-disable-next-line
  }, []);

  useEffect(() => {
    historyEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [moveHistory]);

  function handlePlayerMove(move: any) {
    const chess = chessRef.current;
    setLastMove({ from: move.from, to: move.to });
    setMoveHistory(chess.history());
    setFen(chess.fen());
    updateStatus(chess);

    if (!chess.isGameOver()) {
      makeAIMove(chess);
    }
  }

  function handleGameEnd() {
    if (gameOver) onGameEnd(gameOver as any);
  }

  const colorLabel = playerColor === 'w' ? '⬜ White' : '⬛ Black';
  const aiLabel    = playerColor === 'w' ? '⬛ Black' : '⬜ White';

  // Pair moves for display
  const pairs: [string, string?][] = [];
  for (let i = 0; i < moveHistory.length; i += 2) {
    pairs.push([moveHistory[i], moveHistory[i + 1]]);
  }

  return (
    <div className="app-content">
      {/* Board */}
      <ChessBoard
        fen={fen}
        playerColor={playerColor}
        onMove={handlePlayerMove}
        disabled={thinking || !!gameOver || chessRef.current.turn() !== playerColor}
        lastMove={lastMove}
        checkSquare={checkSquare}
      />

      {/* Side Panel */}
      <div className="side-panel">
        {/* Player info */}
        <div className="glass-card status-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div className="controls-title">You</div>
              <div style={{ fontWeight: 700, fontSize: '1rem' }}>{user?.username ?? 'Guest'}</div>
              <div style={{ fontSize: '0.75rem', color: tier.color, fontWeight: 600 }}>
                {tier.emoji} {tier.name} · {user?.wins ?? 0}W {user?.losses ?? 0}L
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div className="controls-title">Playing as</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>{colorLabel}</div>
            </div>
          </div>

          <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '0.75rem' }}>
            <div className="controls-title" style={{ marginBottom: 4 }}>AI Opponent</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: '0.85rem' }}>{aiLabel}</span>
              <span style={{ fontSize: '0.75rem', background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.3)', color: '#a78bfa', padding: '2px 8px', borderRadius: 6, fontWeight: 600 }}>
                Depth {aiDepth} · {tier.name} tier
              </span>
            </div>
          </div>

          {/* Status */}
          <div className={`status-message ${chessRef.current.inCheck() ? 'check' : gameOver ? 'win' : ''}`}>
            {status}
          </div>

          {thinking && (
            <div className="ai-thinking">
              <div className="thinking-dots"><span/><span/><span/></div>
              AI is calculating…
            </div>
          )}

          {gameOver && (
            <div className="game-over-banner">
              <div className="game-over-title">
                {gameOver === 'win' ? '🏆 You Win!' : gameOver === 'loss' ? '😔 AI Wins' : '🤝 Draw'}
              </div>
              <div className="game-over-result">
                {gameOver === 'win' ? '+1 Win · Rank may increase!' : gameOver === 'draw' ? 'Good game!' : 'Better luck next time!'}
              </div>
              <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={handleGameEnd}>
                Continue
              </button>
            </div>
          )}
        </div>

        {/* Controls */}
        {!gameOver && (
          <div className="glass-card controls-card">
            <div className="controls-title">Controls</div>
            <div className="btn-row">
              <button className="btn btn-secondary" onClick={onBack}>← Menu</button>
              <button
                className="btn btn-danger"
                onClick={() => {
                  setGameOver('loss');
                  onGameEnd('loss');
                }}
                disabled={thinking}
              >Resign</button>
            </div>
          </div>
        )}

        {/* Move History */}
        <div className="glass-card history-card">
          <div className="controls-title">Move History</div>
          <div className="history-scroll">
            {pairs.length === 0 && (
              <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', padding: '0.5rem 0' }}>No moves yet</div>
            )}
            {pairs.map(([w, b], i) => (
              <div key={i} className="move-row">
                <span className="move-num">{i + 1}.</span>
                <span className="move-san white">{w}</span>
                <span className="move-san black">{b ?? ''}</span>
              </div>
            ))}
            <div ref={historyEndRef} />
          </div>
        </div>
      </div>
    </div>
  );
}
