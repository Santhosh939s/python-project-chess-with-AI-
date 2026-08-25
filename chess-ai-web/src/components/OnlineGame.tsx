'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { Chess } from 'chess.js';
import ChessBoard from '@/components/ChessBoard';
import { getSocket } from '@/lib/socket';

interface Props {
  user: any;
  onGameEnd: (result: 'win' | 'loss' | 'draw') => void;
  onBack: () => void;
}

type LobbyState = 'menu' | 'waiting' | 'playing';

export default function OnlineGame({ user, onGameEnd, onBack }: Props) {
  const [lobbyState, setLobbyState] = useState<LobbyState>('menu');
  const [gameId, setGameId] = useState<string | null>(null);
  const [playerColor, setPlayerColor] = useState<'w' | 'b'>('w');
  const [fen, setFen] = useState(new Chess().fen());
  const [lastMove, setLastMove] = useState<{ from: string; to: string } | null>(null);
  const [checkSquare, setCheckSquare] = useState<string | null>(null);
  const [gameOver, setGameOver] = useState<{ result: string; reason: string } | null>(null);
  const [moveHistory, setMoveHistory] = useState<string[]>([]);
  const [status, setStatus] = useState('');
  const [opponentName, setOpponentName] = useState('');
  const [drawOffer, setDrawOffer] = useState(false);
  const chessRef = useRef(new Chess());
  const historyEndRef = useRef<HTMLDivElement>(null);

  const socket = getSocket();

  useEffect(() => {
    if (!socket.connected) {
      socket.auth = { token: localStorage.getItem('chess_token') };
      socket.connect();
    }

    socket.on('matchmaking:waiting', () => setLobbyState('waiting'));
    socket.on('matchmaking:cancelled', () => setLobbyState('menu'));

    socket.on('game:start', (data: any) => {
      chessRef.current = new Chess();
      setFen(chessRef.current.fen());
      setGameId(data.gameId);
      setMoveHistory([]);
      setLastMove(null);
      setCheckSquare(null);
      setGameOver(null);
      setLobbyState('playing');
      const opp = data.whiteUsername === user.username ? data.blackUsername : data.whiteUsername;
      setOpponentName(opp);
      setStatus('Game started!');
    });

    socket.on('game:color', (color: 'white' | 'black') => {
      setPlayerColor(color === 'white' ? 'w' : 'b');
    });

    socket.on('game:moved', (data: any) => {
      const chess = chessRef.current;
      chess.move(data.move);
      setFen(chess.fen());
      setLastMove({ from: data.move.from, to: data.move.to });
      setMoveHistory(chess.history());
      // check status
      if (chess.inCheck()) {
        const board = chess.board();
        for (let r = 0; r < 8; r++) {
          for (let f = 0; f < 8; f++) {
            const p = board[r][f];
            if (p && p.type === 'k' && p.color === chess.turn()) {
              setCheckSquare(p.square);
            }
          }
        }
        setStatus(`${chess.turn() === 'w' ? 'White' : 'Black'} in check!`);
      } else {
        setCheckSquare(null);
        setStatus(`${chess.turn() === 'w' ? 'White' : 'Black'} to move`);
      }
    });

    socket.on('game:invalid_move', () => {
      setStatus('Invalid move!');
    });

    socket.on('game:over', (data: any) => {
      setGameOver(data);
      let outcomeForPlayer: 'win' | 'loss' | 'draw' = 'draw';
      const chess = chessRef.current;
      if (data.result === '1/2-1/2') outcomeForPlayer = 'draw';
      else if (data.result === '1-0') outcomeForPlayer = playerColor === 'w' ? 'win' : 'loss';
      else outcomeForPlayer = playerColor === 'b' ? 'win' : 'loss';
      onGameEnd(outcomeForPlayer);
    });

    socket.on('game:draw_offered', (data: any) => {
      setDrawOffer(true);
      setStatus(`${data.by} offered a draw`);
    });

    socket.on('game:draw_declined', () => {
      setStatus('Draw offer declined');
    });

    socket.on('profile:update', (updated: any) => {
      localStorage.setItem('chess_user', JSON.stringify(updated));
    });

    socket.on('error', (err: any) => setStatus(err.message));

    return () => {
      socket.off('matchmaking:waiting');
      socket.off('matchmaking:cancelled');
      socket.off('game:start');
      socket.off('game:color');
      socket.off('game:moved');
      socket.off('game:invalid_move');
      socket.off('game:over');
      socket.off('game:draw_offered');
      socket.off('game:draw_declined');
      socket.off('profile:update');
      socket.off('error');
    };
  }, [socket, user, playerColor, onGameEnd]);

  useEffect(() => {
    historyEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [moveHistory]);

  function joinMatchmaking() {
    socket.emit('matchmaking:join');
  }

  function cancelMatchmaking() {
    socket.emit('matchmaking:cancel');
    setLobbyState('menu');
  }

  function handlePlayerMove(move: any) {
    if (!gameId) return;
    socket.emit('game:move', { gameId, move: { from: move.from, to: move.to, promotion: move.promotion } });
  }

  function resign() {
    if (!gameId) return;
    socket.emit('game:resign', { gameId });
  }

  function offerDraw() {
    if (!gameId) return;
    socket.emit('game:draw_offer', { gameId });
  }

  function acceptDraw() {
    if (!gameId) return;
    socket.emit('game:draw_accept', { gameId });
    setDrawOffer(false);
  }

  function declineDraw() {
    if (!gameId) return;
    socket.emit('game:draw_decline', { gameId });
    setDrawOffer(false);
  }

  const pairs: [string, string?][] = [];
  for (let i = 0; i < moveHistory.length; i += 2) {
    pairs.push([moveHistory[i], moveHistory[i + 1]]);
  }

  const chess = chessRef.current;
  const isMyTurn = chess.turn() === playerColor;

  // ── Lobby view ─────────────────────────────────────────────────────────────
  if (lobbyState === 'menu') {
    return (
      <div className="online-lobby">
        <div className="lobby-card glass-card">
          <div className="lobby-icon">🌐</div>
          <h2 className="lobby-title">Online Matchmaking</h2>
          <p className="lobby-desc">
            Get matched with another player instantly. Colors are assigned randomly — best of luck!
          </p>
          <div className="lobby-info">
            <div className="lobby-stat">
              <span className="lobby-stat-label">Your Rank</span>
              <span className="lobby-stat-value">{user?.rank ?? '—'}</span>
            </div>
            <div className="lobby-stat">
              <span className="lobby-stat-label">Wins</span>
              <span className="lobby-stat-value">{user?.wins ?? 0}</span>
            </div>
          </div>
          <button className="btn btn-primary" style={{ width: '100%' }} onClick={joinMatchmaking}>
            🔍 Find Opponent
          </button>
          <button className="btn btn-secondary" style={{ width: '100%', marginTop: 8 }} onClick={onBack}>
            ← Back to Menu
          </button>
        </div>
      </div>
    );
  }

  if (lobbyState === 'waiting') {
    return (
      <div className="online-lobby">
        <div className="lobby-card glass-card">
          <div className="lobby-icon">⏳</div>
          <h2 className="lobby-title">Finding Opponent…</h2>
          <div className="ai-thinking" style={{ justifyContent: 'center', marginTop: 12 }}>
            <div className="thinking-dots"><span/><span/><span/></div>
            Searching for a match
          </div>
          <p className="lobby-desc" style={{ marginTop: 16 }}>
            Waiting for another player to join the queue.
          </p>
          <button className="btn btn-danger" style={{ width: '100%', marginTop: 16 }} onClick={cancelMatchmaking}>
            Cancel
          </button>
        </div>
      </div>
    );
  }

  // ── In-game view ────────────────────────────────────────────────────────────
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
        {/* Players */}
        <div className="glass-card status-card">
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <div>
              <div className="controls-title">You ({playerColor === 'w' ? '⬜' : '⬛'})</div>
              <div style={{ fontWeight: 700 }}>{user?.username}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--accent-light)' }}>{user?.rank}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div className="controls-title">Opponent ({playerColor === 'w' ? '⬛' : '⬜'})</div>
              <div style={{ fontWeight: 700 }}>{opponentName || '—'}</div>
            </div>
          </div>

          <div className={`status-message ${chess.inCheck() ? 'check' : ''}`}>
            {isMyTurn ? '🟢 Your turn' : '⏳ Opponent\'s turn'} · {status}
          </div>

          {drawOffer && (
            <div style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 8, padding: '0.75rem' }}>
              <p style={{ fontSize: '0.85rem', marginBottom: 8 }}>Opponent offered a draw</p>
              <div className="btn-row">
                <button className="btn btn-secondary" onClick={acceptDraw}>Accept</button>
                <button className="btn btn-danger" onClick={declineDraw}>Decline</button>
              </div>
            </div>
          )}

          {gameOver && (
            <div className="game-over-banner">
              <div className="game-over-title">
                {gameOver.result === '1/2-1/2' ? '🤝 Draw' :
                  (gameOver.result === '1-0' && playerColor === 'w') || (gameOver.result === '0-1' && playerColor === 'b')
                    ? '🏆 You Win!' : '😔 You Lose'}
              </div>
              <div className="game-over-result">Reason: {gameOver.reason}</div>
              <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={onBack}>Back to Menu</button>
            </div>
          )}
        </div>

        {/* Controls */}
        {!gameOver && (
          <div className="glass-card controls-card">
            <div className="controls-title">Controls</div>
            <div className="btn-row">
              <button className="btn btn-secondary" onClick={offerDraw}>🤝 Draw</button>
              <button className="btn btn-danger" onClick={resign}>🏳️ Resign</button>
            </div>
          </div>
        )}

        {/* Move History */}
        <div className="glass-card history-card">
          <div className="controls-title">Move History</div>
          <div className="history-scroll">
            {pairs.length === 0 && (
              <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', padding: '0.5rem 0' }}>Game just started</div>
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
