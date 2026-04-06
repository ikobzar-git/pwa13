import { useState, useEffect, lazy, Suspense } from 'react';
import { feedback, facilityRequests, profile, companies, uploadPublicPhoto } from '../../api';
import { useApp } from '../../contexts/AppContext';
import { C, btn } from '../../theme';
import { SkeletonCard } from '../../components/Skeleton';
import { ts } from './tabStyles';

const FinanceSection = lazy(() => import('./FinanceSection'));
const InventorySection = lazy(() => import('./InventorySection'));
const DocumentsSection = lazy(() => import('./DocumentsSection'));

const SubFallback = () => <div style={{ padding: '0 16px' }}><SkeletonCard /><SkeletonCard /></div>;

const FAC_LABELS = {
  cosmetics: 'Косметика и расходники',
  repair: 'Ремонт / техника',
  bar: 'Бар / алкоголь',
  snacks: 'Снеки',
  other: 'Другое',
};

const FAC_STATUS_LABELS = {
  new: 'Новая',
  in_progress: 'В работе',
  done: 'Выполнена',
  rejected: 'Отклонена',
};

const FAC_STATUS_COLORS = {
  new: { bg: C.surface3, color: C.textSec },
  in_progress: { bg: 'rgba(0,229,204,0.12)', color: C.gold },
  done: { bg: 'rgba(0,229,204,0.08)', color: '#4CAF50' },
  rejected: { bg: 'rgba(255,85,85,0.08)', color: '#FF5555' },
};

const SUB_TABS = [
  ['profile', 'Профиль'],
  ['finance', 'Финансы'],
  ['requests', 'Заявки'],
  ['inventory', 'Инвентарь'],
  ['docs', 'Документы'],
  ['feedback', 'Связь'],
];

export default function MoreTab() {
  const { user, companyId, showToast } = useApp();
  const [moreSection, setMoreSection] = useState('profile');

  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackTopicId, setFeedbackTopicId] = useState('');
  const [feedbackTopics, setFeedbackTopics] = useState([]);
  const [feedbackList, setFeedbackList] = useState([]);
  const [myFeedbackList, setMyFeedbackList] = useState([]);
  const [feedbackSent, setFeedbackSent] = useState(false);

  const [prof, setProf] = useState(null);
  const [pubSlug, setPubSlug] = useState('');
  const [pubEnabled, setPubEnabled] = useState(false);
  const [pubBio, setPubBio] = useState('');
  const [pubCompanyId, setPubCompanyId] = useState('');
  const [pubSaving, setPubSaving] = useState(false);
  const [companyOptions, setCompanyOptions] = useState([]);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [photoFile, setPhotoFile] = useState(null);

  const [facList, setFacList] = useState([]);
  const [facCat, setFacCat] = useState('cosmetics');
  const [facTitle, setFacTitle] = useState('');
  const [facText, setFacText] = useState('');
  const [facSent, setFacSent] = useState(false);

  useEffect(() => {
    feedback.topics().then(setFeedbackTopics).catch(() => setFeedbackTopics([]));
    if (user?.role === 'manager') {
      feedback.list().then(setFeedbackList).catch(() => setFeedbackList([]));
    }
    feedback.my().then(setMyFeedbackList).catch(() => setMyFeedbackList([]));
  }, [user?.role]);

  useEffect(() => {
    if (!companyId) return;
    profile.get()
      .then((p) => {
        setProf(p);
        setPubSlug(p.public_slug || '');
        setPubEnabled(!!p.public_profile_enabled);
        setPubBio(p.public_bio || '');
        setPubCompanyId(p.public_company_id || companyId);
      })
      .catch(() => {});
    companies.list().then(setCompanyOptions).catch(() => setCompanyOptions([]));
    facilityRequests.list(companyId).then(setFacList).catch(() => setFacList([]));
  }, [companyId, facSent]);

  const handleFacSubmit = async (e) => {
    e.preventDefault();
    if (!facText.trim() || !companyId) return;
    try {
      await facilityRequests.create(
        { category: facCat, title: facTitle.trim() || null, text: facText.trim() },
        companyId
      );
      setFacText('');
      setFacTitle('');
      setFacSent((x) => !x);
      showToast('Заявка отправлена');
      facilityRequests.list(companyId).then(setFacList);
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handlePubSave = async (e) => {
    e.preventDefault();
    setPubSaving(true);
    try {
      const p = await profile.updatePublic({
        public_slug: pubSlug || null,
        public_profile_enabled: pubEnabled,
        public_bio: pubBio || null,
        public_company_id: pubCompanyId || null,
      });
      setProf(p);
      showToast('Сохранено');
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setPubSaving(false);
    }
  };

  const copyPubLink = () => {
    if (!pubSlug) return;
    const url = `${window.location.origin}/m/${pubSlug}`;
    navigator.clipboard.writeText(url).then(() => showToast('Ссылка скопирована')).catch(() => {});
  };

  const handlePhotoSelect = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setPhotoFile(f);
    setPhotoPreview(URL.createObjectURL(f));
    e.target.value = '';
  };

  const handlePhotoUpload = async () => {
    if (!photoFile) return;
    try {
      const p = await uploadPublicPhoto(photoFile);
      setProf(p);
      if (p.public_slug) setPubSlug(p.public_slug);
      showToast('Фото загружено');
    } catch (err) {
      showToast(err.message || 'Ошибка загрузки', 'error');
    } finally {
      setPhotoPreview(null);
      setPhotoFile(null);
    }
  };

  const handlePhotoCancelPreview = () => {
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhotoPreview(null);
    setPhotoFile(null);
  };

  const handleFeedbackSubmit = async (e) => {
    e.preventDefault();
    if (!feedbackText.trim()) return;
    try {
      await feedback.create(feedbackText.trim(), feedbackTopicId || null, companyId);
      setFeedbackText('');
      setFeedbackTopicId('');
      setFeedbackSent(true);
      showToast('Спасибо за обратную связь');
      feedback.my().then(setMyFeedbackList);
      if (user?.role === 'manager') feedback.list().then(setFeedbackList);
    } catch (err) {
      showToast(err.message || 'Ошибка отправки', 'error');
    }
  };

  const statusBadge = (status) => {
    const colors = FAC_STATUS_COLORS[status] || FAC_STATUS_COLORS.new;
    return {
      display: 'inline-block',
      padding: '2px 8px',
      borderRadius: 6,
      fontSize: 11,
      fontWeight: 600,
      background: colors.bg,
      color: colors.color,
    };
  };

  return (
    <>
      <div style={{ ...ts.section, marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', scrollbarWidth: 'none' }}>
          {SUB_TABS.map(([id, label]) => (
            <button
              key={id}
              onClick={() => setMoreSection(id)}
              style={{ ...btn.period(moreSection === id), flexShrink: 0 }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {moreSection === 'profile' && user?.yclients_staff_id && (
        <div style={ts.section}>
          <div style={ts.sectionTitle}>Публичная ссылка</div>
          <p style={{ fontSize: 13, color: C.textSec, marginBottom: 12, lineHeight: 1.45 }}>
            Клиенты смогут записаться к вам по персональной странице (без выбора других мастеров).
          </p>
          <form onSubmit={handlePubSave}>
            <label style={{ fontSize: 12, color: C.textSec, display: 'block', marginBottom: 6 }}>Адрес (латиница)</label>
            <input
              type="text"
              value={pubSlug}
              onChange={(e) => setPubSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
              placeholder="ivan-barber"
              style={ts.searchInput}
            />
            <label style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                type="checkbox"
                checked={pubEnabled}
                onChange={(e) => setPubEnabled(e.target.checked)}
                style={{ accentColor: C.gold, width: 18, height: 18 }}
              />
              <span style={{ fontSize: 14, color: C.text }}>Страница включена</span>
            </label>
            <label style={{ fontSize: 12, color: C.textSec, display: 'block', marginTop: 12 }}>О себе</label>
            <textarea
              value={pubBio}
              onChange={(e) => setPubBio(e.target.value)}
              rows={3}
              style={ts.feedbackTextarea}
              placeholder="Коротко о стиле и опыте"
            />
            <label style={{ fontSize: 12, color: C.textSec, display: 'block', marginTop: 8 }}>Филиал для записи</label>
            <select
              value={pubCompanyId}
              onChange={(e) => setPubCompanyId(e.target.value)}
              style={ts.feedbackSelect}
            >
              {companyOptions.map((c) => (
                <option key={c.id} value={String(c.id)}>{c.name}</option>
              ))}
            </select>
            <div style={{ marginTop: 12 }}>
              <span style={{ fontSize: 12, color: C.textSec, display: 'block', marginBottom: 6 }}>Фото</span>
              {photoPreview ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                  <img
                    src={photoPreview}
                    alt=""
                    style={{ width: 80, height: 80, borderRadius: '50%', objectFit: 'cover', border: `1px solid ${C.border}` }}
                  />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <button type="button" style={{ ...btn.primary, padding: '6px 14px', fontSize: 12 }} onClick={handlePhotoUpload}>
                      Загрузить
                    </button>
                    <button type="button" style={{ ...btn.secondary, padding: '6px 14px', fontSize: 12 }} onClick={handlePhotoCancelPreview}>
                      Отмена
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoSelect}
                    style={{ fontSize: 13, color: C.textSec }}
                  />
                  {prof?.public_photo_url && (
                    <img
                      src={prof.public_photo_url}
                      alt=""
                      style={{ width: 80, height: 80, borderRadius: '50%', objectFit: 'cover', marginTop: 10, border: `1px solid ${C.border}` }}
                    />
                  )}
                </>
              )}
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
              <button type="submit" style={btn.primary} disabled={pubSaving}>
                {pubSaving ? 'Сохранение…' : 'Сохранить'}
              </button>
              <button type="button" style={btn.secondary} onClick={copyPubLink} disabled={!pubSlug}>
                Копировать ссылку
              </button>
            </div>
          </form>
        </div>
      )}

      {moreSection === 'profile' && !user?.yclients_staff_id && (
        <div style={ts.section}>
          <p style={ts.emptyText}>Публичный профиль доступен мастерам с привязкой к YClients.</p>
        </div>
      )}

      {moreSection === 'finance' && (
        <Suspense fallback={<SubFallback />}>
          <FinanceSection />
        </Suspense>
      )}

      {moreSection === 'inventory' && (
        <Suspense fallback={<SubFallback />}>
          <InventorySection />
        </Suspense>
      )}

      {moreSection === 'docs' && (
        <Suspense fallback={<SubFallback />}>
          <DocumentsSection />
        </Suspense>
      )}

      {moreSection === 'requests' && (
        <>
          <div style={ts.section}>
            <div style={ts.sectionTitle}>Новая заявка</div>
            <form onSubmit={handleFacSubmit}>
              <select
                value={facCat}
                onChange={(e) => setFacCat(e.target.value)}
                style={ts.feedbackSelect}
              >
                {Object.entries(FAC_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
              <input
                type="text"
                value={facTitle}
                onChange={(e) => setFacTitle(e.target.value)}
                placeholder="Краткий заголовок (необязательно)"
                style={ts.searchInput}
              />
              <textarea
                value={facText}
                onChange={(e) => setFacText(e.target.value)}
                placeholder="Опишите, что нужно заказать или починить"
                rows={3}
                style={ts.feedbackTextarea}
              />
              <button type="submit" style={{ ...btn.primary, marginTop: 10 }}>Отправить заявку</button>
            </form>
          </div>

          {facList.length > 0 && (
            <div style={ts.section}>
              <div style={ts.sectionTitle}>
                {user?.role === 'manager' ? 'Заявки филиала' : 'Мои заявки'}
              </div>
              {facList.map((r) => (
                <div key={r.id} style={{ ...ts.noteItem, marginBottom: 10 }}>
                  <div style={{ ...ts.noteMeta, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <span>{FAC_LABELS[r.category] || r.category}</span>
                    <span style={statusBadge(r.status)}>
                      {FAC_STATUS_LABELS[r.status] || r.status}
                    </span>
                    <span>{new Date(r.created_at).toLocaleString('ru')}</span>
                    {r.user && user?.role === 'manager' && (
                      <span>— {r.user.name || r.user.phone}</span>
                    )}
                  </div>
                  {r.title && <div style={{ fontWeight: 600, marginBottom: 4 }}>{r.title}</div>}
                  <p style={{ fontSize: 14, whiteSpace: 'pre-wrap' }}>{r.text}</p>
                  {user?.role === 'manager' && (
                    <select
                      value={r.status}
                      onChange={async (e) => {
                        try {
                          await facilityRequests.updateStatus(r.id, e.target.value, companyId);
                          const list = await facilityRequests.list(companyId);
                          setFacList(list);
                          showToast('Статус обновлён');
                        } catch (err) {
                          showToast(err.message, 'error');
                        }
                      }}
                      style={{ ...ts.feedbackSelect, marginTop: 8 }}
                    >
                      {Object.entries(FAC_STATUS_LABELS).map(([k, v]) => (
                        <option key={k} value={k}>{v}</option>
                      ))}
                    </select>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {moreSection === 'feedback' && (
        <>
          <div style={ts.section}>
            <div style={ts.sectionTitle}>Обратная связь</div>
            <form onSubmit={handleFeedbackSubmit}>
              <select
                value={feedbackTopicId}
                onChange={(e) => setFeedbackTopicId(e.target.value)}
                style={ts.feedbackSelect}
              >
                <option value="">— Выберите тему —</option>
                {feedbackTopics.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
              <textarea
                value={feedbackText}
                onChange={(e) => {
                  setFeedbackText(e.target.value);
                  setFeedbackSent(false);
                }}
                placeholder="Оставьте отзыв или предложение..."
                rows={3}
                style={ts.feedbackTextarea}
              />
              <button type="submit" style={{ ...btn.primary, marginTop: 10 }}>Отправить</button>
            </form>
            {feedbackSent && (
              <p style={{ color: C.gold, marginTop: 10, fontSize: 14 }}>Спасибо за обратную связь</p>
            )}
          </div>

          {myFeedbackList.length > 0 && (
            <div style={ts.section}>
              <div style={ts.sectionTitle}>Мои обращения</div>
              {myFeedbackList.map((f) => (
                <div key={f.id} style={ts.feedbackItem}>
                  <div style={ts.feedbackMeta}>
                    {new Date(f.created_at).toLocaleString('ru')}
                    {f.topic?.name && <> · <strong style={{ color: C.gold }}>{f.topic.name}</strong></>}
                  </div>
                  <p style={{ fontSize: 14, whiteSpace: 'pre-wrap', color: C.text }}>{f.text}</p>
                </div>
              ))}
            </div>
          )}

          {user?.role === 'manager' && feedbackList.length > 0 && (
            <div style={ts.section}>
              <div style={ts.sectionTitle}>Обратная связь от сотрудников</div>
              {feedbackList.map((f) => (
                <div key={f.id} style={ts.feedbackItem}>
                  <div style={ts.feedbackMeta}>
                    <strong style={{ color: C.text }}>{f.user?.name || f.user?.phone || 'Сотрудник'}</strong>
                    {' · '}{new Date(f.created_at).toLocaleString('ru')}
                    {f.topic?.name && <> · {f.topic.name}</>}
                  </div>
                  <p style={{ fontSize: 14, whiteSpace: 'pre-wrap', color: C.text }}>{f.text}</p>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </>
  );
}
