import { useState, useEffect } from 'react';
import { inventory } from '../../api';
import { useApp } from '../../contexts/AppContext';
import { C, btn } from '../../theme';
import { ts } from './tabStyles';

const CAT_LABELS = {
  cosmetics: 'Косметика',
  blades: 'Лезвия / бритвы',
  towels: 'Полотенца',
  other: 'Другое',
};

export default function InventorySection() {
  const { user, companyId, showToast } = useApp();
  const [logs, setLogs] = useState([]);
  const [cat, setCat] = useState('cosmetics');
  const [itemName, setItemName] = useState('');
  const [qty, setQty] = useState('1');
  const [note, setNote] = useState('');

  useEffect(() => {
    if (companyId) inventory.list(companyId).then(setLogs).catch(() => setLogs([]));
  }, [companyId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!itemName.trim()) return;
    try {
      await inventory.create({ category: cat, item_name: itemName.trim(), quantity: parseInt(qty) || 1, note: note.trim() || undefined }, companyId);
      setItemName('');
      setQty('1');
      setNote('');
      showToast('Расход записан');
      inventory.list(companyId).then(setLogs);
    } catch (err) {
      showToast(err.message || 'Ошибка', 'error');
    }
  };

  return (
    <>
      <div style={ts.section}>
        <div style={ts.sectionTitle}>Записать расход</div>
        <form onSubmit={handleSubmit}>
          <select value={cat} onChange={(e) => setCat(e.target.value)} style={ts.feedbackSelect}>
            {Object.entries(CAT_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
          <input type="text" value={itemName} onChange={(e) => setItemName(e.target.value)} placeholder="Что использовано" style={ts.searchInput} />
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <input type="number" min="1" value={qty} onChange={(e) => setQty(e.target.value)} style={{ ...ts.searchInput, width: 80 }} />
            <input type="text" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Заметка" style={{ ...ts.searchInput, flex: 1 }} />
          </div>
          <button type="submit" style={{ ...btn.primary, marginTop: 10 }}>Записать</button>
        </form>
      </div>

      {logs.length > 0 && (
        <div style={ts.section}>
          <div style={ts.sectionTitle}>Последние записи</div>
          {logs.slice(0, 30).map((l) => (
            <div key={l.id} style={{ padding: '8px 0', borderBottom: `1px solid ${C.border}`, fontSize: 13 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: C.text, fontWeight: 500 }}>{l.item_name}</span>
                <span style={{ color: C.textSec }}>×{l.quantity}</span>
              </div>
              <div style={{ color: C.textMuted, fontSize: 12 }}>
                {CAT_LABELS[l.category] || l.category} · {new Date(l.created_at).toLocaleString('ru')}
                {l.user?.name && ` · ${l.user.name}`}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
