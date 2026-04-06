import { useState, useEffect } from 'react';
import { finance } from '../../api';
import { useApp } from '../../contexts/AppContext';
import { C, btn } from '../../theme';
import { SkeletonCard } from '../../components/Skeleton';
import ErrorBanner from '../../components/ErrorBanner';
import { ts } from './tabStyles';

const TYPE_LABELS = {
  revenue: 'Выручка',
  commission: 'Комиссия',
  rent: 'Аренда',
  deduction: 'Вычет',
  payout: 'Выплата',
};

const PAYOUT_STATUS = {
  pending: { label: 'Ожидает', bg: C.surface3, color: C.textSec },
  approved: { label: 'Одобрено', bg: 'rgba(0,229,204,0.12)', color: C.gold },
  paid: { label: 'Выплачено', bg: 'rgba(0,229,204,0.08)', color: '#4CAF50' },
  rejected: { label: 'Отклонено', bg: 'rgba(255,85,85,0.08)', color: '#FF5555' },
};

export default function FinanceSection() {
  const { companyId, showToast } = useApp();
  const [balance, setBalance] = useState(null);
  const [history, setHistory] = useState([]);
  const [payouts, setPayouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [payoutAmount, setPayoutAmount] = useState('');
  const [payoutComment, setPayoutComment] = useState('');
  const [showHistory, setShowHistory] = useState(false);

  const load = () => {
    if (!companyId) return;
    setError(null);
    setLoading(true);
    Promise.all([
      finance.balance(companyId),
      finance.payouts(companyId),
    ]).then(([b, p]) => {
      setBalance(b);
      setPayouts(Array.isArray(p) ? p : []);
    }).catch((e) => {
      setError(e.message || 'Не удалось загрузить данные');
    }).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [companyId]);

  const loadHistory = () => {
    finance.history(companyId).then(setHistory).catch(() => setHistory([]));
    setShowHistory(true);
  };

  const handleRequestPayout = async (e) => {
    e.preventDefault();
    const amount = parseFloat(payoutAmount);
    if (!amount || amount <= 0) return;
    try {
      await finance.requestPayout(amount, payoutComment, companyId);
      setPayoutAmount('');
      setPayoutComment('');
      showToast('Заявка на выплату отправлена');
      load();
    } catch (err) {
      showToast(err.message || 'Ошибка', 'error');
    }
  };


  if (error) return <div style={ts.section}><ErrorBanner message={error} onRetry={load} /></div>;
  if (loading) return <div style={ts.section}><SkeletonCard height={100} /><SkeletonCard height={70} /></div>;

  return (
    <>
      {balance && (
        <div style={ts.section}>
          <div style={ts.sectionTitle}>Баланс</div>
          <div style={{
            background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 12,
            padding: 16, marginBottom: 12,
          }}>
            <div style={{ fontSize: 28, fontWeight: 800, color: C.gold, marginBottom: 8 }}>
              {balance.available.toLocaleString('ru')} ₽
            </div>
            <div style={{ fontSize: 12, color: C.textSec, marginBottom: 12 }}>Доступно к выводу</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 13 }}>
              <div><span style={{ color: C.textSec }}>Выручка:</span> <span style={{ color: C.text }}>{balance.total_revenue.toLocaleString('ru')} ₽</span></div>
              <div><span style={{ color: C.textSec }}>Комиссия:</span> <span style={{ color: C.text }}>−{balance.total_commission.toLocaleString('ru')} ₽</span></div>
              <div><span style={{ color: C.textSec }}>Аренда:</span> <span style={{ color: C.text }}>−{balance.total_rent.toLocaleString('ru')} ₽</span></div>
              <div><span style={{ color: C.textSec }}>Выплачено:</span> <span style={{ color: C.text }}>{balance.total_payouts.toLocaleString('ru')} ₽</span></div>
            </div>
            {balance.pending_payout > 0 && (
              <div style={{ marginTop: 8, fontSize: 13, color: C.gold }}>
                В обработке: {balance.pending_payout.toLocaleString('ru')} ₽
              </div>
            )}
          </div>
          {!showHistory && (
            <button type="button" style={{ ...btn.secondary, fontSize: 13 }} onClick={loadHistory}>
              Показать историю операций
            </button>
          )}
        </div>
      )}

      {showHistory && history.length > 0 && (
        <div style={ts.section}>
          <div style={ts.sectionTitle}>История операций</div>
          {history.slice(0, 50).map((t) => (
            <div key={t.id} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '10px 0', borderBottom: `1px solid ${C.border}`, fontSize: 13,
            }}>
              <div>
                <div style={{ color: C.text, fontWeight: 500 }}>{TYPE_LABELS[t.type] || t.type}</div>
                {t.description && <div style={{ color: C.textSec, fontSize: 12 }}>{t.description}</div>}
              </div>
              <div style={{
                fontWeight: 600,
                color: t.type === 'revenue' ? '#4CAF50' : t.type === 'payout' ? C.gold : C.error,
              }}>
                {t.type === 'revenue' ? '+' : '−'}{Math.abs(t.amount).toLocaleString('ru')} ₽
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={ts.section}>
        <div style={ts.sectionTitle}>Запрос на вывод</div>
        <form onSubmit={handleRequestPayout}>
          <input
            type="number"
            min="1"
            step="0.01"
            value={payoutAmount}
            onChange={(e) => setPayoutAmount(e.target.value)}
            placeholder="Сумма, ₽"
            style={ts.searchInput}
          />
          <textarea
            value={payoutComment}
            onChange={(e) => setPayoutComment(e.target.value)}
            placeholder="Комментарий (необязательно)"
            rows={2}
            style={{ ...ts.feedbackTextarea, marginTop: 8 }}
          />
          <button type="submit" style={{ ...btn.primary, marginTop: 10 }} disabled={!payoutAmount}>
            Запросить вывод
          </button>
        </form>
      </div>

      {payouts.length > 0 && (
        <div style={ts.section}>
          <div style={ts.sectionTitle}>Заявки на выплату</div>
          {payouts.map((p) => {
            const s = PAYOUT_STATUS[p.status] || PAYOUT_STATUS.pending;
            return (
              <div key={p.id} style={{ ...ts.noteItem, marginBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <span style={{ fontSize: 16, fontWeight: 700, color: C.text }}>
                    {parseFloat(p.amount).toLocaleString('ru')} ₽
                  </span>
                  <span style={{
                    padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                    background: s.bg, color: s.color,
                  }}>
                    {s.label}
                  </span>
                </div>
                <div style={{ fontSize: 12, color: C.textSec }}>
                  {new Date(p.created_at).toLocaleString('ru')}
                  {p.user && <span> · {p.user.name || p.user.phone}</span>}
                </div>
                {p.comment && <div style={{ fontSize: 13, color: C.text, marginTop: 4 }}>{p.comment}</div>}
                {p.admin_comment && <div style={{ fontSize: 12, color: C.textSec, marginTop: 2 }}>Ответ: {p.admin_comment}</div>}
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
