import { useState, useEffect } from 'react';
import { manager } from '../../api';
import { C } from '../../theme';
import { SkeletonCard } from '../../components/Skeleton';
import { ms } from './managerTabStyles';

export default function DashboardTab({ branchId }) {
  const [data, setData] = useState(null);
  const [branchesData, setBranchesData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    manager.dashboardSummary(branchId === 'all' ? '' : branchId)
      .then(d => { setData(d); setError(null); })
      .catch(() => setError('Не удалось загрузить дашборд'))
      .finally(() => setLoading(false));

    if (branchId === 'all') {
      manager.branches()
        .then(d => setBranchesData(Array.isArray(d) ? d : []))
        .catch(() => setBranchesData(null));
    } else {
      setBranchesData(null);
    }
  }, [branchId]);

  if (loading) {
    return (
      <div style={ms.section}>
        <div style={ms.statsGrid}>
          <SkeletonCard height={70} /><SkeletonCard height={70} />
          <SkeletonCard height={70} /><SkeletonCard height={70} />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ ...ms.section, textAlign: 'center', padding: 24 }}>
        <div style={{ color: C.error, fontSize: 14, marginBottom: 8 }}>{error}</div>
      </div>
    );
  }

  if (!data) return null;

  const pending = data.pending_approvals || {};
  const totalPending = (pending.payouts || 0) + (pending.time_off || 0) + (pending.facility_requests || 0);

  return (
    <>
      {/* KPI */}
      <div style={ms.section}>
        <div style={ms.sectionTitle}>Показатели</div>
        <div style={ms.statsGrid}>
          {[
            [fmt(data.today_revenue) + ' ₽', 'Выручка сегодня'],
            [fmt(data.week_revenue) + ' ₽', 'За неделю'],
            [data.today_bookings, 'Записей сегодня'],
            [data.active_masters_today, 'Мастеров на смене'],
          ].map(([value, label], i) => (
            <div key={i} style={ms.statCard}>
              <div style={ms.statValue}>{value}</div>
              <div style={ms.statLabel}>{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Alerts */}
      {totalPending > 0 && (
        <div style={ms.section}>
          <div style={ms.sectionTitle}>Ожидают решения</div>
          {pending.payouts > 0 && (
            <AlertRow label="Выплаты" count={pending.payouts} />
          )}
          {pending.time_off > 0 && (
            <AlertRow label="Отпуска" count={pending.time_off} />
          )}
          {pending.facility_requests > 0 && (
            <AlertRow label="Заявки" count={pending.facility_requests} />
          )}
        </div>
      )}

      {/* Daily revenue */}
      {data.daily_revenue?.length > 0 && (
        <div style={ms.section}>
          <div style={ms.sectionTitle}>Выручка по дням</div>
          {data.daily_revenue.map((day, i) => (
            <div key={i} style={ms.tableRow}>
              <span style={{ color: C.textSec }}>{formatDate(day.date)}</span>
              <span style={{ color: C.text, fontWeight: 600 }}>
                {fmt(day.revenue)} ₽
                <span style={{ color: C.textMuted, fontWeight: 400, marginLeft: 8, fontSize: 11 }}>
                  {day.bookings} зап.
                </span>
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Top masters */}
      {data.top_masters?.length > 0 && (
        <div style={ms.section}>
          <div style={ms.sectionTitle}>Топ мастеров (неделя)</div>
          <div style={ms.tableHeader}>
            <span>Мастер</span>
            <span style={{ textAlign: 'right' }}>Выручка / Клиенты / Ср. чек</span>
          </div>
          {data.top_masters.map((m, i) => (
            <div key={i} style={ms.tableRow}>
              <span style={{ color: C.text }}>{i + 1}. {m.name}</span>
              <span style={{ color: C.gold, fontWeight: 600, fontSize: 12 }}>
                {fmt(m.revenue)} ₽ · {m.clients} · {fmt(m.avg_check)} ₽
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Branch comparison */}
      {branchId === 'all' && branchesData?.length > 0 && (
        <div style={ms.section}>
          <div style={ms.sectionTitle}>Сравнение филиалов</div>
          {branchesData.map((b, i) => (
            <div key={i} style={{
              ...ms.alertCard,
              flexDirection: 'column',
              alignItems: 'stretch',
              cursor: 'default',
            }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 6 }}>
                {b.name}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                <span style={{ color: C.textSec }}>Сегодня: <span style={{ color: C.gold }}>{fmt(b.today_revenue)} ₽</span></span>
                <span style={{ color: C.textSec }}>Неделя: <span style={{ color: C.gold }}>{fmt(b.week_revenue)} ₽</span></span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginTop: 4 }}>
                <span style={{ color: C.textSec }}>Записей: {b.today_bookings}</span>
                <span style={{ color: C.textSec }}>Мастеров: {b.active_masters}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

function AlertRow({ label, count }) {
  return (
    <div style={ms.alertCard}>
      <span style={{ color: C.text, fontSize: 14 }}>{label}</span>
      <span style={ms.alertBadge}>{count}</span>
    </div>
  );
}

function fmt(n) {
  return (n || 0).toLocaleString('ru');
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('ru', { day: 'numeric', month: 'short', weekday: 'short' });
}
