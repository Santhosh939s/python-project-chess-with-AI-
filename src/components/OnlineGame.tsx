'use client';
import { useState, useEffect, useRef } from 'react';
import { Chess, type Move } from 'chess.js';
import ChessBoard from '@/components/ChessBoard';
import TopMoveTicker from '@/components/TopMoveTicker';
import ThemeSelector, { type BoardTheme } from '@/components/ThemeSelector';
import { enterMatchmakingQueue, leaveMatchmakingQueue, getTier } from '@/lib/api';

interface Props {
  user: any;
  onGameEnd: (result: 'win' | 'loss' | 'draw') => void;
  onBack: () => void;
}

type Phase = 'menu' | 'matching' | 'hosting' | 'joining' | 'playing';
const INITIAL_TIME = 600; // 10 minutes in seconds

export default function OnlineGame({ user, onGameEnd, onBack }: Props) {
  const [phase, setPhase] = useState<Phase>('menu');
  const [roomCode, setRoomCode] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [playerColor, setPlayerColor] = useState<'w' | 'b'>('w');
  const [fen, setFen] = useState(new Chess().fen());
  const [lastMove, setLastMove] = useState<{ from: string; to: string } | null>(null);
  const [checkSquare, setCheckSquare] = useState<string | null>(null);
  const [gameOver, setGameOver] = useState<string | null>(null);
  const [moveHistory, setMoveHistory] = useState<Move[]>([]);
  const [status, setStatus] = useState('');
  const [opponentName, setOpponentName] = useState('Opponent');
  const [drawOffer, setDrawOffer] = useState(false);
  const [copyDone, setCopyDone] = useState(false);
  const [error, setError] = useState('');
  const [matchStatusText, setMatchStatusText] = useState('Searching for online players…');

  // Board theme state
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

  // 10-Minute Clocks
  const [whiteTime, setWhiteTime] = useState(INITIAL_TIME);
  const [blackTime, setBlackTime] = useState(INITIAL_TIME);

  const chessRef = useRef(new Chess());
  const peerRef = useRef<any>(null);
  const connRef = useRef<any>(null);
  const cancelMatchmakingRef = useRef<(() => void) | null>(null);

  const tier = getTier(user?.wins ?? 0);

  // ── Clock Timer ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'playing' || gameOver) return;

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
  }, [phase, gameOver]);

  function handleTimeout(timedOutColor: 'w' | 'b') {
    const iMyTurn = timedOutColor === playerColor;
    const result = iMyTurn ? 'loss' : 'win';
    setGameOver(result);
    setStatus(iMyTurn ? "Time's up! You lost on time." : "Opponent's time ran out — You win! 🏆");
    onGameEnd(result);
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cancelMatchmakingRef.current?.();
      connRef.current?.close();
      peerRef.current?.destroy();
      if (user?.uid) leaveMatchmakingQueue(user.uid);
    };
  }, [user]);

  async function loadPeer() {
    const { Peer } = await import('peerjs');
    return Peer;
  }

  // ── 1. Quick Automated Matchmaking ──────────────────────────────────────────
  async function startQuickMatch() {
    setError('');
    setPhase('matching');
    setMatchStatusText(`Looking for online players near your rank (${tier.name})…`);

    const Peer = await loadPeer();
    const peer = new Peer();
    peerRef.current = peer;

    peer.on('open', async (myPeerId: string) => {
      try {
        const cleanup = await enterMatchmakingQueue(
          user,
          myPeerId,
          (matchedData) => {
            setOpponentName(matchedData.oppName);
            if (matchedData.role === 'guest') {
              const conn = peer.connect(matchedData.peerId);
              connRef.current = conn;
              setupConnHandlers(conn, 'guest');
            } else {
              setMatchStatusText(`Found player ${matchedData.oppName}! Connecting…`);
            }
          }
        );
        cancelMatchmakingRef.current = cleanup;
      } catch (err) {
        setError('Matchmaking failed. Try again.');
        setPhase('menu');
      }
    });

    peer.on('connection', (conn: any) => {
      connRef.current = conn;
      setupConnHandlers(conn, 'host');
    });

    peer.on('error', () => {
      setError('Connection error during matchmaking.');
      setPhase('menu');
    });
  }

  function cancelQuickMatch() {
    cancelMatchmakingRef.current?.();
    if (user?.uid) leaveMatchmakingQueue(user.uid);
    peerRef.current?.destroy();
    setPhase('menu');
  }

  // ── 2. Private Host ────────────────────────────────────────────────────────
  async function hostGame() {
    setError('');
    setPhase('hosting');
    const Peer = await loadPeer();
    const code = Math.random().toString(36).slice(2, 8).toUpperCase();
    const peer = new Peer(`chess-${code}`);
    peerRef.current = peer;

    peer.on('open', () => {
      setRoomCode(code);
    });

    peer.on('connection', (conn: any) => {
      connRef.current = conn;
      setupConnHandlers(conn, 'host');
    });

    peer.on('error', () => {
      setError('Connection error. Try again.');
      setPhase('menu');
    });
  }

  // ── 3. Private Join ────────────────────────────────────────────────────────
  async function joinGame() {
    if (!joinCode.trim()) return;
    setError('');
    setPhase('joining');
    const Peer = await loadPeer();
    const peer = new Peer();
    peerRef.current = peer;

    peer.on('open', () => {
      const conn = peer.connect(`chess-${joinCode.trim().toUpperCase()}`);
      connRef.current = conn;
      setupConnHandlers(conn, 'guest');
    });

    peer.on('error', () => {
      setError('Room not found. Check the code and try again.');
      setPhase('menu');
    });
  }

  // ── Shared P2P Handlers ──────────────────────────────────────────────────
  function setupConnHandlers(conn: any, myRole: 'host' | 'guest') {
    conn.on('open', () => {
      setPhase('playing');
      chessRef.current = new Chess();
      setFen(chessRef.current.fen());
      setWhiteTime(INITIAL_TIME);
      setBlackTime(INITIAL_TIME);
      setViewIndex(null);

      if (myRole === 'host') {
        const myColor: 'w' | 'b' = Math.random() < 0.5 ? 'w' : 'b';
        const oppColor: 'w' | 'b' = myColor === 'w' ? 'b' : 'w';
        setPlayerColor(myColor);
        conn.send({ type: 'GAME_START', yourColor: oppColor, hostName: user?.username });
        setStatus(myColor === 'w' ? 'Your turn (White)' : "Opponent's turn");
      } else {
        conn.send({ type: 'JOIN', name: user?.username });
      }
    });

    conn.on('data', (data: any) => {
      if (data.type === 'GAME_START') {
        setPlayerColor(data.yourColor);
        setOpponentName(data.hostName || 'Opponent');
        setStatus(data.yourColor === 'w' ? 'Your turn (White)' : "Opponent's turn");
      }

      if (data.type === 'JOIN') {
        setOpponentName(data.name || 'Opponent');
      }

      if (data.type === 'MOVE') {
        const chess = chessRef.current;
        const result = chess.move(data.move);
        if (result) {
          setFen(chess.fen());
          setLastMove({ from: result.from, to: result.to });
          setMoveHistory(chess.history({ verbose: true }));
          setViewIndex(null); // Jump to live state when opponent moves
          updateCheck(chess);
          if (chess.isGameOver()) handleGameOver(chess, false);
          else setStatus('Your turn');
        }
      }

      if (data.type === 'RESIGN') {
        setGameOver('win');
        setStatus('Opponent resigned — You win! 🏆');
        onGameEnd('win');
      }

      if (data.type === 'DRAW_OFFER') {
        setDrawOffer(true);
        setStatus('Opponent offers a draw');
      }

      if (data.type === 'DRAW_ACCEPT') {
        setGameOver('draw');
        setStatus('Draw agreed');
        onGameEnd('draw');
      }

      if (data.type === 'DRAW_DECLINE') {
        setStatus('Draw declined');
      }

      if (data.type === 'DISCONNECT') {
        setStatus('Opponent disconnected');
        setGameOver('win');
        onGameEnd('win');
      }
    });

    conn.on('close', () => {
      if (!gameOver) {
        setStatus('Opponent disconnected');
        setGameOver('win');
      }
    });
  }

  function updateCheck(chess: Chess) {
    if (chess.inCheck()) {
      const board = chess.board();
      for (let r = 0; r < 8; r++) for (let f = 0; f < 8; f++) {
        const p = board[r][f];
        if (p && p.type === 'k' && p.color === chess.turn()) setCheckSquare(p.square);
      }
    } else setCheckSquare(null);
  }

  function handleGameOver(chess: Chess, iMyMove: boolean) {
    let result: 'win' | 'loss' | 'draw' = 'draw';
    if (chess.isCheckmate()) result = iMyMove ? 'win' : 'loss';
    setGameOver(result);
    setStatus(chess.isCheckmate() ? (iMyMove ? '🏆 You win by checkmate!' : '😔 Opponent wins by checkmate') : 'Draw!');
    onGameEnd(result);
  }

  function handlePlayerMove(move: any) {
    const chess = chessRef.current;
    connRef.current?.send({ type: 'MOVE', move: { from: move.from, to: move.to, promotion: move.promotion } });
    setFen(chess.fen());
    setLastMove({ from: move.from, to: move.to });
    setMoveHistory(chess.history({ verbose: true }));
    setViewIndex(null);
    updateCheck(chess);
    if (chess.isGameOver()) handleGameOver(chess, true);
    else setStatus("Opponent's turn");
  }

  function resign() {
    connRef.current?.send({ type: 'RESIGN' });
    setGameOver('loss');
    onGameEnd('loss');
  }

  function offerDraw() {
    connRef.current?.send({ type: 'DRAW_OFFER' });
    setStatus('Draw offer sent…');
  }

  function acceptDraw() {
    connRef.current?.send({ type: 'DRAW_ACCEPT' });
    setDrawOffer(false);
    setGameOver('draw');
    onGameEnd('draw');
  }

  function declineDraw() {
    connRef.current?.send({ type: 'DRAW_DECLINE' });
    setDrawOffer(false);
  }

  function copyCode() {
    navigator.clipboard.writeText(roomCode);
    setCopyDone(true);
    setTimeout(() => setCopyDone(false), 2000);
  }

  function formatTime(seconds: number) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
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

  function stepToMove(idx: number) {
    if (idx < 0) idx = 0;
    if (idx >= moveHistory.length) setViewIndex(null);
    else setViewIndex(idx);
  }

  const chess = chessRef.current;
  const isMyTurn = chess.turn() === playerColor;

  const myTime = playerColor === 'w' ? whiteTime : blackTime;
  const oppTime = playerColor === 'w' ? blackTime : whiteTime;
  const activeMoveIndex = viewIndex === null ? moveHistory.length : viewIndex;

  // ── Menu ────────────────────────────────────────────────────────────────────
  if (phase === 'menu') return (
    <div className="online-lobby">
      <div className="lobby-card glass-card">
        <div className="lobby-icon">🌐</div>
        <h2 className="lobby-title">Play Online</h2>
        <p className="lobby-desc">Find a match automatically by rank, or invite a friend via private code!</p>
        {error && <div className="auth-error">{error}</div>}

        <button className="btn btn-primary" style={{ width: '100%', fontSize: '1.05rem', padding: '0.85rem' }} onClick={startQuickMatch}>
          ⚡ Quick Match (Find Opponent)
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '0.5rem 0', opacity: 0.6 }}>
          <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.2)' }} />
          <span style={{ fontSize: '0.75rem', fontWeight: 700 }}>OR PRIVATE ROOM</span>
          <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.2)' }} />
        </div>

        <button className="btn btn-secondary" style={{ width: '100%' }} onClick={hostGame}>
          ➕ Create Private Room
        </button>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input
            type="text"
            value={joinCode}
            onChange={e => setJoinCode(e.target.value.toUpperCase())}
            placeholder="Enter room code"
            maxLength={6}
            style={{ flex: 1, padding: '0.65rem 1rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: '#f1f5f9', fontFamily: 'Courier New', fontSize: '1rem', letterSpacing: '0.15em', outline: 'none' }}
          />
          <button className="btn btn-secondary" onClick={joinGame} disabled={!joinCode.trim()}>Join</button>
        </div>

        <button className="btn btn-secondary" style={{ width: '100%' }} onClick={onBack}>← Back to Home</button>
      </div>
    </div>
  );

  // ── Matching (Automated Queue) ────────────────────────────────────────────────
  if (phase === 'matching') return (
    <div className="online-lobby">
      <div className="lobby-card glass-card">
        <div className="lobby-icon">⚡</div>
        <h2 className="lobby-title">Finding Opponent…</h2>
        <p className="lobby-desc">{matchStatusText}</p>
        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 12 }}>
          Your Rank: <strong style={{ color: tier.color }}>{tier.emoji} {tier.name}</strong> ({user?.wins ?? 0} Wins)
        </div>
        <div className="ai-thinking" style={{ justifyContent: 'center', margin: '1rem 0' }}>
          <div className="thinking-dots"><span/><span/><span/></div>
          Searching online players…
        </div>
        <button className="btn btn-danger" style={{ width: '100%' }} onClick={cancelQuickMatch}>
          Cancel Matchmaking
        </button>
      </div>
    </div>
  );

  // ── Hosting (Private Room) ─────────────────────────────────────────────────
  if (phase === 'hosting') return (
    <div className="online-lobby">
      <div className="lobby-card glass-card">
        <div className="lobby-icon">⏳</div>
        <h2 className="lobby-title">Room Created!</h2>
        <p className="lobby-desc">Share this code with your friend:</p>
        <div className="room-code-box">
          <span className="room-code">{roomCode || '…'}</span>
          <button className="btn btn-secondary" onClick={copyCode} disabled={!roomCode}>
            {copyDone ? '✓ Copied' : 'Copy'}
          </button>
        </div>
        <div className="ai-thinking" style={{ justifyContent: 'center' }}>
          <div className="thinking-dots"><span/><span/><span/></div>
          Waiting for friend to join…
        </div>
        <button className="btn btn-danger" style={{ width: '100%', marginTop: 8 }} onClick={() => { peerRef.current?.destroy(); setPhase('menu'); }}>
          Cancel
        </button>
      </div>
    </div>
  );

  // ── Joining (Private Room) ────────────────────────────────────────────────
  if (phase === 'joining') return (
    <div className="online-lobby">
      <div className="lobby-card glass-card">
        <div className="lobby-icon">🔌</div>
        <h2 className="lobby-title">Connecting…</h2>
        <div className="ai-thinking" style={{ justifyContent: 'center' }}>
          <div className="thinking-dots"><span/><span/><span/></div>
          Joining room {joinCode}
        </div>
      </div>
    </div>
  );

  // ── Active P2P Game ────────────────────────────────────────────────────────
  return (
    <div className="app-content" data-theme={theme}>
      <div className="game-board-section">
        {/* Top Move Ticker Bar (Chess.com Mobile App Layout) */}
        <TopMoveTicker
          moveHistory={moveHistory}
          activeMoveIndex={activeMoveIndex}
          onSelectMove={setViewIndex}
        />

        {/* Opponent Bar */}
        <div className="player-bar opponent-bar">
          <div className="player-bar-info">
            <div className="player-bar-name">👤 {opponentName} ({playerColor === 'w' ? '⬛ Black' : '⬜ White'})</div>
            <div className="player-bar-rank" style={{ color: 'var(--accent-light)' }}>Online Opponent</div>
          </div>
          <div className={`chess-clock ${!isMyTurn && !gameOver ? 'active' : ''} ${oppTime < 30 ? 'low-time' : ''}`}>
            ⏱️ {formatTime(oppTime)}
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

        {/* Chess Board */}
        <ChessBoard
          fen={displayFen}
          playerColor={playerColor}
          onMove={handlePlayerMove}
          disabled={!isMyTurn || !!gameOver || isReplaying}
          lastMove={displayLastMove}
          checkSquare={isReplaying ? null : checkSquare}
        />

        {/* User Bar */}
        <div className="player-bar user-bar">
          <div className="player-bar-info">
            <div className="player-bar-name">
              👤 {user?.username} <span style={{ color: 'var(--accent-light)', fontSize: '0.75rem' }}>{user?.userTag}</span> ({playerColor === 'w' ? '⬜ White' : '⬛ Black'})
            </div>
            <div className="player-bar-rank" style={{ color: tier.color }}>
              {tier.emoji} {tier.name} · {user?.wins ?? 0}W {user?.losses ?? 0}L
            </div>
          </div>
          <div className={`chess-clock ${isMyTurn && !gameOver ? 'active' : ''} ${myTime < 30 ? 'low-time' : ''}`}>
            ⏱️ {formatTime(myTime)}
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
        <div className="glass-card status-card">
          <div className={`status-message ${chess.inCheck() ? 'check' : ''}`}>
            {isMyTurn && !gameOver ? '🟢 Your turn' : !gameOver ? '⏳ Opponent thinking…' : ''} {status}
          </div>

          {drawOffer && (
            <div style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 8, padding: '0.75rem' }}>
              <p style={{ fontSize: '0.85rem', marginBottom: 8 }}>Opponent offers a draw</p>
              <div className="btn-row">
                <button className="btn btn-secondary" onClick={acceptDraw}>Accept</button>
                <button className="btn btn-danger" onClick={declineDraw}>Decline</button>
              </div>
            </div>
          )}

          {gameOver && (
            <div className="game-over-banner">
              <div className="game-over-title">
                {gameOver === 'win' ? '🏆 You Win!' : gameOver === 'loss' ? '😔 You Lose' : '🤝 Draw'}
              </div>
              <button className="btn btn-primary" style={{ marginTop: 12, width: '100%' }} onClick={onBack}>Back to Home</button>
            </div>
          )}
        </div>

        {!gameOver && (
          <div className="glass-card controls-card">
            <div className="controls-title">Controls</div>
            <div className="btn-row">
              <button className="btn btn-secondary" onClick={() => setShowThemeModal(true)}>🎨 Color Theme</button>
              <button className="btn btn-secondary" onClick={offerDraw}>🤝 Draw</button>
              <button className="btn btn-danger" onClick={resign}>🏳️ Resign</button>
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
