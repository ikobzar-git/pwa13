import { useApp } from '../contexts/AppContext';
import { C } from '../theme';

const styles = {
  container: {
    position: 'fixed',
    bottom: 80,
    left: '50%',
    transform: 'translateX(-50%)',
    zIndex: 950,
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    maxWidth: 600,
    width: 'calc(100% - 32px)',
    pointerEvents: 'none',
  },
  toast: (type) => ({
    padding: '12px 16px',
    borderRadius: 10,
    fontSize: 14,
    fontWeight: 500,
    color: type === 'error' ? '#FF5555' : C.gold,
    background: type === 'error' ? 'rgba(255,85,85,0.12)' : 'rgba(0,229,204,0.12)',
    border: `1px solid ${type === 'error' ? 'rgba(255,85,85,0.3)' : 'rgba(0,229,204,0.3)'}`,
    backdropFilter: 'blur(12px)',
    boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    pointerEvents: 'auto',
    animation: 'toast-in 0.2s ease-out',
  }),
  icon: {
    fontSize: 16,
    flexShrink: 0,
  },
  text: {
    flex: 1,
    lineHeight: 1.4,
  },
  close: {
    background: 'none',
    border: 'none',
    color: 'inherit',
    opacity: 0.6,
    cursor: 'pointer',
    fontSize: 16,
    padding: 4,
    flexShrink: 0,
  },
};

let injected = false;
function injectKeyframes() {
  if (injected) return;
  const style = document.createElement('style');
  style.textContent = `
    @keyframes toast-in {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }
  `;
  document.head.appendChild(style);
  injected = true;
}

export default function Toast() {
  const { toasts, removeToast } = useApp();

  if (toasts.length === 0) return null;
  injectKeyframes();

  return (
    <div style={styles.container}>
      {toasts.map((t) => (
        <div key={t.id} style={styles.toast(t.type)}>
          <span style={styles.icon}>{t.type === 'error' ? '✕' : '✓'}</span>
          <span style={styles.text}>{t.message}</span>
          <button style={styles.close} onClick={() => removeToast(t.id)}>✕</button>
        </div>
      ))}
    </div>
  );
}
