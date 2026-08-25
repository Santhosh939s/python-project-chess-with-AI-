'use client';
import { useState, useEffect, useCallback } from 'react';
import { Chess } from 'chess.js';
import ChessPiece from './ChessPiece';
import PromotionModal from './PromotionModal';

const FILES = ['a','b','c','d','e','f','g','h'];
const RANKS = ['8','7','6','5','4','3','2','1'];

interface Props {
  fen?: string;
  playerColor: 'w' | 'b'; // which side the user controls
  onMove?: (move: any) => void; // called when a move is made (for AI / online)
  disabled?: boolean;
  lastMove?: { from: string; to: string } | null;
  checkSquare?: string | null;
}

export default function ChessBoard({ fen, playerColor, onMove, disabled = false, lastMove, checkSquare }: Props) {
  const [chess] = useState(() => new Chess(fen ?? undefined));
  const [selected, setSelected] = useState<string | null>(null);
  const [legalSquares, setLegalSquares] = useState<string[]>([]);
  const [legalCaptures, setLegalCaptures] = useState<string[]>([]);
  const [promotion, setPromotion] = useState<{ from: string; to: string } | null>(null);

  // Sync FEN when it changes (online mode)
  useEffect(() => {
    if (fen && fen !== chess.fen()) {
      chess.load(fen);
    }
  }, [fen, chess]);

  const selectSquare = useCallback((sq: string) => {
    if (disabled) return;

    const piece = chess.get(sq as any);

    // If a square is already selected
    if (selected) {
      // Try to make a move
      if (legalSquares.includes(sq) || legalCaptures.includes(sq)) {
        // Check if promotion
        const move = chess.moves({ verbose: true }).find(
          (m: any) => m.from === selected && m.to === sq
        );
        if (move && move.promotion !== undefined) {
          setPromotion({ from: selected, to: sq });
          return;
        }
        // Execute move
        const result = chess.move({ from: selected, to: sq });
        if (result) {
          onMove?.(result);
          setSelected(null);
          setLegalSquares([]);
          setLegalCaptures([]);
        }
        return;
      }

      // Re-select own piece
      if (piece && piece.color === playerColor && chess.turn() === playerColor) {
        setSelected(sq);
        computeLegal(sq);
        return;
      }

      // Deselect
      setSelected(null);
      setLegalSquares([]);
      setLegalCaptures([]);
      return;
    }

    // Fresh selection — must be own piece on own turn
    if (piece && piece.color === playerColor && chess.turn() === playerColor) {
      setSelected(sq);
      computeLegal(sq);
    }
  }, [chess, selected, legalSquares, legalCaptures, playerColor, disabled, onMove]);

  function computeLegal(sq: string) {
    const moves = chess.moves({ square: sq as any, verbose: true });
    const targets = moves.map((m: any) => m.to);
    const captures = moves.filter((m: any) => m.flags.includes('c') || m.flags.includes('e')).map((m: any) => m.to);
    setLegalSquares(targets);
    setLegalCaptures(captures);
  }

  function handlePromotion(piece: string) {
    if (!promotion) return;
    const result = chess.move({ from: promotion.from, to: promotion.to, promotion: piece });
    if (result) onMove?.(result);
    setPromotion(null);
    setSelected(null);
    setLegalSquares([]);
    setLegalCaptures([]);
  }

  // Flip board if player is black
  const ranks = playerColor === 'b' ? [...RANKS].reverse() : RANKS;
  const files = playerColor === 'b' ? [...FILES].reverse() : FILES;

  const board = chess.board();

  return (
    <>
      <div className="board-wrapper">
        {/* Rank labels */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <div className="coord-rank">
            {ranks.map(r => (
              <span key={r} className="coord-label">{r}</span>
            ))}
          </div>

          <div className="board-container">
            <div className="board-grid">
              {ranks.map((rank, ri) =>
                files.map((file, fi) => {
                  const sq = `${file}${rank}`;
                  const isLight = (ri + fi) % 2 === 0;
                  const rankIdx = 8 - parseInt(rank);
                  const fileIdx = file.charCodeAt(0) - 97;
                  const piece = board[rankIdx]?.[fileIdx];

                  const isSelected = selected === sq;
                  const isLegal = legalSquares.includes(sq);
                  const isCapture = legalCaptures.includes(sq);
                  const isLastFrom = lastMove?.from === sq;
                  const isLastTo = lastMove?.to === sq;
                  const isCheck = checkSquare === sq;

                  let squareClass = `square ${isLight ? 'light' : 'dark'}`;
                  if (isSelected) squareClass += ' selected';
                  if (isCheck) squareClass += ' in-check';
                  else if (isLastFrom) squareClass += ' last-move-from';
                  else if (isLastTo)   squareClass += ' last-move-to';
                  if (isLegal && !isCapture) squareClass += ' legal-move';
                  if (isCapture)             squareClass += ' legal-capture';

                  return (
                    <div
                      key={sq}
                      id={`sq-${sq}`}
                      className={squareClass}
                      onClick={() => selectSquare(sq)}
                      role="button"
                      aria-label={sq}
                    >
                      {piece && (
                        <ChessPiece
                          type={piece.type}
                          color={piece.color}
                        />
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* File labels */}
        <div style={{ display: 'flex', marginLeft: '1.4rem' }}>
          <div className="coord-file">
            {files.map(f => (
              <span key={f} className="coord-label">{f}</span>
            ))}
          </div>
        </div>
      </div>

      {promotion && (
        <PromotionModal color={playerColor} onSelect={handlePromotion} />
      )}
    </>
  );
}
