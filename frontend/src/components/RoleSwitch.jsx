import { C } from '../theme';

const LABELS = {
  staff: 'Сотрудник',
  client: 'Клиент',
};

export default function RoleSwitch({ roleSwitch }) {
  const { hasOtherSession, canAddRole, otherRole, onSwitch, onAdd } = roleSwitch;

  if (hasOtherSession) {
    return (
      <button
        onClick={onSwitch}
        title={`Переключиться: ${LABELS[otherRole]}`}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 5,
          padding: '5px 10px',
          background: 'transparent',
          border: `1px solid ${C.border}`,
          borderRadius: 20,
          color: C.textSec,
          fontSize: 12,
          cursor: 'pointer',
          transition: 'border-color 0.15s, color 0.15s',
          whiteSpace: 'nowrap',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = C.gold;
          e.currentTarget.style.color = C.gold;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = C.border;
          e.currentTarget.style.color = C.textSec;
        }}
      >
        <span style={{ opacity: 0.5 }}>⇄</span>
        {LABELS[otherRole]}
      </button>
    );
  }

  if (canAddRole) {
    return (
      <button
        onClick={onAdd}
        title={`Добавить: ${LABELS[otherRole]}`}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          padding: '5px 10px',
          background: 'transparent',
          border: `1px dashed ${C.border}`,
          borderRadius: 20,
          color: C.textMuted,
          fontSize: 12,
          cursor: 'pointer',
          transition: 'border-color 0.15s, color 0.15s',
          whiteSpace: 'nowrap',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = C.gold;
          e.currentTarget.style.color = C.gold;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = C.border;
          e.currentTarget.style.color = C.textMuted;
        }}
      >
        <span>+</span>
        {LABELS[otherRole]}
      </button>
    );
  }

  return null;
}
