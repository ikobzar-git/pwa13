import React, { useState, useEffect, useRef, Fragment } from 'react';
import { companies, records, favorites } from '../api';
import { C, btn } from '../theme';
import { SkeletonCard } from './Skeleton';
import BranchCard from './BranchCard';
import CategoryServiceList from './CategoryServiceList';
import CalendarPicker from './CalendarPicker';

const STEP = { COMPANY: 1, SERVICE: 2, STAFF: 3, DATE_SLOT: 4, CONFIRM: 5 };
const STEP_LABELS = ['Филиал', 'Услуга', 'Мастер', 'Дата и время', 'Подтверждение'];

const styles = {
  wrap: { marginTop: 8 },
  backBtn: {
    background: 'none', border: 'none', color: C.textSec, fontSize: 13,
    cursor: 'pointer', padding: '4px 0', marginBottom: 16,
    display: 'flex', alignItems: 'center', gap: 4,
  },
  stepTitle: { fontSize: 16, fontWeight: 700, color: C.text, marginBottom: 14 },
  emptyText: { color: C.textSec, fontSize: 13 },
  slotsGrid: { display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 16 },
  slotBtn: (selected) => ({
    padding: '10px 14px', background: selected ? C.goldDim : C.surface2,
    color: selected ? C.gold : C.text, border: `1px solid ${selected ? C.gold : C.border}`,
    borderRadius: 8, fontSize: 14, fontWeight: selected ? 700 : 400,
    cursor: 'pointer', boxShadow: selected ? C.glow : C.btnShadow,
  }),
  confirmCard: {
    background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 10,
    padding: '16px', marginBottom: 16, boxShadow: C.cardShadow,
  },
  confirmRow: {
    display: 'flex', justifyContent: 'space-between', padding: '9px 0',
    borderBottom: `1px solid ${C.border}`, fontSize: 14,
  },
  confirmRowLast: {
    display: 'flex', justifyContent: 'space-between', padding: '9px 0', fontSize: 14,
  },
  confirmLabel: { color: C.textSec },
  confirmValue: { color: C.text, fontWeight: 600, textAlign: 'right', maxWidth: '60%' },
  actionRow: { display: 'flex', gap: 10, marginTop: 4 },
  slotsTitle: { fontSize: 14, fontWeight: 600, color: C.text, marginTop: 20, marginBottom: 8 },
  checkboxRow: {
    display: 'flex', alignItems: 'center', gap: 10, padding: '12px 0', fontSize: 14, color: C.text,
  },
  progress: {
    display: 'flex', alignItems: 'center', gap: 0, marginBottom: 20, padding: '0 4px',
  },
  progressDot: (active, done) => ({
    width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center',
    justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0,
    background: done ? C.gold : active ? C.goldDim : C.surface3,
    color: done ? '#000' : active ? C.gold : C.textMuted,
    border: active ? `2px solid ${C.gold}` : '2px solid transparent',
    transition: 'all 0.2s',
  }),
  progressLine: (done) => ({
    flex: 1, height: 2, background: done ? C.gold : C.border, transition: 'background 0.2s',
  }),
  branchBadge: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '8px 14px', background: C.surface2, border: `1px solid ${C.border}`,
    borderRadius: 10, marginBottom: 12, fontSize: 13,
  },
};

function ProgressBar({ step, totalSteps = 5 }) {
  return (
    <div style={styles.progress}>
      {Array.from({ length: totalSteps }, (_, i) => {
        const s = i + 1;
        return (
          <React.Fragment key={s}>
            {i > 0 && <div style={styles.progressLine(step > s)} />}
            <div style={styles.progressDot(step === s, step > s)}>
              {step > s ? '✓' : s}
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
}

export default function BookingFlow({ user, onSuccess, onCancel, initialData, lock, preferredBranch, onBranchChange }) {
  const initialStep = lock?.companyId || preferredBranch ? STEP.SERVICE : STEP.COMPANY;
  const [step, setStep] = useState(initialStep);
  const [companyList, setCompanyList] = useState([]);
  const [services, setServices] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [slots, setSlots] = useState([]);
  const [availDates, setAvailDates] = useState([]);

  const [selectedCompany, setSelectedCompany] = useState(null);
  const [service, setService] = useState(null);
  const [staff, setStaff] = useState(undefined);
  const [selectedDate, setSelectedDate] = useState('');
  const [slot, setSlot] = useState(null);
  const [parkingReserve, setParkingReserve] = useState(false);
  const [extraServices, setExtraServices] = useState([]);

  const now = new Date();
  const [calYear, setCalYear] = useState(now.getFullYear());
  const [calMonth, setCalMonth] = useState(now.getMonth());

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [slotsError, setSlotsError] = useState('');
  const [favIds, setFavIds] = useState(new Set());

  const slotsRef = useRef(null);
  const submittingRef = useRef(false);

  useEffect(() => {
    companies.list().then((list) => {
      setCompanyList(list);
      const cid = lock?.companyId ?? initialData?.companyId ?? preferredBranch?.id;
      if (cid) {
        const match = list.find(c => String(c.id) === String(cid));
        if (match) {
          setSelectedCompany(match);
          setStep(STEP.SERVICE);
        } else {
          setSelectedCompany({ id: cid, name: preferredBranch?.name || 'Салон', type: 'barber' });
          setStep(STEP.SERVICE);
        }
      }
    }).catch(() => setCompanyList([]));
  }, [lock?.companyId, initialData?.companyId, preferredBranch?.id]);

  useEffect(() => {
    if (!user) return;
    favorites.list()
      .then(list => setFavIds(new Set(list.map(f => `${f.yclients_staff_id}_${f.company_id}`))))
      .catch(() => {});
  }, [user]);

  useEffect(() => {
    if (!selectedCompany) return;
    setLoading(true);
    Promise.all([
      companies.services(selectedCompany.id),
      companies.staff(selectedCompany.id),
    ])
      .then(([svc, stf]) => {
        const svcArr = Array.isArray(svc) ? svc : [];
        const stfArr = Array.isArray(stf) ? stf : [];
        setServices(svcArr);
        setStaffList(stfArr);
        if (initialData?.serviceName && step === STEP.SERVICE) {
          const svcMatch = svcArr.find(s => s.title === initialData.serviceName);
          if (svcMatch) {
            setService(svcMatch);
            if (initialData.staffName) {
              const stfMatch = stfArr.find(s => s.name === initialData.staffName);
              setStaff(stfMatch || null);
              setStep(STEP.DATE_SLOT);
            } else {
              setStep(STEP.STAFF);
            }
          }
        }
        if (lock?.staffId != null && stfArr.length) {
          const stfMatch = stfArr.find(s => Number(s.id) === Number(lock.staffId));
          if (stfMatch) setStaff(stfMatch);
        }
      })
      .catch(() => { setServices([]); setStaffList([]); })
      .finally(() => setLoading(false));
  }, [selectedCompany?.id]);

  useEffect(() => {
    if (!selectedCompany || staff === undefined || !service) return;
    const staffId = staff ? staff.id : 0;
    const month = `${calYear}-${String(calMonth + 1).padStart(2, '0')}`;
    records.dateAvailability(selectedCompany.id, staffId, month, service.id)
      .then(d => setAvailDates(Array.isArray(d) ? d : []))
      .catch(() => setAvailDates([]));
  }, [selectedCompany?.id, staff === null ? 0 : staff?.id, calYear, calMonth, service?.id]);

  useEffect(() => {
    if (!selectedCompany || staff === undefined || !selectedDate) return;
    const staffId = staff ? staff.id : 0;
    setLoading(true);
    setSlotsError('');
    records
      .slots(selectedCompany.id, staffId, selectedDate)
      .then(s => {
        setSlots(Array.isArray(s) ? s : []);
        // Автоскролл к слотам
        setTimeout(() => {
          slotsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }, 100);
      })
      .catch(() => { setSlots([]); setSlotsError('Не удалось загрузить слоты'); })
      .finally(() => setLoading(false));
  }, [selectedCompany?.id, staff === null ? 0 : staff?.id, selectedDate]);

  const handleSubmit = async () => {
    if (submittingRef.current) return;
    if (!selectedCompany || !service || staff === undefined || !slot) return;
    if (!user) {
      setError('Войдите как клиент, затем снова откройте запись.');
      return;
    }
    submittingRef.current = true;
    setLoading(true);
    setError('');
    try {
      let datetime = typeof slot === 'string' ? slot : (slot.time || slot.datetime || slot);
      if (!datetime || String(datetime).length < 10) {
        datetime = `${selectedDate}T${String(datetime).padStart(5, '0')}:00`;
      }
      const seanceLength = service.seance_length ?? service.duration_min ?? service.length ?? 3600;
      const duration = typeof seanceLength === 'number' ? seanceLength : parseInt(seanceLength, 10) || 3600;

      const extraDuration = extraServices.reduce((sum, es) => {
        const d = es.seance_length ?? es.duration_min ?? es.length ?? 0;
        return sum + (typeof d === 'number' ? d : parseInt(d, 10) || 0);
      }, 0);

      const payload = {
        company_id: String(selectedCompany.id),
        staff_id: staff ? staff.id : 0,
        services: [service.id, ...extraServices.map(es => es.id)],
        datetime,
        seance_length: duration + extraDuration,
      };
      if (parkingReserve && user?.car_number) {
        payload.parking = true;
        payload.car_number = user.car_number;
      }

      const result = await records.create(payload);
      // Сохраняем доп. инфо для экрана успеха
      result._booking = {
        companyName: selectedCompany?.name,
        serviceName: service?.title,
        servicePrice: service?.price_min ?? service?.cost,
        serviceDuration: duration + extraDuration,
        staffName: staff?.name || 'Любой мастер',
        staffSlug: staff?.public_slug,
        datetime,
      };
      onSuccess(result);
    } catch (err) {
      setError(err.body?.message || err.message || 'Ошибка записи');
    } finally {
      setLoading(false);
      submittingRef.current = false;
    }
  };

  const handleChangeBranch = () => {
    setSelectedCompany(null);
    setService(null);
    setStaff(undefined);
    setSelectedDate('');
    setSlot(null);
    setServices([]);
    setStaffList([]);
    setStep(STEP.COMPANY);
  };

  const slotItems = Array.isArray(slots) ? slots : [];
  const slotTimes = slotItems.map(s => (typeof s === 'string' ? s : s.datetime || s.time || s));
  const servicePrice = service?.price_min ?? service?.cost ?? null;

  return (
    <div style={styles.wrap}>
      {/* Progress bar */}
      <ProgressBar step={step} totalSteps={lock?.companyId || preferredBranch ? 4 : 5} />

      {/* Current branch badge (when not on company step) */}
      {selectedCompany && step > STEP.COMPANY && !lock?.companyId && (
        <div style={styles.branchBadge}>
          <span style={{ color: C.text }}>{selectedCompany.name}</span>
          <button
            onClick={handleChangeBranch}
            style={{ background: 'none', border: 'none', color: C.gold, fontSize: 13, cursor: 'pointer', fontWeight: 600 }}
          >
            Сменить
          </button>
        </div>
      )}

      {/* STEP 1: COMPANY */}
      {!lock?.companyId && step === STEP.COMPANY && (
        <div>
          <div style={styles.stepTitle}>Выберите филиал</div>
          {companyList.map(c => (
            <BranchCard
              key={c.id}
              company={c}
              selected={selectedCompany?.id === c.id}
              onSelect={(comp) => {
                setSelectedCompany(comp);
                if (onBranchChange) onBranchChange(comp);
                setStep(STEP.SERVICE);
              }}
            />
          ))}
          {onCancel && (
            <button style={styles.backBtn} onClick={onCancel}>Отмена</button>
          )}
        </div>
      )}

      {/* STEP 2: SERVICE */}
      {step === STEP.SERVICE && (
        <div>
          {!lock?.companyId && !preferredBranch && (
            <button style={styles.backBtn} onClick={() => setStep(STEP.COMPANY)}>← Назад</button>
          )}
          <div style={styles.stepTitle}>Выберите услугу</div>
          {loading ? (
            <><SkeletonCard /><SkeletonCard /><SkeletonCard /></>
          ) : services.length === 0 ? (
            <p style={styles.emptyText}>Нет доступных услуг</p>
          ) : (
            <CategoryServiceList
              services={services}
              selectedId={service?.id}
              onSelect={(svc) => {
                setService(svc);
                if (lock?.staffId != null && staffList.length) {
                  const stfMatch = staffList.find(s => Number(s.id) === Number(lock.staffId));
                  setStaff(stfMatch ?? null);
                  setStep(STEP.DATE_SLOT);
                } else {
                  setStep(STEP.STAFF);
                }
              }}
            />
          )}
        </div>
      )}

      {/* STEP 3: STAFF */}
      {!lock?.staffId && step === STEP.STAFF && (
        <div>
          <button style={styles.backBtn} onClick={() => setStep(STEP.SERVICE)}>← Назад</button>
          <div style={styles.stepTitle}>Выберите мастера</div>
          <button
            onClick={() => { setStaff(null); setStep(STEP.DATE_SLOT); }}
            style={btn.option(staff === null && step > STEP.STAFF)}
          >
            <span style={{ fontWeight: 600 }}>Любой мастер</span>
            <span style={{ color: C.textSec, fontSize: 13, marginLeft: 8 }}>первый свободный</span>
          </button>
          {staffList.map(s => {
            const favKey = `${s.id}_${selectedCompany?.id}`;
            const isFav = favIds.has(favKey);
            return (
              <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
                <button
                  onClick={() => { setStaff(s); setStep(STEP.DATE_SLOT); }}
                  style={{ ...btn.option(staff?.id === s.id), flex: 1, display: 'flex', alignItems: 'center', gap: 10 }}
                >
                  {s.avatar && (
                    <img src={s.avatar} alt="" style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover' }} />
                  )}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600 }}>{isFav ? '★ ' : ''}{s.name}</div>
                    {s.specialization && <div style={{ fontSize: 12, color: C.textSec }}>{s.specialization}</div>}
                  </div>
                </button>
                {user && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      favorites.toggle(s.id, String(selectedCompany.id), s.name).then(res => {
                        setFavIds(prev => {
                          const next = new Set(prev);
                          res.favorited ? next.add(favKey) : next.delete(favKey);
                          return next;
                        });
                      }).catch(() => {});
                    }}
                    style={{
                      background: 'none', border: 'none', fontSize: 20, cursor: 'pointer',
                      color: isFav ? C.gold : C.textMuted, padding: '8px 10px',
                    }}
                  >
                    {isFav ? '\u2605' : '\u2606'}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* STEP 4: DATE + SLOT */}
      {step === STEP.DATE_SLOT && (
        <div>
          <button
            style={styles.backBtn}
            onClick={() => {
              setSelectedDate('');
              setSlot(null);
              setSlots([]);
              setStep(lock?.staffId != null ? STEP.SERVICE : STEP.STAFF);
            }}
          >
            ← Назад
          </button>
          <div style={styles.stepTitle}>Выберите дату и время</div>

          <CalendarPicker
            year={calYear}
            month={calMonth}
            availableDates={availDates}
            selectedDate={selectedDate}
            onDateSelect={(d) => { setSelectedDate(d); setSlot(null); }}
            onMonthChange={(y, m) => { setCalYear(y); setCalMonth(m); }}
          />

          {selectedDate && (
            <div ref={slotsRef}>
              <div style={styles.slotsTitle}>
                Доступное время на {selectedDate.split('-').reverse().join('.')}
              </div>
              {loading ? (
                <><SkeletonCard height={40} /><SkeletonCard height={40} /></>
              ) : (
                <div style={styles.slotsGrid}>
                  {slotsError ? (
                    <p style={{ ...styles.emptyText, color: C.error }}>{slotsError}</p>
                  ) : slotTimes.length === 0 ? (
                    <p style={styles.emptyText}>Нет свободных слотов на эту дату</p>
                  ) : (
                    slotTimes.map((t, i) => (
                      <button
                        key={i}
                        onClick={() => { setSlot(t); setStep(STEP.CONFIRM); }}
                        style={styles.slotBtn(slot === t)}
                      >
                        {typeof t === 'string' ? t.slice(11, 16) || t.slice(0, 5) : String(t)}
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* STEP 5: CONFIRM */}
      {step === STEP.CONFIRM && (
        <div>
          <button style={styles.backBtn} onClick={() => setStep(STEP.DATE_SLOT)}>← Назад</button>
          <div style={styles.stepTitle}>Подтвердите запись</div>
          <div style={styles.confirmCard}>
            {[
              ['Филиал', selectedCompany?.name],
              ['Услуга', service?.title],
              ['Мастер', staff?.name || 'Любой мастер'],
              ['Дата и время', typeof slot === 'string' ? slot.replace('T', ' ').slice(0, 16) : slot],
              servicePrice && ['Стоимость', `${servicePrice} ₽`],
              service?.seance_length && ['Длительность', `~${Math.round((service.seance_length || 3600) / 60)} мин`],
            ].filter(Boolean).map(([label, value], idx, arr) => (
              <div key={label} style={idx === arr.length - 1 ? styles.confirmRowLast : styles.confirmRow}>
                <span style={styles.confirmLabel}>{label}</span>
                <span style={styles.confirmValue}>{value}</span>
              </div>
            ))}
          </div>

          {user?.car_number && (
            <label style={styles.checkboxRow}>
              <input
                type="checkbox"
                checked={parkingReserve}
                onChange={e => setParkingReserve(e.target.checked)}
                style={{ accentColor: C.gold, width: 18, height: 18 }}
              />
              <span>Забронировать парковку ({user.car_number})</span>
            </label>
          )}

          {(() => {
            const upsellItems = services
              .filter(s => s.id !== service?.id && (s.seance_length ?? s.duration_min ?? Infinity) <= 1800)
              .slice(0, 3);
            if (!upsellItems.length) return null;
            return (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 8 }}>
                  Добавьте к записи
                </div>
                {upsellItems.map(s => {
                  const selected = extraServices.some(es => es.id === s.id);
                  const price = s.price_min ?? s.cost;
                  const dur = s.seance_length ?? s.duration_min;
                  return (
                    <button
                      key={s.id}
                      onClick={() => setExtraServices(prev =>
                        selected ? prev.filter(es => es.id !== s.id) : [...prev, s]
                      )}
                      style={{
                        ...btn.option(selected),
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      }}
                    >
                      <span>{s.title}</span>
                      <span style={{ fontSize: 13, color: C.textSec, display: 'flex', gap: 8 }}>
                        {dur && <span>{Math.round((typeof dur === 'number' ? dur : parseInt(dur, 10) || 0) / 60)} мин</span>}
                        {price != null && <span>{price} ₽</span>}
                      </span>
                    </button>
                  );
                })}
              </div>
            );
          })()}

          {!user && (
            <p style={{ ...styles.emptyText, marginBottom: 12, color: C.gold }}>
              Чтобы завершить запись, войдите как клиент и вернитесь на эту страницу.
            </p>
          )}
          {error && <p className="error" style={{ marginBottom: 12 }}>{error}</p>}
          <div style={styles.actionRow}>
            <button style={btn.primary} onClick={handleSubmit} disabled={loading || !user}>
              {loading ? 'Запись...' : 'Записаться'}
            </button>
            <button style={btn.secondary} onClick={() => setStep(STEP.DATE_SLOT)}>
              Изменить время
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
