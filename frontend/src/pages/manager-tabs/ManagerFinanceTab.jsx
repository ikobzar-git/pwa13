import { useState, useEffect } from 'react';
import { manager, finance } from '../../api';
import { C, btn } from '../../theme';
import { SkeletonCard } from '../../components/Skeleton';
import { useApp } from '../../contexts/AppContext';
import { ms } from './managerTabStyles';

const SUB_TABS = [
  ['payouts', 'Выплаты'],
  ['overview', 'Обзор'],
  ['transactions', 'Операции'],
];

export default function ManagerFinanceTab({ branchId }) {
  const [sub, setSub] = useState('payouts');
  const companyId = branchId === 'all' ? '' : branchId;

  return (
    <>
      <div style={ms.subNav}>
        {SUB_TABS.map(([id, label]) => (
          <button key={id} onClick={() => setSub(id)} style={{ ...btn.period(sub === id), flexShrink: 0 }}>
            {label}
          </button>
        ))}
      </div>
      {sub === 'payouts' && <PayoutsSection companyId={companyId} />}
      {sub === 'overview' && <OverviewSection companyId={companyId} />}
      {sub === 'transactions' && <TransactionsSection companyId={companyId} />}
    </>
  );
}

function PayoutsSection({ companyId }) {
  const { showToast } = useApp();
  const [payouts, setPayouts] = useState(null);
  const [filter, setFilter] = useState('pending');
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    finance.payouts(companyId)
      .then(d => setPayouts(Array.isArray(d) ? d : d?.data || []))
      .catch(() => setPayouts([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [companyId]);

  const filtered = payouts?.filter(p => filter === 'all' || p.status === filter) || [];

  const process = async (id, status) => {
    try {
      await finance.processPayout(id, status, '', companyId);
      showToast(status === 'approved' ? 'Одобрено' : status === 'paid' ? 'Выплачено' : 'Отклонено');
      load();
    } catch (e) {
      showToast(e.message || 'Ошибка', 'error');
    }
  };

  const STATUS_LABELS = { pending: 'Ожидает', approved: 'Одобрено', paid: 'Выплачено', rejected: 'Отклонено' };
  const STATUS_COLORS = { pending: C.gold, approved: '#4CAF50', paid: C.textSec, rejected: C.error };

  return (
    <div style={ms.section}>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        {[['pending', 'Ожидает'], ['approved', 'Одобрено'], ['all', 'Все']].map(([id, label]) => (
          <button key={id} onClick={() => setFilter(id)} style={{ ...btn.period(filter === id), fontSize: 12 }}>
            {label}
          </button>
        ))}
      </div>
      {loading ? <SkeletonCard /> : filtered.length === 0 ? (
        <div style={ms.emptyText}>Нет выплат</div>
      ) : filtered.map(p => (
        <div key={p.id} style={{ ...ms.listItem, flexDirection: 'column', alignItems: 'stretch', cursor: 'default' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontWeight: 600, color: C.text }}>{p.user?.name || 'Сотрудник'}</span>
            <span style={{ fontSize: 12, fontWeight: 600, color: STATUS_COLORS[p.status] }}>
              {STATUS_LABELS[p.status]}
            </span>
          </div>
          <div style={{ fontSize: 16, fontWeight: 700, color: C.gold }}>{fmt(p.amount)} ₽</div>
          {p.comment && <div style={{ fontSize: 12, color: C.textSec, marginTop: 4 }}>{p.comment}</div>}
          {p.status === 'pending' && (
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <button onClick={() => process(p.id, 'approved')} style={{ ...btn.period(true), fontSize: 12, padding: '4px 12px' }}>
                Одобрить
              </button>
              <button onClick={() => process(p.id, 'rejected')} style={{ ...btn.period(false), fontSize: 12, padding: '4px 12px', color: C.error }}>
                Отклонить
              </button>
            </div>
          )}
          {p.status === 'approved' && (
            <button onClick={() => process(p.id, 'paid')} style={{ ...btn.period(true), fontSize: 12, padding: '4px 12px', marginTop: 8 }}>
              Выплатить
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

function OverviewSection({ companyId }) {
  const [data, setData] = useState(null);
  const [period, setPeriod] = useState('month');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    manager.financeOverview(companyId, period)
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [companyId, period]);

  return (
    <div style={ms.section}>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        {[['week', 'Неделя'], ['month', 'Месяц'], ['quarter', 'Квартал']].map(([id, label]) => (
          <button key={id} onClick={() => setPeriod(id)} style={{ ...btn.period(period === id), fontSize: 12 }}>
            {label}
          </button>
        ))}
      </div>
      {loading ? <SkeletonCard height={100} /> : !data ? (
        <div style={ms.emptyText}>Нет данных</div>
      ) : (
        <>
          <div style={ms.statsGrid}>
            <div style={ms.statCard}><div style={ms.statValue}>{fmt(data.total_revenue)} ₽</div><div style={ms.statLabel}>Выручка</div></div>
            <div style={ms.statCard}><div style={ms.statValue}>{fmt(data.total_commissions)} ₽</div><div style={ms.statLabel}>Комиссии</div></div>
            <div style={ms.statCard}><div style={ms.statValue}>{fmt(data.total_rent)} ₽</div><div style={ms.statLabel}>Аренда</div></div>
            <div style={ms.statCard}><div style={ms.statValue}>{fmt(data.total_payouts)} ₽</div><div style={ms.statLabel}>Выплаты</div></div>
          </div>
          <div style={{ ...ms.statCard, marginTop: 10, borderColor: C.goldBorder }}>
            <div style={ms.statValue}>{fmt(data.net)} ₽</div>
            <div style={ms.statLabel}>Чистая прибыль</div>
          </div>
          {data.by_master?.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <div style={ms.sectionTitle}>По мастерам</div>
              <div style={ms.tableHeader}>
                <span>Мастер</span>
                <span>Выручка / Комиссия</span>
              </div>
              {data.by_master.map((m, i) => (
                <div key={i} style={ms.tableRow}>
                  <span style={{ color: C.text }}>{m.name}</span>
                  <span style={{ color: C.gold, fontSize: 12 }}>{fmt(m.revenue)} / {fmt(m.commission)} ₽</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function TransactionsSection({ companyId }) {
  const [txns, setTxns] = useState([]);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    manager.transactions({ company_id: companyId, page })
      .then(d => {
        setTxns(d?.data || []);
        setLastPage(d?.last_page || 1);
      })
      .catch(() => setTxns([]))
      .finally(() => setLoading(false));
  }, [companyId, page]);

  const TYPE_LABELS = { revenue: 'Выручка', commission: 'Комиссия', rent: 'Аренда', deduction: 'Вычет', payout: 'Выплата' };

  return (
    <div style={ms.section}>
      {loading ? <SkeletonCard /> : txns.length === 0 ? (
        <div style={ms.emptyText}>Нет операций</div>
      ) : (
        <>
          {txns.map(t => (
            <div key={t.id} style={ms.tableRow}>
              <div>
                <span style={{ color: C.text, fontSize: 13 }}>{t.user?.name || '—'}</span>
                <span style={{ color: C.textMuted, fontSize: 11, marginLeft: 8 }}>
                  {TYPE_LABELS[t.type] || t.type}
                </span>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ color: C.gold, fontWeight: 600 }}>{fmt(t.amount)} ₽</span>
                <div style={{ fontSize: 10, color: C.textMuted }}>{t.period_date}</div>
              </div>
            </div>
          ))}
          {lastPage > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginTop: 12 }}>
              <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} style={{ ...btn.period(false), fontSize: 12 }}>←</button>
              <span style={{ color: C.textSec, fontSize: 13, padding: '6px 0' }}>{page} / {lastPage}</span>
              <button disabled={page >= lastPage} onClick={() => setPage(p => p + 1)} style={{ ...btn.period(false), fontSize: 12 }}>→</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function fmt(n) { return (n || 0).toLocaleString('ru'); }
