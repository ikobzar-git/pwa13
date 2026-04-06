import { useState, useEffect, useRef } from 'react';
import { C, input } from '../theme';
import { chat } from '../api';
import { Icons } from './BottomNav';

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: C.bg,
    zIndex: 950,
    maxWidth: 640,
    margin: '0 auto',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '14px 16px',
    background: C.surface,
    borderBottom: `1px solid ${C.border}`,
    flexShrink: 0,
  },
  backBtn: {
    background: 'none',
    border: 'none',
    color: C.gold,
    cursor: 'pointer',
    padding: 4,
    display: 'flex',
    alignItems: 'center',
  },
  headerInfo: {
    flex: 1,
  },
  headerName: {
    fontSize: 16,
    fontWeight: 600,
    color: C.text,
  },
  headerRole: {
    fontSize: 11,
    color: C.textSec,
    marginTop: 1,
  },
  messagesList: {
    flex: 1,
    overflowY: 'auto',
    padding: '16px 16px 8px',
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  msgWrap: (isMine) => ({
    display: 'flex',
    flexDirection: 'column',
    alignItems: isMine ? 'flex-end' : 'flex-start',
    maxWidth: '80%',
    alignSelf: isMine ? 'flex-end' : 'flex-start',
  }),
  senderLabel: (isMine) => ({
    fontSize: 11,
    fontWeight: 600,
    color: isMine ? C.gold : C.textSec,
    marginBottom: 2,
    paddingLeft: isMine ? 0 : 2,
    paddingRight: isMine ? 2 : 0,
  }),
  bubble: (isMine) => ({
    padding: '10px 14px',
    borderRadius: isMine ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
    fontSize: 14,
    lineHeight: 1.45,
    wordBreak: 'break-word',
    background: isMine ? C.goldDim : C.surface2,
    border: `1px solid ${isMine ? C.goldBorder : C.border}`,
    color: C.text,
  }),
  time: (isMine) => ({
    fontSize: 10,
    color: C.textMuted,
    marginTop: 3,
    paddingLeft: isMine ? 0 : 2,
    paddingRight: isMine ? 2 : 0,
  }),
  inputRow: {
    display: 'flex',
    gap: 8,
    padding: '10px 16px 14px',
    background: C.surface,
    borderTop: `1px solid ${C.border}`,
    flexShrink: 0,
  },
  inputField: {
    ...input.base,
    marginBottom: 0,
    flex: 1,
    resize: 'none',
    maxHeight: 100,
    lineHeight: 1.4,
    overflow: 'auto',
  },
  scrollBtn: {
    position: 'absolute',
    bottom: 70,
    right: 16,
    width: 36,
    height: 36,
    borderRadius: '50%',
    background: C.surface2,
    border: `1px solid ${C.border}`,
    color: C.gold,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    fontSize: 18,
    boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
  },
  sendBtn: {
    width: 44,
    height: 44,
    background: C.gradient,
    color: '#000',
    border: 'none',
    borderRadius: 10,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  sendBtnDisabled: {
    opacity: 0.4,
    cursor: 'default',
  },
  empty: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: C.textMuted,
    fontSize: 14,
    textAlign: 'center',
    padding: 20,
  },
};

function formatTime(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
}

export default function ChatView({ conversationId, onBack, currentUserId }) {
  const [messages, setMessages] = useState([]);
  const [conversation, setConversation] = useState(null);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const listRef = useRef(null);
  const textareaRef = useRef(null);
  const prevCountRef = useRef(0);

  const loadMessages = async () => {
    try {
      const data = await chat.show(conversationId);
      setConversation(data.conversation);
      setMessages(data.messages);
    } catch (e) {
      console.error('Chat load error:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMessages();
    const interval = setInterval(loadMessages, 5000);
    return () => clearInterval(interval);
  }, [conversationId]);

  useEffect(() => {
    if (messages.length > prevCountRef.current && listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
    prevCountRef.current = messages.length;
  }, [messages.length]);

  const handleListScroll = () => {
    if (!listRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = listRef.current;
    setShowScrollBtn(scrollHeight - scrollTop - clientHeight > 200);
  };

  const scrollToBottom = () => {
    if (listRef.current) {
      listRef.current.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
    }
  };

  const handleTextChange = (e) => {
    setText(e.target.value);
    const el = e.target;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 100) + 'px';
  };

  const handleSend = async () => {
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    setText('');

    const tempMsg = {
      id: Date.now(),
      sender_user_id: currentUserId,
      body,
      created_at: new Date().toISOString(),
      read_at: null,
    };
    setMessages(prev => [...prev, tempMsg]);

    try {
      await chat.sendMessage(conversationId, body);
    } catch (e) {
      console.error('Send error:', e);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const isCurrentUserClient = conversation?.client_user_id === currentUserId;
  const otherName = conversation
    ? (isCurrentUserClient
      ? conversation.staff_user?.name
      : conversation.client_user?.name) || 'Собеседник'
    : '';
  const otherRole = isCurrentUserClient ? 'Мастер' : 'Клиент';

  const getSenderLabel = (msg) => {
    if (!conversation) return '';
    if (msg.sender_user_id === conversation.staff_user_id) {
      return conversation.staff_user?.name || 'Мастер';
    }
    return conversation.client_user?.name || 'Клиент';
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <button style={styles.backBtn} onClick={onBack}>{Icons.back}</button>
          <div style={styles.headerInfo}>
            <div style={styles.headerName}>Загрузка...</div>
          </div>
        </div>
        <div style={styles.empty}>Загрузка сообщений...</div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <button style={styles.backBtn} onClick={onBack}>{Icons.back}</button>
        <div style={styles.headerInfo}>
          <div style={styles.headerName}>{otherName}</div>
          <div style={styles.headerRole}>{otherRole}</div>
        </div>
      </div>

      <div style={{ position: 'relative', flex: 1, display: 'flex', flexDirection: 'column' }}>
      <div style={styles.messagesList} ref={listRef} onScroll={handleListScroll}>
        {messages.length === 0 && (
          <div style={styles.empty}>Нет сообщений.<br/>Напишите первым!</div>
        )}
        {messages.map((m, i) => {
          const isMine = m.sender_user_id === currentUserId;
          const prevMsg = messages[i - 1];
          const showLabel = !prevMsg || prevMsg.sender_user_id !== m.sender_user_id;

          return (
            <div key={m.id} style={styles.msgWrap(isMine)}>
              {showLabel && (
                <div style={styles.senderLabel(isMine)}>
                  {getSenderLabel(m)}
                </div>
              )}
              <div style={styles.bubble(isMine)}>{m.body}</div>
              <div style={styles.time(isMine)}>
                {formatTime(m.created_at)}
              </div>
            </div>
          );
        })}
      </div>
      {showScrollBtn && (
        <button style={styles.scrollBtn} onClick={scrollToBottom}>↓</button>
      )}
      </div>

      <div style={styles.inputRow}>
        <textarea
          ref={textareaRef}
          style={styles.inputField}
          placeholder="Сообщение..."
          value={text}
          onChange={handleTextChange}
          onKeyDown={handleKeyDown}
          maxLength={1000}
          rows={1}
        />
        <button
          style={{ ...styles.sendBtn, ...((!text.trim() || sending) ? styles.sendBtnDisabled : {}) }}
          onClick={handleSend}
          disabled={!text.trim() || sending}
        >
          {Icons.send}
        </button>
      </div>
    </div>
  );
}
