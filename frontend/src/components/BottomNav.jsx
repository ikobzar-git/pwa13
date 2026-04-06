import { C } from '../theme';

const SVG = ({ children, size = 22, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}>
    {children}
  </svg>
);

export const Icons = {
  home: (
    <SVG>
      <path d="M3 10.5L12 3l9 7.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-9.5z" />
      <polyline points="9 21 9 14 15 14 15 21" />
    </SVG>
  ),
  chat: (
    <SVG>
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10z" />
    </SVG>
  ),
  plus: (
    <SVG>
      <circle cx="12" cy="12" r="9" />
      <line x1="12" y1="8" x2="12" y2="16" />
      <line x1="8" y1="12" x2="16" y2="12" />
    </SVG>
  ),
  user: (
    <SVG>
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </SVG>
  ),
  clipboard: (
    <SVG>
      <rect x="5" y="2" width="14" height="20" rx="2" />
      <line x1="9" y1="8" x2="15" y2="8" />
      <line x1="9" y1="12" x2="15" y2="12" />
      <line x1="9" y1="16" x2="12" y2="16" />
    </SVG>
  ),
  search: (
    <SVG>
      <circle cx="11" cy="11" r="7" />
      <line x1="16.5" y1="16.5" x2="21" y2="21" />
    </SVG>
  ),
  chart: (
    <SVG>
      <rect x="3" y="12" width="4" height="9" rx="1" />
      <rect x="10" y="7" width="4" height="14" rx="1" />
      <rect x="17" y="3" width="4" height="18" rx="1" />
    </SVG>
  ),
  desk: (
    <SVG>
      <rect x="2" y="14" width="20" height="3" rx="1" />
      <path d="M5 14V10h14v4" />
      <line x1="7" y1="10" x2="7" y2="7" />
      <line x1="17" y1="10" x2="17" y2="7" />
    </SVG>
  ),
  menu: (
    <SVG>
      <line x1="4" y1="6" x2="20" y2="6" />
      <line x1="4" y1="12" x2="20" y2="12" />
      <line x1="4" y1="18" x2="20" y2="18" />
    </SVG>
  ),
  send: (
    <SVG>
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </SVG>
  ),
  back: (
    <SVG>
      <polyline points="15 18 9 12 15 6" />
    </SVG>
  ),
};

const styles = {
  nav: {
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    height: 64,
    background: C.surface,
    borderTop: `1px solid ${C.border}`,
    display: 'flex',
    justifyContent: 'space-around',
    alignItems: 'center',
    zIndex: 900,
    maxWidth: 640,
    margin: '0 auto',
  },
  tab: (active) => ({
    background: 'none',
    border: 'none',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 2,
    cursor: 'pointer',
    padding: '10px 8px',
    color: active ? C.gold : C.textMuted,
    fontSize: 10,
    fontWeight: active ? 700 : 400,
  }),
  iconWrap: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 24,
    height: 24,
  },
  badge: {
    position: 'absolute',
    top: -5,
    right: -9,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    background: C.error,
    color: '#fff',
    fontSize: 10,
    fontWeight: 700,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '0 4px',
    lineHeight: 1,
  },
};

export default function BottomNav({ tabs, activeTab, onTabChange }) {
  return (
    <nav style={styles.nav}>
      {tabs.map(t => (
        <button key={t.id} style={styles.tab(activeTab === t.id)} onClick={() => onTabChange(t.id)}>
          <span style={styles.iconWrap}>
            {t.icon}
            {t.badge > 0 && <span style={styles.badge}>{t.badge > 99 ? '99+' : t.badge}</span>}
          </span>
          <span>{t.label}</span>
        </button>
      ))}
    </nav>
  );
}
