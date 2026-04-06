import { useApp } from '../../contexts/AppContext';
import { C } from '../../theme';

const SVG = ({ children }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    {children}
  </svg>
);

const MenuIcons = {
  stats: <SVG><rect x="3" y="12" width="4" height="9" rx="1" /><rect x="10" y="7" width="4" height="14" rx="1" /><rect x="17" y="3" width="4" height="18" rx="1" /></SVG>,
  finance: <SVG><line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></SVG>,
  clients: <SVG><circle cx="11" cy="11" r="7" /><line x1="16.5" y1="16.5" x2="21" y2="21" /></SVG>,
  inventory: <SVG><path d="M21 16V8a2 2 0 0 0-1-1.73L13 2.27a2 2 0 0 0-2 0L4 6.27A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" /><polyline points="3.27 6.96 12 12.01 20.73 6.96" /><line x1="12" y1="22.08" x2="12" y2="12" /></SVG>,
  documents: <SVG><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" /></SVG>,
  profile: <SVG><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></SVG>,
  requests: <SVG><rect x="5" y="2" width="14" height="20" rx="2" /><line x1="9" y1="8" x2="15" y2="8" /><line x1="9" y1="12" x2="15" y2="12" /><line x1="9" y1="16" x2="12" y2="16" /></SVG>,
  feedback: <SVG><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10z" /></SVG>,
};

const styles = {
  list: {
    padding: '0 16px',
  },
  item: {
    display: 'flex',
    alignItems: 'center',
    gap: 14,
    padding: '16px 14px',
    background: C.surface2,
    border: `1px solid ${C.border}`,
    borderRadius: 12,
    marginBottom: 8,
    cursor: 'pointer',
    transition: 'border-color 0.15s',
  },
  icon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    color: C.gold,
    background: 'rgba(0,229,204,0.08)',
  },
  label: {
    fontSize: 15,
    fontWeight: 600,
    color: C.text,
  },
  desc: {
    fontSize: 12,
    color: C.textSec,
    marginTop: 2,
  },
};

const MENU_ITEMS = [
  { id: 'stats', label: 'Статистика', desc: 'Метрики за период', staffOnly: true },
  { id: 'finance', label: 'Финансы', desc: 'Баланс и выплаты' },
  { id: 'clients', label: 'Клиенты', desc: 'Поиск и заметки', staffOnly: true },
  { id: 'inventory', label: 'Инвентарь', desc: 'Расход материалов' },
  { id: 'documents', label: 'Документы', desc: 'Договоры и правила' },
  { id: 'profile', label: 'Профиль', desc: 'Публичная страница', staffOnly: true },
  { id: 'requests', label: 'Заявки', desc: 'Косметика, ремонт, бар' },
  { id: 'feedback', label: 'Обратная связь', desc: 'Отзывы и предложения' },
];

export default function MenuTab({ onNavigate }) {
  const { user } = useApp();

  const items = MENU_ITEMS.filter(item => {
    if (item.staffOnly && !user?.yclients_staff_id) return false;
    return true;
  });

  return (
    <div style={styles.list}>
      {items.map((item) => (
        <div
          key={item.id}
          style={styles.item}
          onClick={() => onNavigate(item.id)}
        >
          <div style={styles.icon}>
            {MenuIcons[item.id]}
          </div>
          <div>
            <div style={styles.label}>{item.label}</div>
            <div style={styles.desc}>{item.desc}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
