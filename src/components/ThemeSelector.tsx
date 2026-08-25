'use client';

export type BoardTheme = 'cyber' | 'sapphire' | 'amethyst';

interface Props {
  currentTheme: BoardTheme;
  onSelectTheme: (theme: BoardTheme) => void;
  onClose: () => void;
}

export const THEMES: { id: BoardTheme; name: string; desc: string; lightColor: string; darkColor: string }[] = [
  {
    id: 'cyber',
    name: 'Cyber Mint & Obsidian',
    desc: 'Invented Neon Mint Teal & Obsidian Slate',
    lightColor: '#2dd4bf',
    darkColor: '#0f172a',
  },
  {
    id: 'sapphire',
    name: 'Royal Sapphire & Pearl Gold',
    desc: 'Deep Sapphire Navy & Warm Pearl Quartz',
    lightColor: '#fef3c7',
    darkColor: '#1e1b4b',
  },
  {
    id: 'amethyst',
    name: 'Midnight Neon Amethyst',
    desc: 'Glowing Amethyst Violet & Dark Obsidian Purple',
    lightColor: '#e9d5ff',
    darkColor: '#3b0764',
  },
];

export default function ThemeSelector({ currentTheme, onSelectTheme, onClose }: Props) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card theme-modal" onClick={e => e.stopPropagation()}>
        <h3 className="modal-title">🎨 Board Color Theme</h3>
        <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
          Select a custom invented palette for your board:
        </p>

        <div className="theme-options-grid">
          {THEMES.map(theme => (
            <button
              key={theme.id}
              className={`theme-option-card ${currentTheme === theme.id ? 'active' : ''}`}
              onClick={() => {
                onSelectTheme(theme.id);
                onClose();
              }}
            >
              <div className="theme-preview-swatch">
                <div style={{ background: theme.lightColor }} />
                <div style={{ background: theme.darkColor }} />
                <div style={{ background: theme.darkColor }} />
                <div style={{ background: theme.lightColor }} />
              </div>
              <div className="theme-info">
                <div className="theme-name">{theme.name}</div>
                <div className="theme-desc">{theme.desc}</div>
              </div>
              {currentTheme === theme.id && <span className="theme-check">✓</span>}
            </button>
          ))}
        </div>

        <button className="btn btn-secondary" style={{ width: '100%', marginTop: '1rem' }} onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
}
