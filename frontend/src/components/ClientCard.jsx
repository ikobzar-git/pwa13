import { useState, useEffect } from 'react';
import { notes, records } from '../api';
import { C, btn } from '../theme';

const CATEGORIES = [
  { value: 'general', label: 'Общая' },
  { value: 'personal', label: 'Личное' },
  { value: 'other', label: 'Другое' },
];

const styles = {
  card: {
    background: C.surface,
    border: `1px solid ${C.border}`,
    borderRadius: 12,
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: '16px 16px 12px',
    borderBottom: `1px solid ${C.border}`,
  },
  clientName: {
    fontSize: 17,
    fontWeight: 700,
    color: C.text,
  },
  clientPhone: {
    fontSize: 13,
    color: C.textSec,
    marginTop: 4,
  },
  phoneLink: {
    color: C.gold,
    fontSize: 13,
    marginLeft: 10,
    textDecoration: 'none',
  },
  section: {
    padding: '14px 16px',
    borderBottom: `1px solid ${C.border}`,
  },
  sectionLast: {
    padding: '14px 16px',
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: 700,
    color: C.textSec,
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  visitItem: {
    display: 'flex',
    gap: 12,
    padding: '8px 0',
    borderBottom: `1px solid ${C.border}`,
    fontSize: 13,
  },
  visitDate: {
    color: C.textSec,
    minWidth: 80,
  },
  visitService: {
    color: C.text,
  },
  noteItem: {
    padding: '10px 12px',
    borderRadius: 8,
    marginBottom: 6,
    background: C.surface2,
    border: `1px solid ${C.border}`,
    boxShadow: C.inputShadow,
    position: 'relative',
  },
  noteImportant: {
    borderLeft: `3px solid ${C.gold}`,
  },
  noteMeta: {
    fontSize: 11,
    color: C.textSec,
    marginBottom: 5,
  },
  noteText: {
    fontSize: 14,
    color: C.text,
    whiteSpace: 'pre-wrap',
    lineHeight: 1.5,
  },
  noteDeleteBtn: {
    background: 'none',
    border: 'none',
    color: C.textMuted,
    fontSize: 11,
    cursor: 'pointer',
    padding: '2px 0',
    float: 'right',
  },
  formRow: {
    display: 'flex',
    gap: 8,
    alignItems: 'center',
    marginTop: 8,
    flexWrap: 'wrap',
  },
  textarea: {
    width: '100%',
    padding: '10px 12px',
    background: C.surface2,
    color: C.text,
    border: `1px solid ${C.border}`,
    borderRadius: 6,
    fontSize: 14,
    resize: 'vertical',
    outline: 'none',
    boxSizing: 'border-box',
    boxShadow: C.inputShadow,
  },
  select: {
    padding: '7px 10px',
    background: C.surface2,
    color: C.text,
    border: `1px solid ${C.border}`,
    borderRadius: 6,
    fontSize: 13,
    outline: 'none',
    boxShadow: C.inputShadow,
  },
  checkLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    fontSize: 13,
    color: C.textSec,
    cursor: 'pointer',
  },
  recordInfo: {
    fontSize: 13,
    color: C.textSec,
    padding: '4px 0',
  },
};

export default function ClientCard({ record, companyId, user, onClose }) {
  const [notesList, setNotesList] = useState([]);
  const [visitHistory, setVisitHistory] = useState([]);
  const [text, setText] = useState('');
  const [category, setCategory] = useState('general');
  const [isImportant, setIsImportant] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const clientId = record?.client?.id;

  useEffect(() => {
    if (!clientId || !companyId) return;
    notes.list(clientId, companyId).then(setNotesList).catch(() => setNotesList([]));
    records.clientHistory(clientId, companyId).then(setVisitHistory).catch(() => setVisitHistory([]));
  }, [clientId, companyId]);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!text.trim() || !clientId || !companyId) return;
    setLoading(true);
    setError('');
    try {
      const newNote = await notes.create(
        clientId,
        { text: text.trim(), category, is_important: isImportant },
        companyId,
      );
      setNotesList((prev) => [newNote, ...prev]);
      setText('');
      setCategory('general');
      setIsImportant(false);
    } catch (err) {
      setError(err.body?.message || err.message || 'Ошибка');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await notes.delete(id);
      setNotesList((prev) => prev.filter((n) => n.id !== id));
    } catch (err) {
      setError(err.body?.message || err.message || 'Ошибка');
    }
  };

  const canDelete = (note) =>
    user?.yclients_staff_id && note.author_yclients_staff_id === user.yclients_staff_id;

  if (!record) return null;

  const clientName = record.client?.name || record.client?.first_name || 'Клиент';
  const clientPhone = record.client?.phone || null;

  return (
    <div style={styles.card}>
      <div style={styles.header}>
        <div>
          <div style={styles.clientName}>{clientName}</div>
          {clientPhone ? (
            <div style={styles.clientPhone}>
              {clientPhone}
              <a href={`tel:${clientPhone}`} style={styles.phoneLink}>Позвонить</a>
            </div>
          ) : (
            <div style={styles.clientPhone}>Телефон не указан</div>
          )}
          {record.services && record.datetime && (
            <div style={{ ...styles.recordInfo, marginTop: 6 }}>
              {(record.services || [])[0]?.title || ''} · {record.datetime || record.date}
            </div>
          )}
        </div>
        <button style={btn.ghost} onClick={onClose}>✕</button>
      </div>

      {visitHistory.length > 0 && (
        <div style={styles.section}>
          <div style={styles.sectionTitle}>История визитов</div>
          {visitHistory.map((v) => (
            <div key={v.id} style={styles.visitItem}>
              <span style={styles.visitDate}>{(v.datetime || v.date || '').slice(0, 10)}</span>
              <span style={styles.visitService}>{(v.services || [])[0]?.title || '—'}</span>
            </div>
          ))}
        </div>
      )}

      <div style={styles.sectionLast}>
        <div style={styles.sectionTitle}>Заметки</div>

        <form onSubmit={handleAdd} style={{ marginBottom: 16 }}>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Текст заметки..."
            rows={2}
            style={styles.textarea}
            required
          />
          <div style={styles.formRow}>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              style={styles.select}
            >
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
            <label style={styles.checkLabel}>
              <input
                type="checkbox"
                checked={isImportant}
                onChange={(e) => setIsImportant(e.target.checked)}
              />
              Важная
            </label>
          </div>
          {error && <p className="error" style={{ fontSize: 12, marginTop: 6 }}>{error}</p>}
          <button
            type="submit"
            disabled={loading}
            style={{ ...btn.primary, marginTop: 10 }}
          >
            Добавить заметку
          </button>
        </form>

        {notesList.map((n) => (
          <div
            key={n.id}
            style={{
              ...styles.noteItem,
              ...(n.is_important ? styles.noteImportant : {}),
            }}
          >
            {canDelete(n) && (
              <button
                style={styles.noteDeleteBtn}
                onClick={() => handleDelete(n.id)}
              >
                удалить
              </button>
            )}
            <div style={styles.noteMeta}>
              {n.is_important && <span style={{ color: C.gold, marginRight: 6 }}>★</span>}
              {n.category === 'personal' && <span style={{ marginRight: 6 }}>(личное)</span>}
            </div>
            <div style={styles.noteText}>{n.text}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
