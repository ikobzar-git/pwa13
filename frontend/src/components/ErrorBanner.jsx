import { C, btn } from '../theme';

const styles = {
  container: {
    padding: 16,
    background: C.errorDim,
    border: `1px solid ${C.errorBorder}`,
    borderRadius: 12,
    textAlign: 'center',
  },
  icon: {
    width: 32,
    height: 32,
    borderRadius: '50%',
    border: `2px solid ${C.error}`,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: C.error,
    fontSize: 16,
    fontWeight: 700,
    marginBottom: 8,
  },
  message: {
    color: C.error,
    fontSize: 14,
    marginBottom: 12,
    lineHeight: 1.4,
  },
};

export default function ErrorBanner({ message, onRetry }) {
  return (
    <div style={styles.container}>
      <div style={styles.icon}>!</div>
      <div style={styles.message}>{message || 'Что-то пошло не так'}</div>
      {onRetry && (
        <button style={{ ...btn.secondary, fontSize: 13, width: 'auto' }} onClick={onRetry}>
          Повторить
        </button>
      )}
    </div>
  );
}
