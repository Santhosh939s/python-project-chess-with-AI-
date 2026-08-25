'use client';
import { useState, useEffect, useRef } from 'react';
import { Chess } from 'chess.js';
import ChessBoard from '@/components/ChessBoard';

interface Props {
  user: any;
  onGameEnd: (result: 'win' | 'loss' | 'draw') => void;
  onBack: () => void;
}

type Phase = 'menu' | 'hosting' | 'joining' | 'playing';

export default function OnlineGame({ user, onGameEnd, onBack }: Props) {
  const [phase, setPhase] = useState<Phase>('menu');
  const [roomCode, setRoomCode] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [playerColor, setPlayerColor] = useState<'w' | 'b'>('w');
  const [fen, setFen] = useState(new Chess().fen());
  const [lastMove, setLastMove] = useState<{ from: string; to: string } | null>(null);
  const [checkSquare, setCheckSquare] = useState<string | null>(null);
  const [gameOver, setGameOver] = useState<string | null>(null);
  const [moveHistory, setMoveHistory] = useState<string[]>([]);
  const [status, setStatus] = useState('');
  const [opponentName, setOpponentName] = useState('Opponent');
  const [drawOffer, setDrawOffer] = useState(false);
  const [connected, setConnected] = useState(false);
  const [copyDone, setCopyDone] = useState(false);
  const [error, setError] = useState('');

  const chessRef = useRef(new Chess());
  const peerRef = useRef<any>(null);
  const connRef = useRef<any>(null);
  const historyEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    historyEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [moveHistory]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      connRef.current?.close();
      peerRef.current?.destroy();
    };
  }, []);

  async function loadPeer() {
    const { Peer } = await import('peerjs');
    return Peer;
  }

  // ── Host a game ─────────────────────────────────────────────────────────────
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
      conn.on('open', () => {
        setConnected(true);
        setPhase('playing');
        // Host is white (randomly decide and tell opponent)
        const myColor: 'w' | 'b' = Math.random() < 0.5 ? 'w' : 'b';
        const oppColor: 'w' | 'b' = myColor === 'w' ? 'b' : 'w';
        setPlayerColor(myColor);
        chessRef.current = new Chess();
        setFen(chessRef.current.fen());
        conn.send({ type: 'GAME_START', yourColor: oppColor, hostName: user?.username });
        setStatus(myColor === 'w' ? 'Your turn (White)' : 'Opponent\'s turn');
      });
      setupConnHandlers(conn);
    });

    peer.on('error', (e: any) => {
      setError('Connection error. Try again.');
      setPhase('menu');
    });
  }

  // ── Join a game ─────────────────────────────────────────────────────────────
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
      conn.on('open', () => {
        conn.send({ type: 'JOIN', name: user?.username });
      });
      setupConnHandlers(conn);
    });

    peer.on('error', () => {
      setError('Room not found. Check the code and try again.');
      setPhase('menu');
    });
  }

  function setupConnHandlers(conn: any) {
    conn.on('data', (data: any) => {
      if (data.type === 'GAME_START') {
        setPlayerColor(data.yourColor);
        setOpponentName(data.hostName || 'Host');
        setConnected(true);
        setPhase('playing');
        chessRef.current = new Chess();
        setFen(chessRef.current.fen());
        setStatus(data.yourColor === 'w' ? 'Your turn (White)' : 'Opponent\'s turn (White goes first)');
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
          setMoveHistory(chess.history());
          updateCheck(chess);
          if (chess.isGameOver()) handleGameOver(chess, false);
          else setStatus('Your turn');
        }
      }

      if (data.type === 'RESIGN') {
        setGameOver('win');
        setStatus('Opponent resigned — You win!');
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
    setMoveHistory(chess.history());
    updateCheck(chess);
    if (chess.isGameOver()) handleGameOver(chess, true);
    else setStatus('Opponent\'s turn');
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

  const pairs: [string, string?][] = [];
  for (let i = 0; i < moveHistory.length; i += 2) pairs.push([moveHistory[i], moveHistory[i+1]]);
  const chess = chessRef.current;
  const isMyTurn = chess.turn() === playerColor;

  // ── Menu ────────────────────────────────────────────────────────────────────
  if (phase === 'menu') return (
    <div className="online-lobby">
      <div className="lobby-card glass-card">
        <div className="lobby-icon">🌐</div>
        <h2 className="lobby-title">Play Online</h2>
        <p className="lobby-desc">Share a room code with a friend — no account or server needed. Fully peer-to-peer!</p>
        {error && <div className="auth-error">{error}</div>}
        <button className="btn btn-primary" style={{ width: '100%' }} onClick={hostGame}>
          ➕ Create Room
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
        <button className="btn btn-secondary" style={{ width: '100%' }} onClick={onBack}>← Back</button>
      </div>
    </div>
  );

  // ── Hosting / Waiting ────────────────────────────────────────────────────────
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
          Waiting for opponent…
        </div>
        <button className="btn btn-danger" style={{ width: '100%', marginTop: 8 }} onClick={() => { peerRef.current?.destroy(); setPhase('menu'); }}>
          Cancel
        </button>
      </div>
    </div>
  );

  // ── Joining ──────────────────────────────────────────────────────────────────
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

  // ── Game ─────────────────────────────────────────────────────────────────────
  return (
    <div className="app-content">
      <ChessBoard
        fen={fen}
        playerColor={playerColor}
        onMove={handlePlayerMove}
        disabled={!isMyTurn || !!gameOver}
        lastMove={lastMove}
        checkSquare={checkSquare}
      />

      <div className="side-panel">
        <div className="glass-card status-card">
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <div>
              <div className="controls-title">You ({playerColor === 'w' ? '⬜ White' : '⬛ Black'})</div>
              <div style={{ fontWeight: 700 }}>{user?.username}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div className="controls-title">Opponent</div>
              <div style={{ fontWeight: 700 }}>{opponentName}</div>
            </div>
          </div>

          <div className={`status-message ${chess.inCheck() ? 'check' : ''}`}>
            {isMyTurn && !gameOver ? '🟢 Your turn' : !gameOver ? '⏳ Waiting…' : ''} {status}
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
              <button className="btn btn-primary" style={{ marginTop: 12, width: '100%' }} onClick={onBack}>Back to Menu</button>
            </div>
          )}
        </div>

        {!gameOver && (
          <div className="glass-card controls-card">
            <div className="controls-title">Controls</div>
            <div className="btn-row">
              <button className="btn btn-secondary" onClick={offerDraw}>🤝 Draw</button>
              <button className="btn btn-danger" onClick={resign}>🏳️ Resign</button>
            </div>
          </div>
        )}

        <div className="glass-card history-card">
          <div className="controls-title">Move History</div>
          <div className="history-scroll">
            {pairs.length === 0 && <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Game just started</div>}
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
