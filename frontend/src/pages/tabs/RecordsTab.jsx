import { useState, useEffect, useCallback, useRef } from 'react';
import { records } from '../../api';
import { useApp } from '../../contexts/AppContext';
import ClientCard from '../../components/ClientCard';
import { C } from '../../theme';
import { SkeletonCard } from '../../components/Skeleton';
import ErrorBanner from '../../components/ErrorBanner';
import { ts } from './tabStyles';

function formatDate(date) {
  return date.toISOString().slice(0, 10);
}

function formatTime(dateStr) {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '—';
  }
}

function getDayLabel(dateStr) {
  const today = new Date();
  const todayStr = formatDate(today);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = formatDate(tomorrow);
  const dayAfter = new Date(today);
  dayAfter.setDate(dayAfter.getDate() + 2);
  const dayAfterStr = formatDate(dayAfter);

  if (dateStr === todayStr) return 'Сегодня';
  if (dateStr === tomorrowStr) return 'Завтра';
  if (dateStr === dayAfterStr) return 'Послезавтра';
  return new Date(dateStr).toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' });
}

function groupRecordsByDay(recordsList) {
  const groups = {};
  recordsList.forEach((r) => {
    const dateStr = (r.datetime || r.date || '').slice(0, 10);
    if (!groups[dateStr]) groups[dateStr] = [];
    groups[dateStr].push(r);
  });
  return Object.entries(groups)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, items]) => ({ date, label: getDayLabel(date), records: items }));
}

export default function RecordsTab({ onOpenChat }) {
  const { user, companyId } = useApp();
  const [allRecords, setAllRecords] = useState([]);
  const [recordsLoading, setRecordsLoading] = useState(true);
  const [recordsError, setRecordsError] = useState(null);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const lastFetchRef = useRef(0);

  const fetchRecords = useCallback(() => {
    const today = new Date();
    const endDate = new Date(today);
    endDate.setDate(endDate.getDate() + 2);
    lastFetchRef.current = Date.now();
    setRecordsError(null);
    setRecordsLoading(true);
    records
      .staff({ start_date: formatDate(today), end_date: formatDate(endDate) })
      .then((data) => { setAllRecords(data); setRecordsError(null); })
      .catch(() => { setAllRecords([]); setRecordsError('Не удалось загрузить записи'); })
      .finally(() => setRecordsLoading(false));
  }, []);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && Date.now() - lastFetchRef.current > 30000) {
        fetchRecords();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [fetchRecords]);

  return (
    <>
      <div style={ts.section}>
        <div style={ts.sectionTitle}>Ближайшие записи</div>
        {recordsError ? (
          <ErrorBanner message={recordsError} onRetry={fetchRecords} />
        ) : recordsLoading ? (
          <><SkeletonCard /><SkeletonCard /><SkeletonCard /></>
        ) : allRecords.length === 0 ? (
          <p style={ts.emptyText}>Нет записей</p>
        ) : (
          groupRecordsByDay(allRecords).map((group) => (
            <div key={group.date} style={{ marginBottom: 16 }}>
              <div style={ts.dayLabel}>
                {group.label}
                <span style={{ fontWeight: 400, opacity: 0.6, marginLeft: 6 }}>
                  ({group.records.length})
                </span>
              </div>
              {group.records.map((r) => (
                <div
                  key={r.id}
                  style={{
                    ...ts.recordRow,
                    ...(selectedRecord?.id === r.id ? ts.recordRowActive : {}),
                  }}
                  onClick={() => setSelectedRecord(selectedRecord?.id === r.id ? null : r)}
                >
                  <span style={ts.recordTime}>
                    {formatTime(r.datetime || r.date)}
                  </span>
                  <div>
                    <div style={ts.recordClient}>
                      {(r.client || {}).name || 'Клиент'}
                    </div>
                    <div style={ts.recordService}>
                      {(r.services || [])[0]?.title || ''}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ))
        )}
      </div>

      {selectedRecord && (
        <div style={{ padding: '0 16px', marginBottom: 24 }}>
          <div style={{ marginBottom: 8 }}>
            <button
              style={{
                padding: '8px 16px',
                background: 'transparent',
                border: `1px solid ${C.gold}`,
                color: C.gold,
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
              }}
              onClick={() => onOpenChat(selectedRecord)}
            >
              Написать клиенту
            </button>
          </div>
          <ClientCard
            record={selectedRecord}
            companyId={companyId}
            user={user}
            onClose={() => setSelectedRecord(null)}
          />
        </div>
      )}
    </>
  );
}
