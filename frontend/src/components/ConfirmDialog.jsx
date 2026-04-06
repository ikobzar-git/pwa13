import { useApp } from '../contexts/AppContext';
import { C, btn } from '../theme';

const styles = {
  overlay: {
    position: 'fixed',
    top: 0, left: 0, right: 0, bottom: 0,
    background: 'rgba(0,0,0,0.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1100,
    padding: 16,
  },
  dialog: {
    background: C.surface,
    border: `1px solid ${C.border}`,
    borderRadius: 16,
    padding: 24,
    maxWidth: 340,
    width: '100%',
    textAlign: 'center',
  },
  message: {
    fontSize: 15,
    color: C.text,
    lineHeight: 1.5,
    marginBottom: 20,
    whiteSpace: 'pre-wrap',
  },
  actions: {
    display: 'flex',
    gap: 10,
  },
  cancelBtn: {
    ...btn.secondary,
    flex: 1,
  },
  confirmBtn: {
    ...btn.primary,
    flex: 1,
    background: C.error,
  },
};

export default function ConfirmDialog() {
  const { confirmState, handleConfirmResolve } = useApp();

  if (!confirmState) return null;

  return (
    <div style={styles.overlay} onClick={() => handleConfirmResolve(false)}>
      <div style={styles.dialog} onClick={(e) => e.stopPropagation()}>
        <div style={styles.message}>{confirmState.message}</div>
        <div style={styles.actions}>
          <button style={styles.cancelBtn} onClick={() => handleConfirmResolve(false)}>
            Отмена
          </button>
          <button style={styles.confirmBtn} onClick={() => handleConfirmResolve(true)}>
            Подтвердить
          </button>
        </div>
      </div>
    </div>
  );
}
