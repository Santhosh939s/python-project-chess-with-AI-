'use client';
import { useRef, useEffect } from 'react';
import { type Move } from 'chess.js';

interface Props {
  moveHistory: Move[];
  activeMoveIndex: number; // 0 = start, moveHistory.length = live
  onSelectMove: (index: number) => void;
}

export function formatMoveSan(san: string, color: 'w' | 'b'): { icon?: string; text: string } {
  const isWhite = color === 'w';
  const pieceIcons: Record<string, string> = {
    K: isWhite ? '♔' : '♚',
    Q: isWhite ? '♕' : '♛',
    R: isWhite ? '♖' : '♜',
    B: isWhite ? '♗' : '♝',
    N: isWhite ? '♘' : '♞',
  };

  const firstChar = san[0];
  if (pieceIcons[firstChar]) {
    return {
      icon: pieceIcons[firstChar],
      text: san.slice(1),
    };
  }
  return { text: san };
}

export default function TopMoveTicker({ moveHistory, activeMoveIndex, onSelectMove }: Props) {
  const tickerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll ticker horizontally when moves change WITHOUT scrolling the page
  useEffect(() => {
    if (tickerRef.current) {
      tickerRef.current.scrollLeft = tickerRef.current.scrollWidth;
    }
  }, [moveHistory.length]);

  const pairs: { w: Move; b?: Move; wIdx: number; bIdx?: number }[] = [];
  for (let i = 0; i < moveHistory.length; i += 2) {
    pairs.push({
      w: moveHistory[i],
      b: moveHistory[i + 1],
      wIdx: i + 1,
      bIdx: moveHistory[i + 1] ? i + 2 : undefined,
    });
  }

  return (
    <div className="top-move-ticker-bar glass-card">
      <div className="ticker-scroll" ref={tickerRef}>
        {pairs.length === 0 && (
          <span className="ticker-empty">Game started — Moves will appear here</span>
        )}
        {pairs.map(({ w, b, wIdx, bIdx }, i) => {
          const wFormatted = formatMoveSan(w.san, 'w');
          const bFormatted = b ? formatMoveSan(b.san, 'b') : null;

          return (
            <div key={i} className="ticker-pair">
              <span className="ticker-num">{i + 1}.</span>
              <button
                className={`ticker-chip ${activeMoveIndex === wIdx ? 'active' : ''}`}
                onClick={() => onSelectMove(wIdx)}
              >
                {wFormatted.icon && <span className="ticker-piece-icon">{wFormatted.icon}</span>}
                <span className="ticker-notation">{wFormatted.text}</span>
              </button>

              {b && bFormatted && (
                <button
                  className={`ticker-chip ${activeMoveIndex === bIdx ? 'active' : ''}`}
                  onClick={() => onSelectMove(bIdx!)}
                >
                  {bFormatted.icon && <span className="ticker-piece-icon">{bFormatted.icon}</span>}
                  <span className="ticker-notation">{bFormatted.text}</span>
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
