'use client';

// Inline SVG piece set (Unicode-based with custom styling)
// Maps piece type + color to Unicode chess symbols
const UNICODE_PIECES: Record<string, string> = {
  wK: '♔', wQ: '♕', wR: '♖', wB: '♗', wN: '♘', wP: '♙',
  bK: '♚', bQ: '♛', bR: '♜', bB: '♝', bN: '♞', bP: '♟',
};

interface Props {
  type: string;  // 'k','q','r','b','n','p'
  color: 'w' | 'b';
  size?: number;
  dragging?: boolean;
}

export default function ChessPiece({ type, color, dragging = false }: Props) {
  const key = `${color}${type.toUpperCase()}`;
  const symbol = UNICODE_PIECES[key] ?? '?';

  return (
    <span
      className={`piece-symbol ${color === 'w' ? 'piece-white' : 'piece-black'} ${dragging ? 'piece-dragging' : ''}`}
      aria-label={`${color === 'w' ? 'White' : 'Black'} ${type}`}
    >
      {symbol}
    </span>
  );
}
