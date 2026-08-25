'use client';
import ChessPiece from './ChessPiece';

interface Props {
  color: 'w' | 'b';
  onSelect: (piece: string) => void;
}

const PIECES = [
  { type: 'q', label: 'Queen' },
  { type: 'r', label: 'Rook' },
  { type: 'b', label: 'Bishop' },
  { type: 'n', label: 'Knight' },
];

export default function PromotionModal({ color, onSelect }: Props) {
  return (
    <div className="modal-overlay">
      <div className="modal-card">
        <p className="modal-title">Choose Promotion Piece</p>
        <div className="promotion-pieces">
          {PIECES.map(p => (
            <button
              key={p.type}
              className="promotion-btn"
              onClick={() => onSelect(p.type)}
              aria-label={p.label}
              title={p.label}
            >
              <ChessPiece type={p.type} color={color} />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
