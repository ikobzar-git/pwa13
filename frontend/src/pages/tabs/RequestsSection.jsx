import { useState, useEffect } from 'react';
import { facilityRequests } from '../../api';
import { useApp } from '../../contexts/AppContext';
import { C, btn } from '../../theme';
import { ts } from './tabStyles';

const FAC_LABELS = {
  cosmetics: 'Косметика и расходники',
  repair: 'Ремонт / техника',
  bar: 'Бар / алкоголь',
  snacks: 'Снеки',
  other: 'Другое',
};

const FAC_STATUS_LABELS = { new: 'Новая', in_progress: 'В работе', done: 'Выполнена', rejected: 'Отклонена' };

const FAC_STATUS_COLORS = {
  new: { bg: C.surface3, color: C.textSec },
  in_progress: { bg: 'rgba(0,229,204,0.12)', color: C.gold },
  done: { bg: 'rgba(0,229,204,0.08)', color: '#4CAF50' },
  rejected: { bg: 'rgba(255,85,85,0.08)', color: '#FF5555' },
};

export default function RequestsSection() {
  const { companyId, showToast } = useApp();
  const [facList, setFacList] = useState([]);
  const [facCat, setFacCat] = useState('cosmetics');
  const [facTitle, setFacTitle] = useState('');
  const [facText, setFacText] = useState('');

  useEffect(() => {
    if (companyId) facilityRequests.list(companyId).then(setFacList).catch(() => setFacList([]));
  }, [companyId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!facText.trim() || !companyId) return;
    try {
      await facilityRequests.create({ category: facCat, title: facTitle.trim() || null, text: facText.trim() }, companyId);
      setFacText('');
      setFacTitle('');
      showToast('Заявка отправлена');
      facilityRequests.list(companyId).then(setFacList);
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const statusBadge = (status) => {
    const c = FAC_STATUS_COLORS[status] || FAC_STATUS_COLORS.new;
    return { display: 'inline-block', padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600, background: c.bg, color: c.color };
  };

  return (
    <>
      <div style={ts.section}>
        <div style={ts.sectionTitle}>Новая заявка</div>
        <form onSubmit={handleSubmit}>
          <select value={facCat} onChange={(e) => setFacCat(e.target.value)} style={ts.feedbackSelect}>
            {Object.entries(FAC_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <input type="text" value={facTitle} onChange={(e) => setFacTitle(e.target.value)} placeholder="Краткий заголовок (необязательно)" style={ts.searchInput} />
          <textarea value={facText} onChange={(e) => setFacText(e.target.value)} placeholder="Опишите, что нужно" rows={3} style={ts.feedbackTextarea} />
          <button type="submit" style={{ ...btn.primary, marginTop: 10 }}>Отправить заявку</button>
        </form>
      </div>
      {facList.length > 0 && (
        <div style={ts.section}>
          <div style={ts.sectionTitle}>Мои заявки</div>
          {facList.map((r) => (
            <div key={r.id} style={{ ...ts.noteItem, marginBottom: 10 }}>
              <div style={{ ...ts.noteMeta, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                <span>{FAC_LABELS[r.category] || r.category}</span>
                <span style={statusBadge(r.status)}>{FAC_STATUS_LABELS[r.status] || r.status}</span>
                <span>{new Date(r.created_at).toLocaleString('ru')}</span>
              </div>
              {r.title && <div style={{ fontWeight: 600, marginBottom: 4 }}>{r.title}</div>}
              <p style={{ fontSize: 14, whiteSpace: 'pre-wrap' }}>{r.text}</p>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
