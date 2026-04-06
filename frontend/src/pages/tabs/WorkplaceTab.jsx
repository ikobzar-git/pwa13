import { useState, useEffect } from 'react';
import { workstations, schedule } from '../../api';
import { useApp } from '../../contexts/AppContext';
import { C, btn } from '../../theme';
import { SkeletonCard } from '../../components/Skeleton';
import ErrorBanner from '../../components/ErrorBanner';
import { ts } from './tabStyles';

const TIME_OFF_TYPES = { vacation: 'Отпуск', sick: 'Больничный', personal: 'Личное' };
const TIME_OFF_STATUSES = {
  pending: { label: 'Ожидает', bg: C.surface3, color: C.textSec },
  approved: { label: 'Одобрено', bg: 'rgba(0,229,204,0.12)', color: C.gold },
  rejected: { label: 'Отклонено', bg: 'rgba(255,85,85,0.08)', color: '#FF5555' },
};

function formatDate(date) {
  return date.toISOString().slice(0, 10);
}

function getDayOfWeek(ds) {
  return new Date(ds).toLocaleDateString('ru-RU', { weekday: 'short' });
}

const STEPS = [
  { label: 'Синхронизация', check: (s) => !!s.wsAvail },
  { label: 'Выбор', check: (s) => !!s.wsSelId && s.wsDates.size > 0 },
  { label: 'Бронирование', check: () => false },
];

export default function WorkplaceTab() {
  const { user, companyId, showToast, confirm } = useApp();
  const userId = user?.id;
  const [wsFrom, setWsFrom] = useState(() => formatDate(new Date()));
  const [wsTo, setWsTo] = useState(() => {
    const t = new Date();
    t.setDate(t.getDate() + 14);
    return formatDate(t);
  });
  const [wsAvail, setWsAvail] = useState(null);
  const [wsLoading, setWsLoading] = useState(false);
  const [wsSelId, setWsSelId] = useState('');
  const [wsDates, setWsDates] = useState(() => new Set());
  const [wsMy, setWsMy] = useState([]);
  const [wsSyncing, setWsSyncing] = useState(false);
  const [wsBookMsg, setWsBookMsg] = useState('');
  const [wsError, setWsError] = useState(null);

  // Schedule state
  const [mySchedule, setMySchedule] = useState([]);
  const [timeOffList, setTimeOffList] = useState([]);
  const [schedDate, setSchedDate] = useState('');
  const [schedStart, setSchedStart] = useState('09:00');
  const [schedEnd, setSchedEnd] = useState('21:00');
  const [toStartDate, setToStartDate] = useState('');
  const [toEndDate, setToEndDate] = useState('');
  const [toType, setToType] = useState('vacation');
  const [toReason, setToReason] = useState('');

  useEffect(() => {
    if (companyId) {
      schedule.list(companyId, wsFrom, wsTo).then(setMySchedule).catch(() => setMySchedule([]));
      schedule.timeOff(companyId).then(setTimeOffList).catch(() => setTimeOffList([]));
    }
  }, [companyId, wsFrom, wsTo]);

  useEffect(() => {
    setWsDates(new Set());
  }, [wsSelId]);

  useEffect(() => {
    if (!companyId) return;
    setWsLoading(true);
    setWsBookMsg('');
    setWsError(null);
    Promise.all([
      workstations.availability(companyId, wsFrom, wsTo),
      workstations.myBookings(companyId),
    ])
      .then(([av, my]) => {
        setWsAvail(av);
        setWsMy(Array.isArray(my) ? my : []);
      })
      .catch(() => {
        setWsAvail(null);
        setWsMy([]);
        setWsError('Не удалось загрузить данные');
      })
      .finally(() => setWsLoading(false));
  }, [companyId, wsFrom, wsTo]);

  const handleWsSync = async () => {
    if (!companyId) return;
    setWsSyncing(true);
    try {
      await workstations.sync(companyId);
      const av = await workstations.availability(companyId, wsFrom, wsTo);
      setWsAvail(av);
      setWsBookMsg('Список мест обновлён');
    } catch (e) {
      showToast(e.message || 'Ошибка синхронизации', 'error');
    } finally {
      setWsSyncing(false);
    }
  };

  const toggleWsDate = (ds) => {
    if (!wsSelId) return;
    const ws = wsAvail?.workstations?.find((w) => String(w.id) === String(wsSelId));
    const cell = ws?.dates?.[ds];
    if (!cell?.free) return;
    setWsDates((prev) => {
      const n = new Set(prev);
      if (n.has(ds)) n.delete(ds);
      else n.add(ds);
      return n;
    });
  };

  const handleWsBook = async () => {
    if (!companyId || !wsSelId || wsDates.size === 0) return;
    try {
      await workstations.book(Number(wsSelId), [...wsDates], companyId);
      setWsDates(new Set());
      setWsBookMsg('Бронь создана');
      showToast('Бронь создана');
      const [av, my] = await Promise.all([
        workstations.availability(companyId, wsFrom, wsTo),
        workstations.myBookings(companyId),
      ]);
      setWsAvail(av);
      setWsMy(Array.isArray(my) ? my : []);
    } catch (e) {
      showToast(e.message || 'Не удалось забронировать', 'error');
    }
  };

  const handleWsCancelBooking = async (booking) => {
    if (!companyId) return;
    const title = booking.workstation?.title || 'Место';
    const date = String(booking.booked_date || '').slice(0, 10);
    const ok = await confirm(`Отменить бронь на ${title}, ${date}?`);
    if (!ok) return;
    try {
      await workstations.cancel(booking.id, companyId);
      showToast('Бронь отменена');
      const [my, av] = await Promise.all([
        workstations.myBookings(companyId),
        workstations.availability(companyId, wsFrom, wsTo),
      ]);
      setWsMy(Array.isArray(my) ? my : []);
      setWsAvail(av);
    } catch (e) {
      showToast(e.message || 'Ошибка', 'error');
    }
  };

  const wsSelected = wsAvail?.workstations?.find((w) => String(w.id) === String(wsSelId));
  const wsDateKeys = wsSelected?.dates ? Object.keys(wsSelected.dates).sort() : [];

  const currentStep = wsAvail ? (wsSelId && wsDates.size > 0 ? 2 : 1) : 0;

  return (
    <>
      <div style={ts.section}>
        <div style={ts.sectionTitle}>Рабочее место</div>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 0, marginBottom: 16,
        }}>
          {STEPS.map((s, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', flex: i < STEPS.length - 1 ? 1 : 'none' }}>
              <div style={{
                width: 24, height: 24, borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 700, flexShrink: 0,
                background: i <= currentStep ? C.gold : C.surface3,
                color: i <= currentStep ? '#000' : C.textMuted,
                transition: 'background 0.2s, color 0.2s',
              }}>
                {i + 1}
              </div>
              <span style={{
                fontSize: 11, marginLeft: 4, color: i <= currentStep ? C.text : C.textMuted,
                whiteSpace: 'nowrap',
              }}>
                {s.label}
              </span>
              {i < STEPS.length - 1 && (
                <div style={{
                  flex: 1, height: 1, marginLeft: 6, marginRight: 6,
                  background: i < currentStep ? C.gold : C.border,
                  transition: 'background 0.2s',
                }} />
              )}
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 12 }}>
          <label style={{ fontSize: 12, color: C.textSec }}>
            Период с
            <input
              type="date"
              value={wsFrom}
              onChange={(e) => setWsFrom(e.target.value)}
              style={{ ...ts.searchInput, marginTop: 6 }}
            />
          </label>
          <label style={{ fontSize: 12, color: C.textSec }}>
            по
            <input
              type="date"
              value={wsTo}
              onChange={(e) => setWsTo(e.target.value)}
              style={{ ...ts.searchInput, marginTop: 6 }}
            />
          </label>
        </div>
        <button
          type="button"
          style={{ ...btn.secondary, marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
          onClick={handleWsSync}
          disabled={wsSyncing || !companyId}
        >
          {wsSyncing && (
            <span style={{
              width: 14, height: 14, border: `2px solid ${C.textMuted}`,
              borderTopColor: C.gold, borderRadius: '50%',
              animation: 'spin 0.8s linear infinite', display: 'inline-block',
            }} />
          )}
          {wsSyncing ? 'Синхронизация…' : 'Синхронизировать из YClients'}
        </button>
        {wsBookMsg ? (
          <p style={{ fontSize: 13, color: C.gold, marginBottom: 12 }}>{wsBookMsg}</p>
        ) : null}
      </div>

      <div style={ts.section}>
        <div style={ts.sectionTitle}>Календарь занятости</div>
        {wsError ? (
          <ErrorBanner message={wsError} onRetry={() => {
            setWsError(null);
            setWsLoading(true);
            Promise.all([
              workstations.availability(companyId, wsFrom, wsTo),
              workstations.myBookings(companyId),
            ]).then(([av, my]) => {
              setWsAvail(av);
              setWsMy(Array.isArray(my) ? my : []);
            }).catch(() => {
              setWsError('Не удалось загрузить данные');
            }).finally(() => setWsLoading(false));
          }} />
        ) : wsLoading ? (
          <><SkeletonCard /><SkeletonCard /></>
        ) : (
          <>
            <select
              value={wsSelId}
              onChange={(e) => setWsSelId(e.target.value)}
              style={ts.feedbackSelect}
            >
              <option value="">— Выберите место —</option>
              {(wsAvail?.workstations || []).map((w) => (
                <option key={w.id} value={w.id}>{w.title}</option>
              ))}
            </select>
            {!wsSelId && (
              <p style={ts.emptyText}>Выберите рабочее место, чтобы увидеть дни.</p>
            )}
            {wsSelId && wsDateKeys.length === 0 && (
              <p style={ts.emptyText}>Нет данных. Выполните синхронизацию с YClients.</p>
            )}
            {wsSelId && wsDateKeys.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
                {wsDateKeys.map((ds) => {
                  const cell = wsSelected?.dates?.[ds];
                  if (!cell) return null;
                  const mine = userId && cell.booked_by_user_id === userId;
                  const busy = !cell.free;
                  const selected = wsDates.has(ds);
                  let border = C.border;
                  let bg = C.surface2;
                  if (busy && mine) {
                    border = C.gold;
                    bg = C.goldDim;
                  } else if (busy) {
                    border = C.borderLight;
                    bg = C.surface3;
                  } else if (selected) {
                    border = C.gold;
                    bg = C.goldDim;
                  }
                  return (
                    <button
                      key={ds}
                      type="button"
                      disabled={busy || !wsSelId}
                      onClick={() => toggleWsDate(ds)}
                      style={{
                        minWidth: 72,
                        padding: '10px 8px',
                        borderRadius: 10,
                        border: `1px solid ${border}`,
                        background: bg,
                        color: C.text,
                        fontSize: 12,
                        cursor: busy ? 'default' : 'pointer',
                        opacity: busy ? 0.65 : 1,
                      }}
                    >
                      <div style={{ fontWeight: 700 }}>{ds.slice(8, 10)}.{ds.slice(5, 7)}</div>
                      <div style={{ fontSize: 9, color: C.textMuted, marginTop: 2 }}>{getDayOfWeek(ds)}</div>
                      <div style={{ fontSize: 10, color: C.textSec, marginTop: 2 }}>
                        {busy ? (mine ? 'ваша' : 'занято') : (selected ? 'выбор' : 'свободно')}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
            <button
              type="button"
              style={{ ...btn.primary, marginTop: 16 }}
              onClick={handleWsBook}
              disabled={!wsSelId || wsDates.size === 0}
            >
              Забронировать выбранные дни
            </button>
          </>
        )}
      </div>

      <div style={ts.section}>
        <div style={ts.sectionTitle}>Мои брони</div>
        {wsMy.length === 0 ? (
          <p style={ts.emptyText}>Нет активных броней</p>
        ) : (
          wsMy.map((b) => (
            <div
              key={b.id}
              style={{
                ...ts.recordRow,
                cursor: 'default',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
              }}
            >
              <div>
                <div style={ts.recordClient}>{b.workstation?.title || 'Место'}</div>
                <div style={ts.recordService}>{String(b.booked_date || '').slice(0, 10)}</div>
              </div>
              <button
                type="button"
                style={{ ...btn.secondary, padding: '8px 12px', fontSize: 12 }}
                onClick={() => handleWsCancelBooking(b)}
              >
                Отменить
              </button>
            </div>
          ))
        )}
      </div>

      <div style={ts.section}>
        <div style={ts.sectionTitle}>Мой график</div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
          <input type="date" value={schedDate} onChange={(e) => setSchedDate(e.target.value)} style={{ ...ts.searchInput, width: 'auto', flex: 1 }} />
          <input type="time" value={schedStart} onChange={(e) => setSchedStart(e.target.value)} style={{ ...ts.searchInput, width: 80 }} />
          <input type="time" value={schedEnd} onChange={(e) => setSchedEnd(e.target.value)} style={{ ...ts.searchInput, width: 80 }} />
        </div>
        <button
          type="button"
          style={{ ...btn.primary, marginBottom: 12 }}
          disabled={!schedDate}
          onClick={async () => {
            try {
              await schedule.save([{ date: schedDate, start_time: schedStart, end_time: schedEnd }], companyId);
              showToast('График обновлён');
              setSchedDate('');
              schedule.list(companyId, wsFrom, wsTo).then(setMySchedule);
            } catch (e) {
              showToast(e.message || 'Ошибка', 'error');
            }
          }}
        >
          Добавить рабочий день
        </button>
        {mySchedule.length > 0 && (
          <div>
            {mySchedule.map((s) => (
              <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: `1px solid ${C.border}`, fontSize: 13 }}>
                <span style={{ color: C.text }}>
                  {new Date(s.date).toLocaleDateString('ru-RU', { weekday: 'short', day: 'numeric', month: 'short' })}
                  <span style={{ color: C.textSec, marginLeft: 8 }}>{s.start_time?.slice(0,5)} — {s.end_time?.slice(0,5)}</span>
                </span>
                <button
                  type="button"
                  style={{ background: 'none', border: 'none', color: C.error, fontSize: 12, cursor: 'pointer' }}
                  onClick={async () => {
                    try {
                      await schedule.remove(s.id);
                      schedule.list(companyId, wsFrom, wsTo).then(setMySchedule);
                    } catch (e) {
                      showToast(e.message || 'Ошибка', 'error');
                    }
                  }}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={ts.section}>
        <div style={ts.sectionTitle}>Отпуск / выходной</div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
          <input type="date" value={toStartDate} onChange={(e) => setToStartDate(e.target.value)} placeholder="С" style={{ ...ts.searchInput, flex: 1 }} />
          <input type="date" value={toEndDate} onChange={(e) => setToEndDate(e.target.value)} placeholder="По" style={{ ...ts.searchInput, flex: 1 }} />
        </div>
        <select value={toType} onChange={(e) => setToType(e.target.value)} style={ts.feedbackSelect}>
          {Object.entries(TIME_OFF_TYPES).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <input type="text" value={toReason} onChange={(e) => setToReason(e.target.value)} placeholder="Причина (необязательно)" style={ts.searchInput} />
        <button
          type="button"
          style={{ ...btn.primary, marginTop: 10 }}
          disabled={!toStartDate || !toEndDate}
          onClick={async () => {
            try {
              await schedule.requestTimeOff({ start_date: toStartDate, end_date: toEndDate, type: toType, reason: toReason || undefined }, companyId);
              showToast('Заявка отправлена');
              setToStartDate('');
              setToEndDate('');
              setToReason('');
              schedule.timeOff(companyId).then(setTimeOffList);
            } catch (e) {
              showToast(e.message || 'Ошибка', 'error');
            }
          }}
        >
          Подать заявку
        </button>
        {timeOffList.length > 0 && (
          <div style={{ marginTop: 12 }}>
            {timeOffList.map((t) => {
              const s = TIME_OFF_STATUSES[t.status] || TIME_OFF_STATUSES.pending;
              return (
                <div key={t.id} style={{ ...ts.noteItem, marginBottom: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 13, color: C.text }}>
                      {TIME_OFF_TYPES[t.type] || t.type}: {t.start_date?.slice(0,10)} — {t.end_date?.slice(0,10)}
                    </span>
                    <span style={{ padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600, background: s.bg, color: s.color }}>
                      {s.label}
                    </span>
                  </div>
                  {t.reason && <div style={{ fontSize: 12, color: C.textSec, marginTop: 2 }}>{t.reason}</div>}
                  {t.user && <div style={{ fontSize: 12, color: C.textSec }}>{t.user.name || t.user.phone}</div>}
                  {user?.role === 'manager' && t.status === 'pending' && (
                    <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                      <button style={{ ...btn.primary, padding: '4px 10px', fontSize: 11, width: 'auto' }} onClick={async () => {
                        await schedule.processTimeOff(t.id, 'approved', companyId);
                        showToast('Одобрено');
                        schedule.timeOff(companyId).then(setTimeOffList);
                      }}>Одобрить</button>
                      <button style={{ ...btn.secondary, padding: '4px 10px', fontSize: 11 }} onClick={async () => {
                        await schedule.processTimeOff(t.id, 'rejected', companyId);
                        showToast('Отклонено');
                        schedule.timeOff(companyId).then(setTimeOffList);
                      }}>Отклонить</button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
