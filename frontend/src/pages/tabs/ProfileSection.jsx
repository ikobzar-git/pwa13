import { useState, useEffect } from 'react';
import { profile, companies, uploadPublicPhoto } from '../../api';
import { useApp } from '../../contexts/AppContext';
import { C, btn } from '../../theme';
import { ts } from './tabStyles';

export default function ProfileSection() {
  const { user, companyId, showToast } = useApp();

  const [prof, setProf] = useState(null);
  const [pubSlug, setPubSlug] = useState('');
  const [pubEnabled, setPubEnabled] = useState(false);
  const [pubBio, setPubBio] = useState('');
  const [pubCompanyId, setPubCompanyId] = useState('');
  const [pubSaving, setPubSaving] = useState(false);
  const [companyOptions, setCompanyOptions] = useState([]);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [photoFile, setPhotoFile] = useState(null);

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
  }, [companyId]);

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

  if (!user?.yclients_staff_id) {
    return <div style={ts.section}><p style={ts.emptyText}>Публичный профиль доступен мастерам с привязкой к YClients.</p></div>;
  }

  return (
    <div style={ts.section}>
      <div style={ts.sectionTitle}>Публичная ссылка</div>
      <p style={{ fontSize: 13, color: C.textSec, marginBottom: 12, lineHeight: 1.45 }}>
        Клиенты смогут записаться к вам по персональной странице.
      </p>
      <form onSubmit={handlePubSave}>
        <label style={{ fontSize: 12, color: C.textSec, display: 'block', marginBottom: 6 }}>Адрес (латиница)</label>
        <input type="text" value={pubSlug} onChange={(e) => setPubSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))} placeholder="ivan-barber" style={ts.searchInput} />
        <div style={{ marginTop: 12, fontSize: 13, color: C.textSec, padding: '8px 12px', background: C.surface3, borderRadius: 8 }}>
          {pubEnabled ? '✓ Страница включена' : 'Страница выключена'} · Управляется руководителем
        </div>
        <label style={{ fontSize: 12, color: C.textSec, display: 'block', marginTop: 12 }}>О себе</label>
        <textarea value={pubBio} onChange={(e) => setPubBio(e.target.value)} rows={3} style={ts.feedbackTextarea} placeholder="Коротко о стиле и опыте" />
        <label style={{ fontSize: 12, color: C.textSec, display: 'block', marginTop: 8 }}>Филиал для записи</label>
        <select value={pubCompanyId} onChange={(e) => setPubCompanyId(e.target.value)} style={ts.feedbackSelect}>
          {companyOptions.map((c) => <option key={c.id} value={String(c.id)}>{c.name}</option>)}
        </select>
        <div style={{ marginTop: 12 }}>
          <span style={{ fontSize: 12, color: C.textSec, display: 'block', marginBottom: 6 }}>Фото</span>
          {photoPreview ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
              <img src={photoPreview} alt="" style={{ width: 80, height: 80, borderRadius: '50%', objectFit: 'cover', border: `1px solid ${C.border}` }} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <button type="button" style={{ ...btn.primary, padding: '6px 14px', fontSize: 12 }} onClick={handlePhotoUpload}>Загрузить</button>
                <button type="button" style={{ ...btn.secondary, padding: '6px 14px', fontSize: 12 }} onClick={() => { if (photoPreview) URL.revokeObjectURL(photoPreview); setPhotoPreview(null); setPhotoFile(null); }}>Отмена</button>
              </div>
            </div>
          ) : (
            <>
              <input type="file" accept="image/*" onChange={handlePhotoSelect} style={{ fontSize: 13, color: C.textSec }} />
              {prof?.public_photo_url && <img src={prof.public_photo_url} alt="" style={{ width: 80, height: 80, borderRadius: '50%', objectFit: 'cover', marginTop: 10, border: `1px solid ${C.border}` }} />}
            </>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
          <button type="submit" style={btn.primary} disabled={pubSaving}>{pubSaving ? 'Сохранение…' : 'Сохранить'}</button>
          <button type="button" style={btn.secondary} onClick={copyPubLink} disabled={!pubSlug}>Копировать ссылку</button>
        </div>
      </form>
    </div>
  );
}
