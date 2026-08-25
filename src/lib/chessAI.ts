// ─── Chess AI: Minimax with Alpha-Beta Pruning ────────────────────────────────
// Mirrors the original Python ChessAI class, extended with piece-square tables

export const PIECE_VALUES: Record<string, number> = {
  p: 100,
  n: 320,
  b: 330,
  r: 500,
  q: 900,
  k: 20000,
};

// Piece-square tables (from white's perspective, rank 1 at index 0)
const PAWN_TABLE = [
  0,  0,  0,  0,  0,  0,  0,  0,
  50, 50, 50, 50, 50, 50, 50, 50,
  10, 10, 20, 30, 30, 20, 10, 10,
   5,  5, 10, 25, 25, 10,  5,  5,
   0,  0,  0, 20, 20,  0,  0,  0,
   5, -5,-10,  0,  0,-10, -5,  5,
   5, 10, 10,-20,-20, 10, 10,  5,
   0,  0,  0,  0,  0,  0,  0,  0,
];

const KNIGHT_TABLE = [
  -50,-40,-30,-30,-30,-30,-40,-50,
  -40,-20,  0,  0,  0,  0,-20,-40,
  -30,  0, 10, 15, 15, 10,  0,-30,
  -30,  5, 15, 20, 20, 15,  5,-30,
  -30,  0, 15, 20, 20, 15,  0,-30,
  -30,  5, 10, 15, 15, 10,  5,-30,
  -40,-20,  0,  5,  5,  0,-20,-40,
  -50,-40,-30,-30,-30,-30,-40,-50,
];

const BISHOP_TABLE = [
  -20,-10,-10,-10,-10,-10,-10,-20,
  -10,  0,  0,  0,  0,  0,  0,-10,
  -10,  0,  5, 10, 10,  5,  0,-10,
  -10,  5,  5, 10, 10,  5,  5,-10,
  -10,  0, 10, 10, 10, 10,  0,-10,
  -10, 10, 10, 10, 10, 10, 10,-10,
  -10,  5,  0,  0,  0,  0,  5,-10,
  -20,-10,-10,-10,-10,-10,-10,-20,
];

const ROOK_TABLE = [
   0,  0,  0,  0,  0,  0,  0,  0,
   5, 10, 10, 10, 10, 10, 10,  5,
  -5,  0,  0,  0,  0,  0,  0, -5,
  -5,  0,  0,  0,  0,  0,  0, -5,
  -5,  0,  0,  0,  0,  0,  0, -5,
  -5,  0,  0,  0,  0,  0,  0, -5,
  -5,  0,  0,  0,  0,  0,  0, -5,
   0,  0,  0,  5,  5,  0,  0,  0,
];

const QUEEN_TABLE = [
  -20,-10,-10, -5, -5,-10,-10,-20,
  -10,  0,  0,  0,  0,  0,  0,-10,
  -10,  0,  5,  5,  5,  5,  0,-10,
   -5,  0,  5,  5,  5,  5,  0, -5,
    0,  0,  5,  5,  5,  5,  0, -5,
  -10,  5,  5,  5,  5,  5,  0,-10,
  -10,  0,  5,  0,  0,  0,  0,-10,
  -20,-10,-10, -5, -5,-10,-10,-20,
];

const KING_MID_TABLE = [
  -30,-40,-40,-50,-50,-40,-40,-30,
  -30,-40,-40,-50,-50,-40,-40,-30,
  -30,-40,-40,-50,-50,-40,-40,-30,
  -30,-40,-40,-50,-50,-40,-40,-30,
  -20,-30,-30,-40,-40,-30,-30,-20,
  -10,-20,-20,-20,-20,-20,-20,-10,
   20, 20,  0,  0,  0,  0, 20, 20,
   20, 30, 10,  0,  0, 10, 30, 20,
];

const PIECE_TABLES: Record<string, number[]> = {
  p: PAWN_TABLE,
  n: KNIGHT_TABLE,
  b: BISHOP_TABLE,
  r: ROOK_TABLE,
  q: QUEEN_TABLE,
  k: KING_MID_TABLE,
};

function squareIndex(square: string, isWhite: boolean): number {
  const file = square.charCodeAt(0) - 'a'.charCodeAt(0);
  const rank = parseInt(square[1]) - 1;
  // White: rank 0 = bottom (index 56), rank 7 = top (index 0)
  const row = isWhite ? 7 - rank : rank;
  return row * 8 + file;
}

export function evaluateBoard(chess: any): number {
  if (chess.isCheckmate()) return chess.turn() === 'w' ? -9999 : 9999;
  if (chess.isStalemate() || chess.isInsufficientMaterial()) return 0;

  let score = 0;
  const board = chess.board();

  for (let r = 0; r < 8; r++) {
    for (let f = 0; f < 8; f++) {
      const piece = board[r][f];
      if (!piece) continue;
      const isWhite = piece.color === 'w';
      const pv = PIECE_VALUES[piece.type] ?? 0;
      const square = piece.square;
      const idx = squareIndex(square, isWhite);
      const positional = PIECE_TABLES[piece.type]?.[idx] ?? 0;
      const total = pv + positional;
      score += isWhite ? total : -total;
    }
  }
  return score;
}

export function minimax(
  chess: any,
  depth: number,
  alpha: number,
  beta: number,
  maximizing: boolean
): [number, any] {
  if (depth === 0 || chess.isGameOver()) {
    return [evaluateBoard(chess), null];
  }

  const moves = chess.moves({ verbose: true });
  // Move ordering: captures first
  moves.sort((a: any, b: any) => {
    const aCapture = a.flags.includes('c') ? 1 : 0;
    const bCapture = b.flags.includes('c') ? 1 : 0;
    return bCapture - aCapture;
  });

  let bestMove = moves[0] ?? null;

  if (maximizing) {
    let maxEval = -Infinity;
    for (const move of moves) {
      chess.move(move);
      const [evalScore] = minimax(chess, depth - 1, alpha, beta, false);
      chess.undo();
      if (evalScore > maxEval) { maxEval = evalScore; bestMove = move; }
      alpha = Math.max(alpha, evalScore);
      if (beta <= alpha) break;
    }
    return [maxEval, bestMove];
  } else {
    let minEval = Infinity;
    for (const move of moves) {
      chess.move(move);
      const [evalScore] = minimax(chess, depth - 1, alpha, beta, true);
      chess.undo();
      if (evalScore < minEval) { minEval = evalScore; bestMove = move; }
      beta = Math.min(beta, evalScore);
      if (beta <= alpha) break;
    }
    return [minEval, bestMove];
  }
}

export function getAIMove(chess: any, depth: number = 3): any {
  const isBlack = chess.turn() === 'b';
  const [, move] = minimax(chess, depth, -Infinity, Infinity, !isBlack);
  return move;
}
