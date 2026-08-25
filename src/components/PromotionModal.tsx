'use client';

interface Props {
  color: 'w' | 'b';
  onSelect: (piece: string) => void;
}

const PIECES = [
  { type: 'q', label: 'Queen',  symbol: '♛' },
  { type: 'r', label: 'Rook',   symbol: '♜' },
  { type: 'b', label: 'Bishop', symbol: '♝' },
  { type: 'n', label: 'Knight', symbol: '♞' },
];

export default function PromotionModal({ color, onSelect }: Props) {
  const whiteSymbols: Record<string,string> = { q:'♕', r:'♖', b:'♗', n:'♘' };

  return (
    <div className="modal-overlay">
      <div className="modal-card">
        <p className="modal-title">Choose promotion piece</p>
        <div className="promotion-pieces">
          {PIECES.map(p => (
            <button
              key={p.type}
              className="promotion-btn"
              onClick={() => onSelect(p.type)}
              aria-label={p.label}
              title={p.label}
            >
              {color === 'w' ? whiteSymbols[p.type] : p.symbol}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
