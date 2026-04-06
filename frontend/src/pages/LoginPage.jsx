import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../api';
import { C, btn, input } from '../theme';

const styles = {
  wrapper: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px 16px',
    background: C.bg,
    position: 'relative',
    overflow: 'hidden',
  },
  bgGlow: {
    position: 'absolute',
    top: '-40%',
    left: '50%',
    transform: 'translateX(-50%)',
    width: 600,
    height: 600,
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(0,229,204,0.06) 0%, transparent 70%)',
    pointerEvents: 'none',
  },
  card: {
    width: '100%',
    maxWidth: 380,
    background: C.surface,
    border: `1px solid ${C.border}`,
    borderRadius: 20,
    padding: '40px 28px 32px',
    position: 'relative',
    boxShadow: '0 4px 40px rgba(0,0,0,0.4)',
  },
  logoWrap: {
    textAlign: 'center',
    marginBottom: 36,
  },
  logoImg: {
    height: 64,
    width: 'auto',
    display: 'inline-block',
  },
  logoSub: {
    fontSize: 11,
    color: C.textSec,
    letterSpacing: '0.22em',
    textTransform: 'uppercase',
    marginTop: 10,
    display: 'block',
    fontWeight: 500,
  },
  hint: {
    fontSize: 12,
    color: C.textMuted,
    marginTop: 14,
    lineHeight: 1.5,
    textAlign: 'center',
  },
  backLink: {
    background: 'none',
    border: 'none',
    color: C.textSec,
    fontSize: 13,
    cursor: 'pointer',
    padding: '4px 0',
    marginBottom: 16,
    display: 'flex',
    alignItems: 'center',
    gap: 4,
  },
  switchLink: {
    display: 'block',
    textAlign: 'center',
    marginTop: 20,
    fontSize: 13,
    color: C.textMuted,
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: 4,
    width: '100%',
  },
  closeRow: {
    marginBottom: 20,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
};

const RESEND_DELAY = 30;

function formatPhoneMask(raw) {
  const digits = raw.replace(/\D/g, '').replace(/^8/, '7');
  const d = digits.startsWith('7') ? digits.slice(1) : digits;
  let result = '+7';
  if (d.length > 0) result += ' (' + d.slice(0, 3);
  if (d.length >= 3) result += ') ';
  else if (d.length > 0) return result;
  if (d.length > 3) result += d.slice(3, 6);
  if (d.length > 6) result += '-' + d.slice(6, 8);
  if (d.length > 8) result += '-' + d.slice(8, 10);
  return result;
}

function normalizePhone(formatted) {
  const digits = formatted.replace(/\D/g, '').replace(/^8/, '7');
  return digits.startsWith('7') ? '+' + digits : '+7' + digits;
}

export default function LoginPage({ onLogin, limitToMode, onClose, initialMode = 'client' }) {
  const navigate = useNavigate();
  const mode = limitToMode || initialMode;
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState('phone');
  const [codeMethod, setCodeMethod] = useState(null);
  const [botUsername, setBotUsername] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const timerRef = useRef(null);

  useEffect(() => {
    setError('');
    setStep('phone');
    setCode('');
  }, [mode]);

  useEffect(() => {
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  const startResendTimer = () => {
    setResendTimer(RESEND_DELAY);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setResendTimer((prev) => {
        if (prev <= 1) { clearInterval(timerRef.current); return 0; }
        return prev - 1;
      });
    }, 1000);
  };

  const handleSendCode = async (e) => {
    if (e) e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const sendCode = mode === 'staff' ? auth.staffSendCode : auth.clientSendCode;
      const normalizedPhone = normalizePhone(phone);
      const res = await sendCode(normalizedPhone);
      setCodeMethod(res.method || 'sms');
      setBotUsername(res.bot_username || '');
      setStep('code');
      startResendTimer();
    } catch (err) {
      setError(err.body?.errors?.phone?.[0] || err.message || 'Ошибка');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const verify = mode === 'staff' ? auth.staffVerify : auth.clientVerify;
      const res = await verify(normalizePhone(phone), code);
      if (res.user && res.token) {
        if (mode === 'client') {
          onLogin({ ...res, user: { ...res.user, role: 'client' } });
        } else {
          onLogin(res);
        }
      } else {
        setError(res.message || 'Ошибка входа');
      }
    } catch (err) {
      setError(err.body?.errors?.code?.[0] || err.body?.errors?.phone?.[0] || err.message || 'Ошибка');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.wrapper}>
      <div style={styles.bgGlow} />
      <div style={styles.card}>
        <div style={styles.logoWrap}>
          <img src="/logo13.png" alt="13" style={styles.logoImg} />
          <span style={styles.logoSub}>by Timati</span>
        </div>

        {onClose && (
          <div style={styles.closeRow}>
            <span style={{ fontSize: 13, color: C.textSec }}>
              Войти как {limitToMode === 'client' ? 'клиент' : 'сотрудник'}
            </span>
            <button type="button" style={styles.backLink} onClick={onClose}>✕</button>
          </div>
        )}

        {step === 'phone' ? (
          <form onSubmit={handleSendCode}>
            <input
              type="tel"
              placeholder="+7 (___) ___-__-__"
              value={phone}
              onFocus={() => { if (!phone) setPhone('+7 ('); }}
              onChange={(e) => {
                const val = e.target.value;
                if (val.replace(/\D/g, '').length === 0) { setPhone(''); return; }
                setPhone(formatPhoneMask(val));
              }}
              style={input.base}
              required
            />
            {error && <div className="error" style={{ marginBottom: 10 }}>{error}</div>}
            <button type="submit" style={btn.primary} disabled={loading || phone.replace(/\D/g, '').length < 11}>
              {loading ? 'Отправка...' : 'Получить код'}
            </button>
            <p style={styles.hint}>
              {mode === 'staff' ? 'Вход для сотрудников' : 'Код подтверждения придёт в Telegram'}
            </p>
          </form>
        ) : (
          <form onSubmit={handleVerify}>
            <button
              type="button"
              style={styles.backLink}
              onClick={() => { setStep('phone'); setCode(''); setError(''); setCodeMethod(null); }}
            >
              ← {phone}
            </button>
            {codeMethod === 'telegram_link' && botUsername && (
              <div style={{
                background: 'rgba(0,229,204,0.08)', border: '1px solid rgba(0,229,204,0.2)',
                borderRadius: 12, padding: '14px 16px', marginBottom: 16, textAlign: 'center',
              }}>
                <div style={{ fontSize: 13, color: C.text, margin: '0 0 10px', lineHeight: 1.6, textAlign: 'left' }}>
                  <div>1. Откройте бота по кнопке ниже</div>
                  <div>2. Нажмите «Старт» (Start)</div>
                  <div>3. Отправьте свой номер телефона кнопкой</div>
                  <div>4. Скопируйте полученный код и вернитесь сюда</div>
                </div>
                <a
                  href={`https://t.me/${botUsername}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    ...btn.primary, display: 'inline-flex', alignItems: 'center', gap: 6,
                    width: 'auto', padding: '10px 20px', textDecoration: 'none', fontSize: 14,
                  }}
                >
                  Открыть @{botUsername}
                </a>
                <a
                  href={window.location.href}
                  style={{
                    display: 'block', marginTop: 10, fontSize: 13, color: C.gold,
                    textDecoration: 'none',
                  }}
                >
                  ← Вернуться в приложение
                </a>
              </div>
            )}
            {codeMethod === 'telegram' && (
              <p style={{ fontSize: 13, color: C.textSec, marginBottom: 12, textAlign: 'center' }}>
                Код отправлен в Telegram
              </p>
            )}
            <input
              type="text"
              inputMode="numeric"
              placeholder="Введите код"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              style={{ ...input.base, letterSpacing: '0.25em', fontSize: 20, textAlign: 'center' }}
              required
            />
            {error && <div className="error" style={{ marginBottom: 10 }}>{error}</div>}
            <button type="submit" style={btn.primary} disabled={loading || code.length !== 6}>
              {loading ? 'Проверка...' : 'Войти'}
            </button>
            <button
              type="button"
              disabled={resendTimer > 0}
              onClick={handleSendCode}
              style={{
                ...styles.switchLink,
                color: resendTimer > 0 ? C.textMuted : C.gold,
                marginTop: 12,
                cursor: resendTimer > 0 ? 'default' : 'pointer',
              }}
            >
              {resendTimer > 0
                ? `Отправить повторно (${resendTimer}с)`
                : 'Отправить код повторно'}
            </button>
          </form>
        )}

        {!limitToMode && (
          <button
            type="button"
            style={styles.switchLink}
            onClick={() => navigate(mode === 'staff' ? '/login' : '/login/staff')}
          >
            {mode === 'staff' ? 'Я клиент' : 'Я сотрудник'}
          </button>
        )}
      </div>
    </div>
  );
}
