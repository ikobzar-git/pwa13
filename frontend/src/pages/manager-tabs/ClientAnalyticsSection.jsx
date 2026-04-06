import { useState, useEffect } from 'react';
import { manager } from '../../api';
import { C, btn } from '../../theme';
import { SkeletonCard } from '../../components/Skeleton';
import { ms } from './managerTabStyles';

export default function ClientAnalyticsSection({ branchId }) {
  const [data, setData] = useState(null);
  const [period, setPeriod] = useState('month');
  const [loading, setLoading] = useState(true);
  const companyId = branchId === 'all' ? '' : branchId;

  useEffect(() => {
    setLoading(true);
    manager.clientStats(companyId, period)
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [companyId, period]);

  return (
    <div style={ms.section}>
      <div style={ms.sectionTitle}>Аналитика клиентов</div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        {[['week', 'Неделя'], ['month', 'Месяц'], ['quarter', 'Квартал']].map(([id, label]) => (
          <button key={id} onClick={() => setPeriod(id)} style={{ ...btn.period(period === id), fontSize: 12 }}>
            {label}
          </button>
        ))}
      </div>
      {loading ? (
        <div style={ms.statsGrid}><SkeletonCard height={70} /><SkeletonCard height={70} /></div>
      ) : !data ? (
        <div style={ms.emptyText}>Нет данных</div>
      ) : (
        <div style={ms.statsGrid}>
          <div style={ms.statCard}><div style={ms.statValue}>{data.total_visits}</div><div style={ms.statLabel}>Визитов</div></div>
          <div style={ms.statCard}><div style={ms.statValue}>{data.unique_clients}</div><div style={ms.statLabel}>Уник. клиентов</div></div>
          <div style={ms.statCard}><div style={ms.statValue}>{data.new_clients}</div><div style={ms.statLabel}>Новых</div></div>
          <div style={ms.statCard}><div style={ms.statValue}>{data.return_rate}%</div><div style={ms.statLabel}>Возвратность</div></div>
        </div>
      )}
    </div>
  );
}
