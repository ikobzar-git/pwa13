import { useState, useEffect } from 'react';
import { manager, schedule } from '../../api';
import { C, btn } from '../../theme';
import { SkeletonCard } from '../../components/Skeleton';
import { ms } from './managerTabStyles';

const SUB_TABS = [
  ['masters', 'Мастера'],
  ['timeoff', 'Отпуска'],
  ['schedules', 'Графики'],
];

export default function TeamTab({ branchId }) {
  const [sub, setSub] = useState('masters');
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
      {sub === 'masters' && <MastersSection companyId={companyId} />}
      {sub === 'timeoff' && <TimeOffSection companyId={companyId} />}
      {sub === 'schedules' && <SchedulesSection companyId={companyId} />}
    </>
  );
}

function MastersSection({ companyId }) {
  const [staff, setStaff] = useState(null);
  const [expanded, setExpanded] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    manager.staff()
      .then(d => setStaff(Array.isArray(d) ? d : d?.data || []))
      .catch(() => setStaff([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={ms.section}><SkeletonCard /><SkeletonCard /><SkeletonCard /></div>;

  return (
    <div style={ms.section}>
      {staff?.length === 0 && <div style={ms.emptyText}>Нет сотрудников</div>}
      {staff?.map(s => (
        <div key={s.id}>
          <div
            style={ms.listItem}
            onClick={() => setExpanded(expanded === s.id ? null : s.id)}
          >
            <div>
              <div style={ms.listLabel}>{s.name || 'Без имени'}</div>
              <div style={ms.listDesc}>
                {s.phone} · {s.yclients_staff_id ? `YC #${s.yclients_staff_id}` : 'Не привязан'}
              </div>
            </div>
          </div>
          {expanded === s.id && (
            <MasterDetail userId={s.id} companyId={companyId} />
          )}
        </div>
      ))}
    </div>
  );
}

function MasterDetail({ userId, companyId }) {
  const [profile, setProfile] = useState(null);
  const [stats, setStats] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    manager.staffPublicProfile(userId).then(setProfile).catch(() => {});
    manager.staffStats(userId, 'week', companyId).then(setStats).catch(() => {});
  }, [userId, companyId]);

  const toggleEnabled = async () => {
    if (!profile) return;
    setSaving(true);
    try {
      const res = await manager.updateStaffPublicProfile(userId, {
        public_profile_enabled: !profile.public_profile_enabled,
      });
      setProfile(res);
    } catch { /* ignore */ }
    setSaving(false);
  };

  return (
    <div style={{
      margin: '-4px 0 8px',
      padding: '12px 16px',
      background: C.surface3,
      border: `1px solid ${C.border}`,
      borderRadius: '0 0 12px 12px',
      fontSize: 13,
    }}>
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 12 }}>
          <MiniStat value={fmt(stats.total_revenue) + ' ₽'} label="Выручка" />
          <MiniStat value={stats.completed_records} label="Записей" />
          <MiniStat value={fmt(stats.avg_check) + ' ₽'} label="Ср. чек" />
        </div>
      )}
      {profile && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ color: C.textSec }}>
            Публичная страница {profile.public_slug ? `(/m/${profile.public_slug})` : ''}
          </span>
          <button
            onClick={toggleEnabled}
            disabled={saving}
            style={{
              padding: '4px 12px',
              borderRadius: 6,
              border: 'none',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              background: profile.public_profile_enabled ? C.goldDim : C.surface2,
              color: profile.public_profile_enabled ? C.gold : C.textMuted,
            }}
          >
            {profile.public_profile_enabled ? 'Вкл' : 'Выкл'}
          </button>
        </div>
      )}
    </div>
  );
}

function MiniStat({ value, label }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: 14, fontWeight: 700, color: C.gold }}>{value}</div>
      <div style={{ fontSize: 10, color: C.textSec }}>{label}</div>
    </div>
  );
}

function TimeOffSection({ companyId }) {
  const [requests, setRequests] = useState(null);
  const [filter, setFilter] = useState('pending');
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    schedule.timeOff(companyId)
      .then(d => setRequests(Array.isArray(d) ? d : d?.data || []))
      .catch(() => setRequests([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [companyId]);

  const filtered = requests?.filter(r => filter === 'all' || r.status === filter) || [];

  const processRequest = async (id, status) => {
    try {
      await schedule.processTimeOff(id, status, companyId);
      load();
    } catch { /* ignore */ }
  };

  const TYPE_LABELS = { vacation: 'Отпуск', sick: 'Больничный', personal: 'Личное' };
  const STATUS_COLORS = { pending: C.gold, approved: '#4CAF50', rejected: C.error };

  return (
    <div style={ms.section}>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        {[['pending', 'Ожидает'], ['all', 'Все']].map(([id, label]) => (
          <button key={id} onClick={() => setFilter(id)} style={{ ...btn.period(filter === id), fontSize: 12 }}>
            {label}
          </button>
        ))}
      </div>
      {loading ? <SkeletonCard /> : filtered.length === 0 ? (
        <div style={ms.emptyText}>Нет заявок</div>
      ) : filtered.map(r => (
        <div key={r.id} style={{ ...ms.listItem, flexDirection: 'column', alignItems: 'stretch', cursor: 'default' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontWeight: 600, color: C.text }}>{r.user?.name || 'Сотрудник'}</span>
            <span style={{ fontSize: 11, color: STATUS_COLORS[r.status] || C.textSec }}>
              {r.status}
            </span>
          </div>
          <div style={{ fontSize: 12, color: C.textSec }}>
            {TYPE_LABELS[r.type] || r.type} · {r.start_date} — {r.end_date}
          </div>
          {r.reason && <div style={{ fontSize: 12, color: C.textMuted, marginTop: 4 }}>{r.reason}</div>}
          {r.status === 'pending' && (
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <button
                onClick={() => processRequest(r.id, 'approved')}
                style={{ ...btn.period(true), fontSize: 12, padding: '4px 12px' }}
              >
                Одобрить
              </button>
              <button
                onClick={() => processRequest(r.id, 'rejected')}
                style={{ ...btn.period(false), fontSize: 12, padding: '4px 12px', color: C.error }}
              >
                Отклонить
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function SchedulesSection({ companyId }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const today = new Date();
    const from = today.toISOString().slice(0, 10);
    const to = new Date(today.getTime() + 6 * 86400000).toISOString().slice(0, 10);
    manager.scheduleOverview(companyId, from, to)
      .then(d => setData(d?.days || []))
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  }, [companyId]);

  if (loading) return <div style={ms.section}><SkeletonCard height={120} /></div>;

  return (
    <div style={ms.section}>
      {(!data || data.length === 0) ? (
        <div style={ms.emptyText}>Нет данных о графиках</div>
      ) : data.map((day, i) => (
        <div key={i} style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.gold, marginBottom: 6 }}>
            {formatDate(day.date)}
          </div>
          {day.staff?.length > 0 ? day.staff.map((s, j) => (
            <div key={j} style={ms.tableRow}>
              <span style={{ color: C.text }}>{s.name}</span>
              <span style={{ color: C.textSec }}>{s.start_time?.slice(0, 5)} — {s.end_time?.slice(0, 5)}</span>
            </div>
          )) : (
            <div style={{ fontSize: 12, color: C.textMuted }}>Нет смен</div>
          )}
        </div>
      ))}
    </div>
  );
}

function fmt(n) { return (n || 0).toLocaleString('ru'); }

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('ru', { day: 'numeric', month: 'short', weekday: 'short' });
}
