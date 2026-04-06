import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { fetchPublicMaster, auth } from '../api';
import BookingFlow from '../components/BookingFlow';
import { C, card } from '../theme';

const styles = {
  page: {
    maxWidth: 640,
    margin: '0 auto',
    padding: '20px 16px 48px',
    minHeight: '100vh',
    background: C.bg,
  },
  hero: {
    ...card,
    padding: 20,
    marginBottom: 24,
    textAlign: 'center',
  },
  photo: {
    width: 120,
    height: 120,
    borderRadius: '50%',
    objectFit: 'cover',
    border: `2px solid ${C.gold}`,
    margin: '0 auto 16px',
    display: 'block',
    background: C.surface2,
  },
  name: {
    fontSize: 22,
    fontWeight: 800,
    color: C.text,
    marginBottom: 8,
  },
  bio: {
    fontSize: 14,
    color: C.textSec,
    whiteSpace: 'pre-wrap',
    lineHeight: 1.5,
  },
  success: {
    padding: 16,
    background: C.goldDim,
    border: `1px solid ${C.gold}`,
    borderRadius: 10,
    color: C.text,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 600,
    color: C.textMuted,
    letterSpacing: '0.10em',
    textTransform: 'uppercase',
    marginBottom: 12,
  },
};

export default function MasterPublicPage() {
  const { slug } = useParams();
  const [master, setMaster] = useState(null);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(true);
  const [booked, setBooked] = useState(false);
  const [bookingUser, setBookingUser] = useState(null);

  useEffect(() => {
    const t = localStorage.getItem('token_client');
    if (!t) {
      setBookingUser(null);
      return;
    }
    auth.userWithToken(t).then((u) => setBookingUser(u)).catch(() => setBookingUser(null));
  }, []);

  useEffect(() => {
    setLoading(true);
    setErr('');
    fetchPublicMaster(slug)
      .then(setMaster)
      .catch((e) => setErr(e.message || 'Не удалось загрузить'))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <div style={{ ...styles.page, color: C.textSec, textAlign: 'center', paddingTop: 48 }}>
        Загрузка...
      </div>
    );
  }

  if (err || !master) {
    return (
      <div style={{ ...styles.page, textAlign: 'center', paddingTop: 48 }}>
        <p style={{ color: C.textSec }}>{err || 'Страница недоступна'}</p>
        <a href="/" style={{ color: C.gold, marginTop: 16, display: 'inline-block' }}>На главную</a>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.hero}>
        {master.photo_url ? (
          <img src={master.photo_url} alt="" style={styles.photo} />
        ) : (
          <div
            style={{
              ...styles.photo,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 40,
              color: C.gold,
            }}
          >
            ✂
          </div>
        )}
        <div style={styles.name}>{master.name || 'Мастер'}</div>
        {master.bio && <div style={styles.bio}>{master.bio}</div>}
      </div>

      {booked && (
        <div style={styles.success}>
          Запись создана. Ждём вас в салоне.
        </div>
      )}

      <div style={styles.sectionTitle}>Запись к мастеру</div>
      <BookingFlow
        user={bookingUser ? { ...bookingUser, role: 'client' } : null}
        lock={{
          companyId: master.company_id,
          staffId: master.yclients_staff_id,
        }}
        onSuccess={() => setBooked(true)}
      />
    </div>
  );
}
