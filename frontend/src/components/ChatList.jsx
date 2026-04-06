import { useState, useEffect } from 'react';
import { C, card } from '../theme';
import { chat } from '../api';

const styles = {
  container: {
    padding: '0 16px',
  },
  title: {
    fontSize: 18,
    fontWeight: 700,
    color: C.text,
    marginBottom: 14,
  },
  item: {
    ...card.base,
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10,
    cursor: 'pointer',
    transition: 'border-color 0.15s',
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: '50%',
    background: C.goldDim,
    border: `1px solid ${C.goldBorder}`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 16,
    fontWeight: 700,
    color: C.gold,
    flexShrink: 0,
  },
  info: {
    flex: 1,
    minWidth: 0,
  },
  nameRow: {
    display: 'flex',
    alignItems: 'baseline',
    gap: 6,
  },
  name: {
    fontSize: 14,
    fontWeight: 600,
    color: C.text,
  },
  role: {
    fontSize: 11,
    color: C.textMuted,
  },
  lastMsg: {
    fontSize: 13,
    color: C.textSec,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    marginTop: 2,
  },
  right: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: 4,
    flexShrink: 0,
  },
  time: {
    fontSize: 11,
    color: C.textMuted,
  },
  badge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    background: C.gold,
    color: '#000',
    fontSize: 11,
    fontWeight: 700,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '0 6px',
  },
  empty: {
    textAlign: 'center',
    color: C.textMuted,
    fontSize: 14,
    marginTop: 60,
    lineHeight: 1.6,
  },
  emptyIcon: {
    display: 'block',
    margin: '0 auto 12px',
    opacity: 0.3,
  },
};

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) {
    return d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  }
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
}

function getInitial(name) {
  return name ? name.charAt(0).toUpperCase() : '?';
}

export default function ChatList({ onOpenChat, currentUserId }) {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const load = async () => {
    try {
      const data = await chat.conversations();
      setConversations(data);
    } catch (e) {
      console.error('ChatList load error:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const interval = setInterval(load, 10000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.title}>Сообщения</div>
        <div style={styles.empty}>Загрузка...</div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.title}>Сообщения</div>
      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Поиск по имени..."
        style={{
          width: '100%', padding: '10px 12px', background: C.surface2,
          color: C.text, border: `1px solid ${C.border}`, borderRadius: 10,
          fontSize: 13, outline: 'none', boxSizing: 'border-box', marginBottom: 12,
        }}
      />
      {conversations.length === 0 && !search && (
        <div style={styles.empty}>
          <svg style={styles.emptyIcon} width="48" height="48" viewBox="0 0 24 24" fill="none"
            stroke={C.textMuted} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10z" />
          </svg>
          Нет диалогов<br />
          Напишите мастеру через карточку записи
        </div>
      )}
      {conversations.filter(conv => {
        if (!search.trim()) return true;
        const isClient = conv.client_user_id === currentUserId;
        const other = isClient ? conv.staff_user : conv.client_user;
        const name = other?.name || '';
        return name.toLowerCase().includes(search.trim().toLowerCase());
      }).map(conv => {
        const isClient = conv.client_user_id === currentUserId;
        const other = isClient ? conv.staff_user : conv.client_user;
        const name = other?.name || 'Собеседник';
        const role = isClient ? 'Мастер' : 'Клиент';
        const lastText = conv.last_message?.body || '';
        const lastTime = conv.last_message?.created_at || conv.last_message_at;

        return (
          <div key={conv.id} style={styles.item} onClick={() => onOpenChat(conv.id)}>
            <div style={styles.avatar}>{getInitial(name)}</div>
            <div style={styles.info}>
              <div style={styles.nameRow}>
                <span style={styles.name}>{name}</span>
                <span style={styles.role}>{role}</span>
              </div>
              <div style={styles.lastMsg}>{lastText || 'Нет сообщений'}</div>
            </div>
            <div style={styles.right}>
              {lastTime && <div style={styles.time}>{formatDate(lastTime)}</div>}
              {conv.unread_count > 0 && (
                <div style={styles.badge}>{conv.unread_count}</div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
