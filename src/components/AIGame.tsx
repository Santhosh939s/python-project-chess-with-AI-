'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { Chess, type Move } from 'chess.js';
import ChessBoard from '@/components/ChessBoard';
import TopMoveTicker from '@/components/TopMoveTicker';
import ThemeSelector, { type BoardTheme } from '@/components/ThemeSelector';
import { getAIMove } from '@/lib/chessAI';
import { getTier } from '@/lib/api';

interface Props {
  user: any;
  onGameEnd: (result: 'win' | 'loss' | 'draw') => void;
  onBack: () => void;
}

const INITIAL_TIME = 600; // 10 minutes in seconds

export default function AIGame({ user, onGameEnd, onBack }: Props) {
  const chessRef = useRef(new Chess());
  const [fen, setFen] = useState(chessRef.current.fen());
  const [playerColor] = useState<'w' | 'b'>(() => Math.random() < 0.5 ? 'w' : 'b');
  const [thinking, setThinking] = useState(false);
  const [status, setStatus] = useState('');
  const [gameOver, setGameOver] = useState<'win' | 'loss' | 'draw' | null>(null);
  const [lastMove, setLastMove] = useState<{ from: string; to: string } | null>(null);
  const [moveHistory, setMoveHistory] = useState<Move[]>([]);
  const [checkSquare, setCheckSquare] = useState<string | null>(null);

  // Board color theme state (defaulting to invented 'cyber' palette)
  const [theme, setTheme] = useState<BoardTheme>('cyber');
  const [showThemeModal, setShowThemeModal] = useState(false);

  // Move replay state (null = showing live board)
  const [viewIndex, setViewIndex] = useState<number | null>(null);

  // Load persisted theme preference
  useEffect(() => {
    const saved = localStorage.getItem('chess_theme') as BoardTheme;
    if (saved && ['cyber', 'sapphire', 'amethyst'].includes(saved)) {
      setTheme(saved);
    }
  }, []);

  function handleSelectTheme(newTheme: BoardTheme) {
    setTheme(newTheme);
    localStorage.setItem('chess_theme', newTheme);
  }

  // 10-Minute Clocks (in seconds)
  const [whiteTime, setWhiteTime] = useState(INITIAL_TIME);
  const [blackTime, setBlackTime] = useState(INITIAL_TIME);

  const tier = getTier(user?.wins ?? 0);
  const aiDepth = tier.depth;
  const aiColor = playerColor === 'w' ? 'b' : 'w';

  // ── Timer Effect ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (gameOver) return;

    const timer = setInterval(() => {
      const turn = chessRef.current.turn();
      if (turn === 'w') {
        setWhiteTime(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            handleTimeout('w');
            return 0;
          }
          return prev - 1;
        });
      } else {
        setBlackTime(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            handleTimeout('b');
            return 0;
          }
          return prev - 1;
        });
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [gameOver]);

  function handleTimeout(timedOutColor: 'w' | 'b') {
    const playerWon = timedOutColor === aiColor;
    const result = playerWon ? 'win' : 'loss';
    setStatus(`Time's up! ${playerWon ? 'You win on time! 🏆' : 'AI wins on time!'}`);
    setGameOver(result);
  }

  function findKingSquare(chess: Chess, color: 'w' | 'b'): string | null {
    const board = chess.board();
    for (let r = 0; r < 8; r++) {
      for (let f = 0; f < 8; f++) {
        const p = board[r][f];
        if (p && p.type === 'k' && p.color === color) return p.square;
      }
    }
    return null;
  }

  function updateStatus(chess: Chess) {
    if (chess.isCheckmate()) {
      const playerWon = chess.turn() === aiColor;
      setStatus(`Checkmate! ${playerWon ? 'You win! 🏆' : 'AI wins!'}`);
      const result = playerWon ? 'win' : 'loss';
      setGameOver(result);
    } else if (chess.isStalemate()) {
      setStatus('Stalemate — Draw!'); setGameOver('draw');
    } else if (chess.isInsufficientMaterial()) {
      setStatus('Insufficient material — Draw!'); setGameOver('draw');
    } else if (chess.isThreefoldRepetition()) {
      setStatus('Threefold repetition — Draw!'); setGameOver('draw');
    } else if (chess.isDraw()) {
      setStatus('Draw!'); setGameOver('draw');
    } else if (chess.inCheck()) {
      setCheckSquare(findKingSquare(chess, chess.turn()));
      setStatus(`${chess.turn() === 'w' ? 'White' : 'Black'} is in check!`);
    } else {
      setCheckSquare(null);
      setStatus(chess.turn() === playerColor ? 'Your turn' : 'AI thinking…');
    }
  }

  const makeAIMove = useCallback(() => {
    const chess = chessRef.current;
    if (chess.isGameOver() || chess.turn() !== aiColor) return;

    setThinking(true);
    setTimeout(() => {
      const move = getAIMove(chess, aiDepth);
      if (move) {
        chess.move(move);
        const history = chess.history({ verbose: true });
        setLastMove({ from: move.from, to: move.to });
        setMoveHistory(history);
        setFen(chess.fen());
        setViewIndex(null); // Return to live move when AI plays
        updateStatus(chess);
      }
      setThinking(false);
    }, 300);
  }, [aiColor, aiDepth]);

  // Initial check if AI plays White (goes first)
  useEffect(() => {
    if (playerColor === 'b') {
      makeAIMove();
    } else {
      updateStatus(chessRef.current);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Notify parent on game over
  useEffect(() => {
    if (gameOver) onGameEnd(gameOver);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameOver]);

  function handlePlayerMove(move: any) {
    const chess = chessRef.current;
    const executed = chess.move({ from: move.from, to: move.to, promotion: move.promotion });
    if (executed) {
      const history = chess.history({ verbose: true });
      setLastMove({ from: executed.from, to: executed.to });
      setMoveHistory(history);
      setFen(chess.fen());
      setViewIndex(null); // Jump to live state when playing move
      updateStatus(chess);
      if (!chess.isGameOver()) {
        makeAIMove();
      }
    }
  }

  // ── Calculate Board & Last Move to Display (Live or Replay) ─────────────────
  const isReplaying = viewIndex !== null && viewIndex < moveHistory.length;
  let displayFen = fen;
  let displayLastMove = lastMove;

  if (isReplaying) {
    const replayChess = new Chess();
    for (let i = 0; i < viewIndex!; i++) {
      replayChess.move(moveHistory[i]);
    }
    displayFen = replayChess.fen();
    if (viewIndex! > 0) {
      const m = moveHistory[viewIndex! - 1];
      displayLastMove = { from: m.from, to: m.to };
    } else {
      displayLastMove = null;
    }
  }

  // Navigation handlers
  function stepToMove(idx: number) {
    if (idx < 0) idx = 0;
    if (idx >= moveHistory.length) setViewIndex(null);
    else setViewIndex(idx);
  }

  function formatTime(seconds: number) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  }

  const userTime  = playerColor === 'w' ? whiteTime : blackTime;
  const aiTime    = playerColor === 'w' ? blackTime : whiteTime;
  const isUserTurn = chessRef.current.turn() === playerColor;

  const colorLabel = playerColor === 'w' ? '⬜ White' : '⬛ Black';
  const aiLabel    = playerColor === 'w' ? '⬛ Black' : '⬜ White';

  // Group move history into pairs
  const pairs: { w: Move; b?: Move; wIdx: number; bIdx?: number }[] = [];
  for (let i = 0; i < moveHistory.length; i += 2) {
    pairs.push({
      w: moveHistory[i],
      b: moveHistory[i + 1],
      wIdx: i + 1,
      bIdx: moveHistory[i + 1] ? i + 2 : undefined,
    });
  }

  const activeMoveIndex = viewIndex === null ? moveHistory.length : viewIndex;

  return (
    <div className="app-content" data-theme={theme}>
      <div className="game-board-section">
        {/* Top Move Ticker Bar (Matching Chess.com Mobile App Layout) */}
        <TopMoveTicker
          moveHistory={moveHistory}
          activeMoveIndex={activeMoveIndex}
          onSelectMove={setViewIndex}
        />

        {/* Top Clock & AI Info Bar */}
        <div className="player-bar opponent-bar">
          <div className="player-bar-info">
            <div className="player-bar-name">🤖 AI ({aiLabel})</div>
            <div className="player-bar-rank" style={{ color: tier.color }}>
              Depth {aiDepth} · {tier.name} Level
            </div>
          </div>
          <div className={`chess-clock ${!isUserTurn && !gameOver ? 'active' : ''} ${aiTime < 30 ? 'low-time' : ''}`}>
            ⏱️ {formatTime(aiTime)}
          </div>
        </div>

        {/* Replay Banner Warning */}
        {isReplaying && (
          <div style={{
            background: 'rgba(59, 130, 246, 0.15)',
            border: '1px solid rgba(59, 130, 246, 0.4)',
            borderRadius: 10,
            padding: '0.4rem 0.85rem',
            margin: '0.2rem 0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '0.82rem',
            color: '#93c5fd',
            width: 'min(540px, calc(100vw - 1rem))'
          }}>
            <span>🔍 Past Move {viewIndex} / {moveHistory.length}</span>
            <button
              className="btn btn-secondary"
              onClick={() => setViewIndex(null)}
              style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}
            >
              ▶ Resume Live
            </button>
          </div>
        )}

        {/* Board */}
        <ChessBoard
          fen={displayFen}
          playerColor={playerColor}
          onMove={handlePlayerMove}
          disabled={thinking || !!gameOver || !isUserTurn || isReplaying}
          lastMove={displayLastMove}
          checkSquare={isReplaying ? null : checkSquare}
        />

        {/* Bottom Clock & User Info Bar */}
        <div className="player-bar user-bar">
          <div className="player-bar-info">
            <div className="player-bar-name">
              👤 {user?.username ?? 'Player'} <span style={{ color: 'var(--accent-light)', fontSize: '0.75rem' }}>{user?.userTag}</span> ({colorLabel})
            </div>
            <div className="player-bar-rank" style={{ color: tier.color }}>
              {tier.emoji} {tier.name} · {user?.wins ?? 0}W {user?.losses ?? 0}L
            </div>
          </div>
          <div className={`chess-clock ${isUserTurn && !gameOver ? 'active' : ''} ${userTime < 30 ? 'low-time' : ''}`}>
            ⏱️ {formatTime(userTime)}
          </div>
        </div>

        {/* Bottom Mobile App Action Bar (Matching User Screenshot Layout) */}
        <div className="bottom-app-bar">
          <button className="bottom-action-btn" onClick={onBack} title="Game Options">
            <span className="bottom-btn-icon">⚙️</span>
            <span>Options</span>
          </button>
          <button className="bottom-action-btn" onClick={() => setShowThemeModal(true)} title="Color Theme">
            <span className="bottom-btn-icon">🎨</span>
            <span>Theme</span>
          </button>
          <button
            className="bottom-action-btn"
            onClick={() => stepToMove(activeMoveIndex - 1)}
            disabled={moveHistory.length === 0 || activeMoveIndex === 0}
            title="Step Back"
          >
            <span className="bottom-btn-icon">◀</span>
            <span>Back</span>
          </button>
          <button
            className="bottom-action-btn"
            onClick={() => stepToMove(activeMoveIndex + 1)}
            disabled={moveHistory.length === 0 || activeMoveIndex >= moveHistory.length}
            title="Step Forward"
          >
            <span className="bottom-btn-icon">▶</span>
            <span>Forward</span>
          </button>
          {viewIndex !== null && (
            <button
              className="bottom-action-btn"
              onClick={() => setViewIndex(null)}
              style={{ background: 'rgba(59, 130, 246, 0.25)', borderColor: 'rgba(59, 130, 246, 0.5)' }}
              title="Live Game"
            >
              <span className="bottom-btn-icon">⏭️</span>
              <span>Live</span>
            </button>
          )}
        </div>
      </div>

      <div className="side-panel">
        {/* Status Card */}
        <div className="glass-card status-card">
          <div className={`status-message ${chessRef.current.inCheck() ? 'check' : gameOver === 'win' ? 'win' : ''}`}>
            {status}
          </div>

          {thinking && (
            <div className="ai-thinking">
              <div className="thinking-dots"><span/><span/><span/></div>
              AI is calculating move…
            </div>
          )}

          {gameOver && (
            <div className="game-over-banner">
              <div className="game-over-title">
                {gameOver === 'win' ? '🏆 You Win!' : gameOver === 'loss' ? '😔 AI Wins' : '🤝 Draw'}
              </div>
              <div className="game-over-result">
                {gameOver === 'win' ? '+1 Win — rank increased!' : gameOver === 'draw' ? 'Good game!' : 'Better luck next time!'}
              </div>
              <button className="btn btn-primary" style={{ marginTop: 12, width: '100%' }} onClick={onBack}>
                Back to Menu
              </button>
            </div>
          )}
        </div>

        {!gameOver && (
          <div className="glass-card controls-card">
            <div className="controls-title">Controls</div>
            <div className="btn-row">
              <button className="btn btn-secondary" onClick={() => setShowThemeModal(true)}>🎨 Board Color</button>
              <button className="btn btn-danger" onClick={() => onGameEnd('loss')} disabled={thinking}>Resign</button>
            </div>
          </div>
        )}
      </div>

      {/* Theme Selector Modal */}
      {showThemeModal && (
        <ThemeSelector
          currentTheme={theme}
          onSelectTheme={handleSelectTheme}
          onClose={() => setShowThemeModal(false)}
        />
      )}
    </div>
  );
}
