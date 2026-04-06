import { useState, useEffect, useRef, useCallback } from 'react';
import { records, favorites } from '../../api';
import { useApp } from '../../contexts/AppContext';
import { SkeletonCard } from '../../components/Skeleton';
import ErrorBanner from '../../components/ErrorBanner';
import { C, btn } from '../../theme';
import { cs } from './clientTabStyles';

export default function ClientHomeTab({ bookingSuccess, onDismissSuccess, onBook, onRebook, onOpenChat }) {
  const { user, showToast } = useApp();
  const [myRecords, setMyRecords] = useState([]);
  const [recordsLoading, setRecordsLoading] = useState(true);
  const [recordsError, setRecordsError] = useState(null);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [favMasters, setFavMasters] = useState([]);
  const [cancelingRecord, setCancelingRecord] = useState(null);
  const [cancelLoading, setCancelLoading] = useState(false);
  const lastFetchRef = useRef(0);

  const refreshRecords = useCallback(() => {
    setRecordsLoading(true);
    setRecordsError(null);
    lastFetchRef.current = Date.now();
    records.my()
      .then((data) => { setMyRecords(data); setRecordsError(null); })
      .catch(() => { setMyRecords([]); setRecordsError('Не удалось загрузить записи'); })
      .finally(() => setRecordsLoading(false));
  }, []);

  useEffect(() => {
    refreshRecords();
  }, [bookingSuccess, refreshRecords]);

  useEffect(() => {
    records.myHistory().then(setHistory).catch(() => setHistory([])).finally(() => setHistoryLoading(false));
    favorites.list().then(setFavMasters).catch(() => {});
  }, []);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && Date.now() - lastFetchRef.current > 30000) {
        refreshRecords();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [refreshRecords]);

  const handleCancel = async () => {
    if (!cancelingRecord) return;
    setCancelLoading(true);
    try {
      await records.cancel(cancelingRecord.id, cancelingRecord.company_id);
      setCancelingRecord(null);
      refreshRecords();
      records.myHistory().then(setHistory).catch(() => {});
    } catch (e) {
      showToast(e.message || 'Не удалось отменить запись', 'error');
    } finally {
      setCancelLoading(false);
    }
  };

  const handleRebook = (rec) => {
    const service = (rec.services || [])[0]?.title;
    const staff = rec.staff?.name || rec.staff_name;
    setCancelingRecord(null);
    onRebook({
      companyId: rec.company_id,
      serviceName: service,
      staffName: staff,
    });
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const formatDateTime = (dateStr) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      const date = d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', weekday: 'short' });
      const time = d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
      return `${date}, ${time}`;
    } catch {
      return dateStr;
    }
  };

  return (
    <>
      {bookingSuccess && (() => {
        const b = bookingSuccess._booking || {};
        const svcTitle = b.serviceName || (bookingSuccess.services || [])[0]?.title || 'Услуга';
        const dt = b.datetime || bookingSuccess.datetime || bookingSuccess.date || '';
        const staffName = b.staffName || '';

        const addToCalendar = () => {
          const d = new Date(dt);
          const pad = (n) => String(n).padStart(2, '0');
          const fmt = (date) => `${date.getFullYear()}${pad(date.getMonth()+1)}${pad(date.getDate())}T${pad(date.getHours())}${pad(date.getMinutes())}00`;
          const start = fmt(d);
          const duration = bookingSuccess._booking?.serviceDuration || 3600;
          const endDate = new Date(d.getTime() + duration * 1000);
          const end = fmt(endDate);
          const title = encodeURIComponent(`${svcTitle} — 13 by Timati`);
          const details = encodeURIComponent(`Мастер: ${staffName}\nФилиал: ${b.companyName || ''}`);
          window.open(`https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${start}/${end}&details=${details}`, '_blank');
        };

        const shareMaster = () => {
          const url = b.staffSlug ? `${window.location.origin}/m/${b.staffSlug}` : window.location.origin;
          if (navigator.share) {
            navigator.share({ title: `${staffName} — 13 by Timati`, url }).catch(() => {});
          } else {
            navigator.clipboard.writeText(url).then(() => showToast('Ссылка скопирована'));
          }
        };

        return (
          <div style={cs.successBanner}>
            <div style={cs.successTitle}>Запись создана</div>
            <div style={cs.successText}>
              {svcTitle}{staffName ? ` · ${staffName}` : ''}
            </div>
            <div style={cs.successText}>
              {dt.replace('T', ' ').slice(0, 16)}
              {b.servicePrice && ` · ${b.servicePrice} ₽`}
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
              <button
                style={{ ...btn.primary, width: 'auto', padding: '8px 16px', fontSize: 13 }}
                onClick={addToCalendar}
              >
                Добавить в календарь
              </button>
              {staffName && staffName !== 'Любой мастер' && (
                <button
                  style={{ ...btn.secondary, padding: '8px 16px', fontSize: 13 }}
                  onClick={shareMaster}
                >
                  Поделиться мастером
                </button>
              )}
            </div>
            <button
              style={{ ...btn.ghost, marginTop: 8, color: C.textSec, fontSize: 13 }}
              onClick={onDismissSuccess}
            >
              Закрыть
            </button>
          </div>
        );
      })()}

      {!bookingSuccess && history.length > 0 && (() => {
        const last = history[0];
        return (
          <div style={{
            ...cs.section, background: 'rgba(0,229,204,0.06)',
            border: `1px solid rgba(0,229,204,0.15)`, borderRadius: 14, padding: 16,
          }}>
            <div style={{ fontSize: 13, color: C.textSec, marginBottom: 8, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
              Записаться снова
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 600, color: C.text }}>{last.service}</div>
                <div style={{ fontSize: 13, color: C.textSec, marginTop: 2 }}>
                  {last.staff_name || 'Мастер'}{last.company ? ` · ${last.company}` : ''}
                </div>
              </div>
              <button
                style={{ ...btn.primary, width: 'auto', padding: '10px 20px', fontSize: 14 }}
                onClick={() => onRebook({
                  companyId: last.company_id,
                  serviceName: last.service,
                  staffName: last.staff_name,
                })}
              >
                Записаться
              </button>
            </div>
          </div>
        );
      })()}

      {myRecords.length === 0 && !recordsLoading && history.length === 0 && !historyLoading && !bookingSuccess && (
        <div style={{ padding: '60px 16px', textAlign: 'center' }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: C.text, textAlign: 'center' }}>
            Добро пожаловать в 13 by Timati!
          </div>
          <div style={{ fontSize: 14, color: C.textSec, textAlign: 'center', marginTop: 8 }}>
            Выберите мастера и запишитесь на удобное время
          </div>
          <button style={{ ...btn.primary, marginTop: 24 }} onClick={onBook}>
            Записаться к мастеру
          </button>
        </div>
      )}

      <div style={cs.section}>
        <div style={cs.sectionTitle}>Мои записи</div>
        {recordsError ? (
          <ErrorBanner message={recordsError} onRetry={refreshRecords} />
        ) : recordsLoading ? (
          <><SkeletonCard /><SkeletonCard /></>
        ) : myRecords.length === 0 ? (
          <p style={cs.emptyText}>Нет предстоящих записей</p>
        ) : (
          myRecords.map((r) => (
            <div key={r.id} style={cs.recordItem}>
              <div>
                <div style={cs.recordService}>
                  {(r.services || [])[0]?.title || 'Услуга'}
                </div>
                <div style={cs.recordDate}>
                  {formatDateTime(r.datetime || r.date)}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button
                  style={{ ...cs.cancelBtn, borderColor: C.gold, color: C.gold }}
                  onClick={() => onOpenChat(r)}
                >
                  Написать
                </button>
                <button style={cs.cancelBtn} onClick={() => setCancelingRecord(r)}>Отменить</button>
                <div style={cs.dot} />
              </div>
            </div>
          ))
        )}
      </div>

      {(historyLoading || history.length > 0) && (
        <div style={cs.section}>
          <div style={cs.sectionTitle}>История визитов</div>
          {historyLoading ? (
            <><SkeletonCard height={56} /><SkeletonCard height={56} /><SkeletonCard height={56} /></>
          ) : history.map((h, i) => (
            <div key={i} style={cs.historyItem}>
              <div style={cs.historyRow}>
                <span style={cs.historyService}>{h.service}</span>
                <span style={cs.historyPrice}>{h.price ? `${h.price} ₽` : ''}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                <span style={cs.historyMeta}>
                  {formatDate(h.date)} · {h.staff_name || 'Мастер'}{h.company ? ` · ${h.company}` : ''}
                </span>
                <button
                  style={cs.rebookBtn}
                  onClick={() => onRebook({
                    companyId: h.company_id,
                    serviceName: h.service,
                    staffName: h.staff_name,
                  })}
                >
                  Записаться снова
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {favMasters.length > 0 && (
        <div style={cs.section}>
          <div style={cs.sectionTitle}>Избранные мастера</div>
          {favMasters.map(f => (
            <div key={f.id} style={cs.historyItem}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: C.text }}>
                  ★ {f.staff_name || 'Мастер'}
                </span>
                <button style={cs.rebookBtn} onClick={() => onRebook({
                  companyId: f.company_id,
                  staffName: f.staff_name,
                })}>
                  Записаться
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={cs.section}>
        <button style={btn.primary} onClick={onBook}>
          Новая запись
        </button>
      </div>

      {cancelingRecord && (
        <div style={cs.overlay} onClick={() => !cancelLoading && setCancelingRecord(null)}>
          <div style={cs.dialog} onClick={e => e.stopPropagation()}>
            <div style={cs.dialogTitle}>Отменить запись?</div>
            <div style={cs.dialogText}>
              {(cancelingRecord.services || [])[0]?.title || 'Услуга'}<br />
              {formatDateTime(cancelingRecord.datetime || cancelingRecord.date)}
              {(cancelingRecord.staff?.name || cancelingRecord.staff_name) && (
                <><br />{cancelingRecord.staff?.name || cancelingRecord.staff_name}</>
              )}
            </div>
            <div style={cs.dialogActions}>
              <button
                style={{ ...btn.primary, background: C.error }}
                onClick={handleCancel}
                disabled={cancelLoading}
              >
                {cancelLoading ? 'Отмена...' : 'Да, отменить'}
              </button>
              <button style={cs.rebookBtn} onClick={() => handleRebook(cancelingRecord)}>
                Перезаписаться
              </button>
              <button
                style={{ ...btn.ghost, color: C.textSec }}
                onClick={() => setCancelingRecord(null)}
                disabled={cancelLoading}
              >
                Закрыть
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
