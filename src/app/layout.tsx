import type { Metadata, Viewport } from 'next';
import './globals.css';
import './components.css';

export const metadata: Metadata = {
  title: 'ChessAI — Play Chess Online with AI',
  description: 'Play chess online against friends or challenge an adaptive AI that grows with your rank.',
  keywords: 'chess, chess AI, online chess, multiplayer chess, chess game',
  openGraph: {
    title: 'ChessAI — Play Chess Online',
    description: 'Challenge friends online or battle an adaptive AI. Your rank shapes the AI difficulty.',
    type: 'website',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
