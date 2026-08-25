const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { Chess } = require('chess.js');

const app = express();
const server = http.createServer(app);

const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:3000';
const JWT_SECRET = process.env.JWT_SECRET || 'chess_ai_super_secret_key';
const PORT = process.env.PORT || 4000;

// ─── In-Memory Stores ─────────────────────────────────────────────────────────
// In production, swap these with a real DB (MongoDB, PostgreSQL, etc.)
const users = new Map();        // username → user object
const sessions = new Map();     // socketId → username
const waitingQueue = [];        // sockets waiting for a match
const activeGames = new Map();  // gameId → game object

// ─── Rank & Difficulty System ─────────────────────────────────────────────────
const RANK_TIERS = [
  { name: 'Pawn',    min: 0,   max: 4,   depth: 2, color: '#94a3b8' },
  { name: 'Knight',  min: 5,   max: 14,  depth: 3, color: '#10b981' },
  { name: 'Bishop',  min: 15,  max: 29,  depth: 3, color: '#3b82f6' },
  { name: 'Rook',    min: 30,  max: 49,  depth: 4, color: '#8b5cf6' },
  { name: 'Queen',   min: 50,  max: 99,  depth: 4, color: '#f59e0b' },
  { name: 'King',    min: 100, max: Infinity, depth: 5, color: '#f43f5e' },
];

function getTier(wins) {
  return RANK_TIERS.find(t => wins >= t.min && wins <= t.max) || RANK_TIERS[0];
}

function createUser(username, passwordHash) {
  return {
    username,
    passwordHash,
    wins: 0,
    losses: 0,
    draws: 0,
    gamesPlayed: 0,
    createdAt: new Date().toISOString(),
  };
}

function userPublic(user) {
  const tier = getTier(user.wins);
  return {
    username: user.username,
    wins: user.wins,
    losses: user.losses,
    draws: user.draws,
    gamesPlayed: user.gamesPlayed,
    rank: tier.name,
    rankColor: tier.color,
    aiDepth: tier.depth,
  };
}

// ─── Express Middleware ───────────────────────────────────────────────────────
app.use(cors({ origin: CLIENT_URL, credentials: true }));
app.use(express.json());

// ─── Auth Middleware ──────────────────────────────────────────────────────────
function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}

// ─── REST Routes ──────────────────────────────────────────────────────────────
app.get('/health', (_, res) => res.json({ status: 'ok', players: users.size }));

// Register
app.post('/api/auth/register', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Username and password required' });
  if (username.length < 3 || username.length > 20) return res.status(400).json({ error: 'Username must be 3–20 characters' });
  if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });
  if (users.has(username.toLowerCase())) return res.status(409).json({ error: 'Username already taken' });

  const hash = await bcrypt.hash(password, 10);
  const user = createUser(username.toLowerCase(), hash);
  users.set(username.toLowerCase(), user);

  const token = jwt.sign({ username: user.username }, JWT_SECRET, { expiresIn: '7d' });
  res.status(201).json({ token, user: userPublic(user) });
});

// Login
app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  const user = users.get(username?.toLowerCase());
  if (!user) return res.status(401).json({ error: 'Invalid username or password' });

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) return res.status(401).json({ error: 'Invalid username or password' });

  const token = jwt.sign({ username: user.username }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, user: userPublic(user) });
});

// Get profile
app.get('/api/profile', authMiddleware, (req, res) => {
  const user = users.get(req.user.username);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ user: userPublic(user) });
});

// Leaderboard
app.get('/api/leaderboard', (_, res) => {
  const board = Array.from(users.values())
    .sort((a, b) => b.wins - a.wins || a.losses - b.losses)
    .slice(0, 20)
    .map(userPublic);
  res.json({ leaderboard: board });
});

// ─── Game Helpers ─────────────────────────────────────────────────────────────
function createGame(socket1, socket2, username1, username2) {
  const gameId = uuidv4();
  // Randomly assign colors
  const flip = Math.random() < 0.5;
  const white = flip ? socket1 : socket2;
  const black = flip ? socket2 : socket1;
  const whiteUsername = flip ? username1 : username2;
  const blackUsername = flip ? username2 : username1;

  const game = {
    id: gameId,
    chess: new Chess(),
    white: white.id,
    black: black.id,
    whiteUsername,
    blackUsername,
    moves: [],
    startedAt: new Date().toISOString(),
    status: 'active', // active | over
    result: null,
  };

  activeGames.set(gameId, game);

  // Join both sockets to the game room
  socket1.join(gameId);
  socket2.join(gameId);

  return { game, white, black };
}

function endGame(gameId, result, reason) {
  const game = activeGames.get(gameId);
  if (!game || game.status === 'over') return;
  game.status = 'over';
  game.result = result; // '1-0' | '0-1' | '1/2-1/2'

  // Update user stats
  const updateUser = (username, outcome) => {
    const u = users.get(username);
    if (!u) return;
    u.gamesPlayed++;
    if (outcome === 'win')  u.wins++;
    if (outcome === 'loss') u.losses++;
    if (outcome === 'draw') u.draws++;
  };

  if (result === '1-0') {
    updateUser(game.whiteUsername, 'win');
    updateUser(game.blackUsername, 'loss');
  } else if (result === '0-1') {
    updateUser(game.whiteUsername, 'loss');
    updateUser(game.blackUsername, 'win');
  } else {
    updateUser(game.whiteUsername, 'draw');
    updateUser(game.blackUsername, 'draw');
  }

  // Emit updated profiles
  const emitUpdate = (username) => {
    const u = users.get(username);
    if (u) {
      const sid = [...sessions.entries()].find(([, un]) => un === username)?.[0];
      if (sid) {
        const s = io.sockets.sockets.get(sid);
        if (s) s.emit('profile:update', userPublic(u));
      }
    }
  };
  emitUpdate(game.whiteUsername);
  emitUpdate(game.blackUsername);

  return game;
}

// ─── Socket.io ────────────────────────────────────────────────────────────────
const io = new Server(server, {
  cors: { origin: CLIENT_URL, methods: ['GET', 'POST'], credentials: true },
  pingTimeout: 60000,
});

io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (token) {
    try {
      socket.user = jwt.verify(token, JWT_SECRET);
    } catch {
      socket.user = null;
    }
  }
  next();
});

io.on('connection', (socket) => {
  console.log(`[+] Socket connected: ${socket.id} (${socket.user?.username || 'guest'})`);

  if (socket.user) {
    sessions.set(socket.id, socket.user.username);
  }

  // ── Matchmaking ────────────────────────────────────────────────────────────
  socket.on('matchmaking:join', () => {
    if (!socket.user) return socket.emit('error', { message: 'Login required to play online' });

    // Don't queue if already in a game
    const alreadyQueued = waitingQueue.find(s => s.id === socket.id);
    if (alreadyQueued) return;

    // Check if there's someone waiting
    const opponent = waitingQueue.shift();
    if (opponent && opponent.connected) {
      const p1user = socket.user.username;
      const p2user = opponent.user?.username;
      const { game, white, black } = createGame(socket, opponent, p1user, p2user);

      // Notify both players
      io.to(game.id).emit('game:start', {
        gameId: game.id,
        whiteUsername: game.whiteUsername,
        blackUsername: game.blackUsername,
        fen: game.chess.fen(),
      });

      white.emit('game:color', 'white');
      black.emit('game:color', 'black');

      console.log(`[Game] ${p1user} vs ${p2user} | ID: ${game.id}`);
    } else {
      waitingQueue.push(socket);
      socket.emit('matchmaking:waiting');
    }
  });

  socket.on('matchmaking:cancel', () => {
    const idx = waitingQueue.findIndex(s => s.id === socket.id);
    if (idx !== -1) waitingQueue.splice(idx, 1);
    socket.emit('matchmaking:cancelled');
  });

  // ── In-Game Move ───────────────────────────────────────────────────────────
  socket.on('game:move', ({ gameId, move }) => {
    const game = activeGames.get(gameId);
    if (!game || game.status === 'over') return;

    const username = socket.user?.username;
    const isWhite = game.white === socket.id;
    const isBlack = game.black === socket.id;

    // Validate it's this player's turn
    if (isWhite && game.chess.turn() !== 'w') return;
    if (isBlack && game.chess.turn() !== 'b') return;
    if (!isWhite && !isBlack) return;

    try {
      const result = game.chess.move(move);
      if (!result) return socket.emit('game:invalid_move');

      game.moves.push(result.san);

      const payload = {
        move: result,
        fen: game.chess.fen(),
        san: result.san,
        moveNum: game.moves.length,
      };

      io.to(gameId).emit('game:moved', payload);

      // Check game over
      if (game.chess.isGameOver()) {
        let result_str = '1/2-1/2';
        if (game.chess.isCheckmate()) {
          result_str = game.chess.turn() === 'w' ? '0-1' : '1-0';
        }
        const ended = endGame(gameId, result_str, 'checkmate');
        io.to(gameId).emit('game:over', {
          result: result_str,
          reason: game.chess.isCheckmate() ? 'checkmate'
                : game.chess.isStalemate() ? 'stalemate'
                : game.chess.isInsufficientMaterial() ? 'insufficient'
                : 'draw',
        });
      }
    } catch (e) {
      socket.emit('game:invalid_move', { error: e.message });
    }
  });

  // ── Resign ─────────────────────────────────────────────────────────────────
  socket.on('game:resign', ({ gameId }) => {
    const game = activeGames.get(gameId);
    if (!game || game.status === 'over') return;

    const isWhite = game.white === socket.id;
    const result = isWhite ? '0-1' : '1-0';
    endGame(gameId, result, 'resign');

    io.to(gameId).emit('game:over', {
      result,
      reason: 'resign',
      resignedBy: socket.user?.username,
    });
  });

  // ── Draw Offer ─────────────────────────────────────────────────────────────
  socket.on('game:draw_offer', ({ gameId }) => {
    const game = activeGames.get(gameId);
    if (!game || game.status === 'over') return;
    const opponentId = game.white === socket.id ? game.black : game.white;
    io.to(opponentId).emit('game:draw_offered', { by: socket.user?.username });
  });

  socket.on('game:draw_accept', ({ gameId }) => {
    const game = activeGames.get(gameId);
    if (!game || game.status === 'over') return;
    endGame(gameId, '1/2-1/2', 'agreement');
    io.to(gameId).emit('game:over', { result: '1/2-1/2', reason: 'agreement' });
  });

  socket.on('game:draw_decline', ({ gameId }) => {
    const game = activeGames.get(gameId);
    if (!game) return;
    const opponentId = game.white === socket.id ? game.black : game.white;
    io.to(opponentId).emit('game:draw_declined');
  });

  // ── Disconnect ─────────────────────────────────────────────────────────────
  socket.on('disconnect', () => {
    console.log(`[-] Socket disconnected: ${socket.id}`);

    // Remove from queue
    const idx = waitingQueue.findIndex(s => s.id === socket.id);
    if (idx !== -1) waitingQueue.splice(idx, 1);

    sessions.delete(socket.id);

    // Check active games — forfeit if mid-game
    for (const [gameId, game] of activeGames) {
      if ((game.white === socket.id || game.black === socket.id) && game.status === 'active') {
        const isWhite = game.white === socket.id;
        const result = isWhite ? '0-1' : '1-0';
        endGame(gameId, result, 'disconnect');
        io.to(gameId).emit('game:over', {
          result,
          reason: 'disconnect',
          disconnectedPlayer: socket.user?.username,
        });
        break;
      }
    }
  });
});

// ─── Start Server ─────────────────────────────────────────────────────────────
server.listen(PORT, () => {
  console.log(`🚀 Chess server running on port ${PORT}`);
  console.log(`   Client origin: ${CLIENT_URL}`);
});
