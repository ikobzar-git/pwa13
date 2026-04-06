import { useState, useEffect } from 'react';
import { C, card, input, btn } from '../theme';
import { profile } from '../api';
import { useApp } from '../contexts/AppContext';

export default function ProfileSection({ user, onUpdate, onLogout }) {
  const { showToast } = useApp();
  const [open, setOpen] = useState(false);
  const [prefs, setPrefs] = useState(user?.preferences || '');
  const [carNum, setCarNum] = useState(user?.car_number || '');
  const [saving, setSaving] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

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

      {onLogout && (
        <div style={{ marginTop: 16, borderTop: `1px solid ${C.border}`, paddingTop: 16 }}>
          {!showLogoutConfirm ? (
            <button
              onClick={() => setShowLogoutConfirm(true)}
              style={{ ...btn.ghost, color: C.error, width: '100%', textAlign: 'center', fontSize: 14 }}
            >
              Выйти из аккаунта
            </button>
          ) : (
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: 13, color: C.textSec, marginBottom: 12, lineHeight: 1.5 }}>
                Вы уверены? Для повторного входа потребуется код из Telegram.
              </p>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={() => setShowLogoutConfirm(false)}
                  style={{ ...btn.secondary, flex: 1 }}
                >
                  Отмена
                </button>
                <button
                  onClick={onLogout}
                  style={{
                    ...btn.primary,
                    flex: 1,
                    background: C.error,
                    boxShadow: 'none',
                  }}
                >
                  Выйти
                </button>
              </div>
            </div>
          )}
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
