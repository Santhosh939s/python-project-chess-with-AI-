'use client';
import React from 'react';

// Premium Staunton/Neo Vector Chess Pieces (SVG)
const PIECE_SVGS: Record<string, (color: 'w' | 'b') => React.ReactNode> = {
  p: (color) => {
    const isWhite = color === 'w';
    return (
      <svg viewBox="0 0 45 45" className="piece-svg">
        <path
          d="M22.5 9c-2.21 0-4 1.79-4 4 0 .89.29 1.71.78 2.38C17.33 16.5 16 18.59 16 21c0 2.03.94 3.84 2.41 5.03-3 1.06-7.41 5.55-7.41 13.47h23c0-7.92-4.41-12.41-7.41-13.47 1.47-1.19 2.41-3 2.41-5.03 0-2.41-1.33-4.5-3.28-5.62.49-.67.78-1.49.78-2.38 0-2.21-1.79-4-4-4z"
          fill={isWhite ? '#ffffff' : '#262421'}
          stroke="#000000"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        {isWhite && (
          <path
            d="M22.5 10c1.66 0 3 1.34 3 3 0 .55-.15 1.05-.42 1.48-.38.6-.28 1.39.23 1.88.92.88 1.69 2.04 1.69 3.64 0 1.5-.72 2.81-1.84 3.64-.5.37-.71 1.01-.52 1.6.93 2.87 3.51 6.27 4.86 11.26H13.5c1.35-4.99 3.93-8.39 4.86-11.26.19-.59-.02-1.23-.52-1.6-1.12-.83-1.84-2.14-1.84-3.64 0-1.6.77-2.76 1.69-3.64.51-.49.61-1.28.23-1.88-.27-.43-.42-.93-.42-1.48 0-1.66 1.34-3 3-3z"
            fill="#ffffff"
          />
        )}
      </svg>
    );
  },

  r: (color) => {
    const isWhite = color === 'w';
    return (
      <svg viewBox="0 0 45 45" className="piece-svg">
        <g
          fill={isWhite ? '#ffffff' : '#262421'}
          fillRule="evenodd"
          stroke="#000000"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M9 39h27v-3H9v3zM12 36h21l-1.5-4h-18L12 36zM11 14h23l-2 18H13l-2-18zM9 10h27v4H9v-4z" />
          <path d="M9 10L9 7h4v2h5V7h5v2h5V7h4v3H9z" />
          {isWhite && (
            <path
              d="M12 14h21l-2 18H13l-2-18z"
              fill="#ffffff"
              stroke="none"
            />
          )}
          {isWhite && (
            <path
              d="M11 14h23l-2 18H13l-2-18zM12 36h21l-1.5-4h-18L12 36z"
              fill="none"
              stroke="#000000"
              strokeWidth="1.5"
            />
          )}
        </g>
      </svg>
    );
  },

  n: (color) => {
    const isWhite = color === 'w';
    return (
      <svg viewBox="0 0 45 45" className="piece-svg">
        <g
          fill={isWhite ? '#ffffff' : '#262421'}
          fillRule="evenodd"
          stroke="#000000"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M 22,10 C 32.5,11 38.5,18 38,39 L 15,39 C 15,30 25,32.5 23,18 C 23,11 15,11 15,11 0 11 10,24 10,24 C 10,24 13.5,15.5 19,12 C 18,11 16.5,10 16.5,10 C 16.5,10 21,9 22,10 z" />
          <path d="M 24,18 C 24.38,20.91 18.45,25.37 16,27 C 13,29 13.18,31.34 11,31 C 9.958,30.06 12.41,27.96 11,28 C 10,28 11.19,29.23 10,30 C 9,30 5.997,31 6,26 C 6,24 12,14 12,14 C 12,14 13.89,12.1 14,10.5 C 13.27,9.506 13.5,8.5 13.5,8.5 C 14.5,9 16.5,10 16.5,10 L 22,10 C 22,10 24.34,14.65 24,18 z" />
          {isWhite && (
            <path
              d="M 9.5,25.5 A 0.5,0.5 0 1 1 8.5,25.5 A 0.5,0.5 0 1 1 9.5,25.5 z"
              fill="#000000"
              stroke="#000000"
            />
          )}
          {!isWhite && (
            <path
              d="M 9.5,25.5 A 0.5,0.5 0 1 1 8.5,25.5 A 0.5,0.5 0 1 1 9.5,25.5 z"
              fill="#ffffff"
              stroke="#ffffff"
            />
          )}
          <path
            d="M 15,15.5 A 0.5,1.5 0 1 1 14,15.5 A 0.5,1.5 0 1 1 15,15.5 z"
            transform="matrix(0.866,0.5,-0.5,0.866,9.693,-5.173)"
            fill={isWhite ? '#000000' : '#ffffff'}
            stroke={isWhite ? '#000000' : '#ffffff'}
          />
        </g>
      </svg>
    );
  },

  b: (color) => {
    const isWhite = color === 'w';
    return (
      <svg viewBox="0 0 45 45" className="piece-svg">
        <g
          fill={isWhite ? '#ffffff' : '#262421'}
          fillRule="evenodd"
          stroke="#000000"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <g strokeLinejoin="miter">
            <path d="M9 36c1.2-2.5 7-4 13.5-4 6.5 0 12.3 1.5 13.5 4H9z" />
            <path d="M15 32c2.5-2.5 12.5-2.5 15 0H15z" />
            <path d="M25 8a2.5 2.5 0 1 1-5 0 2.5 2.5 0 1 1 5 0z" />
            <path d="M17.5 26h10c.5-2 1.5-4 1.5-6 0-5-3.5-8-6.5-8s-6.5 3-6.5 8c0 2 1 4 1.5 6z" />
          </g>
          <path d="M11 14c3.5 0 6.5 3 6.5 8 0 2-1 4-1.5 6h13c-.5-2-1.5-4-1.5-6 0-5-3-8-6.5-8" />
          <path d="M20 18h5M22.5 15.5v5" fill="none" stroke="#000000" strokeWidth="1.5" />
        </g>
      </svg>
    );
  },

  q: (color) => {
    const isWhite = color === 'w';
    return (
      <svg viewBox="0 0 45 45" className="piece-svg">
        <g
          fill={isWhite ? '#ffffff' : '#262421'}
          fillRule="evenodd"
          stroke="#000000"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M8 12a2 2 0 1 1-4 0 2 2 0 1 1 4 0zM24.5 7.5a2 2 0 1 1-4 0 2 2 0 1 1 4 0zM41 12a2 2 0 1 1-4 0 2 2 0 1 1 4 0zM16 8.5a2 2 0 1 1-4 0 2 2 0 1 1 4 0zM33 8.5a2 2 0 1 1-4 0 2 2 0 1 1 4 0z" />
          <path d="M9 26c8.5-1.5 21.5-1.5 27 0l2-12-7 11V11l-5.5 13.5L22.5 10l-3 14.5L14 11v14L7 14l2 12z" />
          <path d="M9 26c0 2 1.5 2 2.5 4 1 1.5 1 1.5 1 3.5h20c0-2 0-2 1-3.5 1-2 2.5-2 2.5-4H9z" />
          <path d="M11 38.5h23v-3H11v3z" />
          {isWhite && (
            <path
              d="M11 29c8.5-1.5 21.5-1.5 23 0M11 38.5h23"
              fill="none"
              stroke="#000000"
              strokeWidth="1.5"
            />
          )}
        </g>
      </svg>
    );
  },

  k: (color) => {
    const isWhite = color === 'w';
    return (
      <svg viewBox="0 0 45 45" className="piece-svg">
        <g
          fill={isWhite ? '#ffffff' : '#262421'}
          fillRule="evenodd"
          stroke="#000000"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M22.5 11.63V6M20 8h5" fill="none" stroke="#000000" strokeWidth="1.5" />
          <path d="M22.5 25c-4 0-7.5 1.5-10.5 4.5s-4.5 6.5-4.5 10.5h30c0-4-1.5-7.5-4.5-10.5S26.5 25 22.5 25z" />
          <path d="M11.5 37c5.5 3.5 16.5 3.5 22 0v-7c-5.5 3.5-16.5 3.5-22 0v7z" />
          <path d="M11.5 30c5.5-3.5 16.5-3.5 22 0v-7c-5.5-3.5-16.5-3.5-22 0v7z" />
          <path d="M11.5 23c5.5-3.5 16.5-3.5 22 0V16c-5.5-3.5-16.5-3.5-22 0v7z" />
        </g>
      </svg>
    );
  },
};

interface Props {
  type: string;  // 'k','q','r','b','n','p'
  color: 'w' | 'b';
  dragging?: boolean;
}

export default function ChessPiece({ type, color, dragging = false }: Props) {
  const key = type.toLowerCase();
  const renderSvg = PIECE_SVGS[key];

  if (!renderSvg) return null;

  return (
    <div
      className={`piece-container ${dragging ? 'piece-dragging' : ''}`}
      aria-label={`${color === 'w' ? 'White' : 'Black'} ${type}`}
    >
      {renderSvg(color)}
    </div>
  );
}
