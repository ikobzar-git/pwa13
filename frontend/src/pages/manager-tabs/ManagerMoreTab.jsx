import { C } from '../../theme';
import { ms } from './managerTabStyles';

const SVG = ({ children }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    {children}
  </svg>
);

const MenuIcons = {
  documents: <SVG><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></SVG>,
  inventory: <SVG><path d="M21 16V8a2 2 0 0 0-1-1.73L13 2.27a2 2 0 0 0-2 0L4 6.27A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" /><polyline points="3.27 6.96 12 12.01 20.73 6.96" /><line x1="12" y1="22.08" x2="12" y2="12" /></SVG>,
  requests: <SVG><rect x="5" y="2" width="14" height="20" rx="2" /><line x1="9" y1="8" x2="15" y2="8" /><line x1="9" y1="12" x2="15" y2="12" /><line x1="9" y1="16" x2="12" y2="16" /></SVG>,
  feedback: <SVG><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10z" /></SVG>,
  clients: <SVG><circle cx="11" cy="11" r="7" /><line x1="16.5" y1="16.5" x2="21" y2="21" /></SVG>,
  chat: <SVG><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10z" /></SVG>,
};

const MENU_ITEMS = [
  { id: 'documents', label: 'Документы', desc: 'Договоры и правила' },
  { id: 'inventory', label: 'Инвентарь', desc: 'Расход материалов' },
  { id: 'requests', label: 'Заявки', desc: 'Косметика, ремонт, бар' },
  { id: 'feedback', label: 'Обратная связь', desc: 'Отзывы сотрудников' },
  { id: 'clients', label: 'Клиенты', desc: 'Аналитика визитов' },
  { id: 'chat', label: 'Чат', desc: 'Переписки' },
];

export default function ManagerMoreTab({ onNavigate }) {
  return (
    <div style={{ padding: '0 16px' }}>
      {MENU_ITEMS.map(item => (
        <div key={item.id} style={ms.listItem} onClick={() => onNavigate(item.id)}>
          <div style={ms.listIcon}>{MenuIcons[item.id]}</div>
          <div>
            <div style={ms.listLabel}>{item.label}</div>
            <div style={ms.listDesc}>{item.desc}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
