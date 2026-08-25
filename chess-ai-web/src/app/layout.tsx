import type { Metadata } from 'next';
import './globals.css';
import './components.css';

export const metadata: Metadata = {
  title: 'ChessAI — Play Chess Online with AI',
  description: 'Play chess online against friends or challenge an adaptive AI that grows with your rank. Beautiful, real-time chess powered by Socket.io.',
  keywords: 'chess, chess AI, online chess, multiplayer chess, chess game',
  openGraph: {
    title: 'ChessAI — Play Chess Online',
    description: 'Challenge friends online or battle an adaptive AI. Your rank shapes the AI difficulty.',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
