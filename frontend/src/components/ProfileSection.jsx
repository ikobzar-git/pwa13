import { useState, useEffect } from 'react';
import { C, card, input, btn } from '../theme';
import { profile } from '../api';
import { useApp } from '../contexts/AppContext';

export default function ProfileSection({ user, onUpdate }) {
  const { showToast } = useApp();
  const [open, setOpen] = useState(false);
  const [prefs, setPrefs] = useState(user?.preferences || '');
  const [carNum, setCarNum] = useState(user?.car_number || '');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setPrefs(user?.preferences || '');
    setCarNum(user?.car_number || '');
  }, [user]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = await profile.update({ preferences: prefs, car_number: carNum });
      if (onUpdate) onUpdate(updated);
      showToast('Профиль сохранён');
    } catch (e) {
      showToast(e.message || 'Не удалось сохранить профиль', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ ...card.base, marginBottom: 16 }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%',
          background: 'transparent',
          border: 'none',
          color: C.text,
          fontSize: 16,
          fontWeight: 600,
          cursor: 'pointer',
          padding: 0,
        }}
      >
        <span>Мой профиль</span>
        <span style={{
          color: C.textSec,
          fontSize: 12,
          transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
          transition: 'transform 0.2s',
        }}>
          ▼
        </span>
      </button>

      {open && (
        <div style={{ marginTop: 16 }}>
          <label style={labelStyle}>Предпочтения</label>
          <textarea
            value={prefs}
            onChange={e => setPrefs(e.target.value)}
            placeholder="Например: стрижка покороче, не использовать машинку..."
            rows={3}
            style={{ ...input.base, resize: 'vertical', fontFamily: 'inherit' }}
          />

          <label style={labelStyle}>Номер авто</label>
          <input
            value={carNum}
            onChange={e => setCarNum(e.target.value)}
            placeholder="А123БВ77"
            style={input.base}
          />

          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              ...btn.primary,
              opacity: saving ? 0.6 : 1,
              marginTop: 4,
            }}
          >
            {saving ? 'Сохранение...' : 'Сохранить'}
          </button>
        </div>
      )}
    </div>
  );
}

const labelStyle = {
  display: 'block',
  color: C.textSec,
  fontSize: 13,
  marginBottom: 6,
  fontWeight: 500,
};
