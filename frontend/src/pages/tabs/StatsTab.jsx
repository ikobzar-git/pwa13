import { useState, useEffect } from 'react';
import { stats } from '../../api';
import { useApp } from '../../contexts/AppContext';
import StatsChart from '../../components/StatsChart';
import { C, btn } from '../../theme';
import { SkeletonCard } from '../../components/Skeleton';
import { ts } from './tabStyles';

export default function StatsTab() {
  const { user, companyId } = useApp();
  const staffId = user?.yclients_staff_id;
  const [personalStats, setPersonalStats] = useState(null);
  const [statsPeriod, setStatsPeriod] = useState('week');
  const [chartMetric, setChartMetric] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadStats = () => {
    if (!staffId) {
      setLoading(false);
      return;
    }
    setError(null);
    setLoading(true);
    stats.personal(statsPeriod)
      .then((data) => { setPersonalStats(data); setError(null); })
      .catch(() => { setPersonalStats(null); setError('Не удалось загрузить статистику'); })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadStats();
  }, [staffId, statsPeriod]);

  return (
    <>
      <div style={ts.section}>
        <div style={ts.sectionTitle}>Моя статистика</div>
        <div style={{
          ...ts.periodRow,
          flexWrap: 'nowrap',
          overflowX: 'auto',
          WebkitOverflowScrolling: 'touch',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
        }}>
          {[
            ['day', 'День'],
            ['week', 'Неделя'],
            ['month', 'Месяц'],
            ['quarter', 'Квартал'],
            ['year', 'Год'],
          ].map(([p, label]) => (
            <button
              key={p}
              onClick={() => setStatsPeriod(p)}
              style={{ ...btn.period(statsPeriod === p), flexShrink: 0 }}
            >
              {label}
            </button>
          ))}
        </div>
        {error ? (
          <div style={{
            padding: '16px',
            background: 'rgba(255,85,85,0.08)',
            border: '1px solid rgba(255,85,85,0.25)',
            borderRadius: 12,
            textAlign: 'center',
          }}>
            <div style={{ color: '#FF5555', fontSize: 14, marginBottom: 10 }}>{error}</div>
            <button
              style={{ ...btn.secondary, fontSize: 13 }}
              onClick={loadStats}
            >
              Повторить
            </button>
          </div>
        ) : loading ? (
          <div style={ts.statsGrid}>
            <SkeletonCard height={70} /><SkeletonCard height={70} /><SkeletonCard height={70} />
          </div>
        ) : personalStats ? (
          <div style={ts.statsGrid}>
            {[
              ['completed_records', personalStats.completed_records, 'Записей'],
              ['total_revenue', personalStats.total_revenue.toLocaleString('ru') + ' ₽', 'Выручка'],
              ['avg_check', personalStats.avg_check.toLocaleString('ru') + ' ₽', 'Средний чек'],
              ['unique_clients', personalStats.unique_clients, 'Клиентов'],
              ['cancel_rate', personalStats.cancel_rate + '%', 'Отмены'],
            ].map(([metric, value, label]) => (
              <div
                key={metric}
                style={{ ...ts.statCard, cursor: 'pointer' }}
                onClick={() => setChartMetric(metric)}
              >
                <div style={ts.statValue}>{value}</div>
                <div style={ts.statLabel}>
                  {label}
                  <span style={{ marginLeft: 4, fontSize: 10, color: C.gold, opacity: 0.6 }}>▸</span>
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </div>

      {chartMetric && (
        <StatsChart
          metric={chartMetric}
          period={statsPeriod}
          onClose={() => setChartMetric(null)}
        />
      )}
    </>
  );
}
