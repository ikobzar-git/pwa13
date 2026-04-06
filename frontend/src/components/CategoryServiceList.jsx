import React, { useState, useMemo, useEffect } from 'react';
import { C } from '../theme';

// Автоопределение категории по содержимому услуг
function guessCategory(items) {
  const text = items.map(s => s.title?.toLowerCase() || '').join(' ');
  if (/стрижк|укладк|челк|барбер|бород/.test(text)) return 'Стрижки и укладки';
  if (/окраш|тониров|мелир|блонд|колор|осветл/.test(text)) return 'Окрашивание';
  if (/маникюр|педикюр|покрыт|гель-лак|ноготь|ногт/.test(text)) return 'Маникюр и педикюр';
  if (/наращив.*ресниц|ресниц|ламиниров.*ресниц/.test(text)) return 'Ресницы';
  if (/бров|депиляц|воск/.test(text)) return 'Брови и депиляция';
  if (/масса|уход|spa|восстановл|реконструк|программа/.test(text)) return 'Уход и восстановление';
  if (/make.?up|макияж|визаж/.test(text)) return 'Макияж';
  if (/коррекц.*ногт|ремонт.*ногт|наращив.*ногт|укрепл|снятие/.test(text)) return 'Ногтевой сервис';
  if (/френч|градиент|дизайн.*ногт/.test(text)) return 'Дизайн ногтей';
  if (/комплимент/.test(text)) return 'Комплименты';
  if (/косметолог|инъекц|ботокс|филлер|пилинг|канюл/.test(text)) return 'Косметология';
  if (/тату/.test(text)) return 'Тату';
  return 'Другие услуги';
}

export default function CategoryServiceList({ services = [], selectedId, onSelect }) {
  const [search, setSearch] = useState('');

  const categories = useMemo(() => {
    const map = {};
    services.forEach(s => {
      const catId = s.category_id || 0;
      const catTitle = (s.category?.title && s.category.title.trim()) || '';
      if (!map[catId]) {
        map[catId] = { id: catId, title: catTitle, items: [] };
      }
      map[catId].items.push(s);
    });
    // Автоназвания для пустых категорий
    const cats = Object.values(map);
    cats.forEach(cat => {
      if (!cat.title) cat.title = guessCategory(cat.items);
    });
    return cats;
  }, [services]);

  const filtered = useMemo(() => {
    if (!search.trim()) return categories;
    const q = search.toLowerCase().trim();
    return categories
      .map(cat => ({
        ...cat,
        items: cat.items.filter(s => s.title?.toLowerCase().includes(q)),
      }))
      .filter(cat => cat.items.length > 0);
  }, [categories, search]);

  const [expanded, setExpanded] = useState({});

  useEffect(() => {
    if (search.trim()) {
      // При поиске раскрыть все
      const all = {};
      filtered.forEach(cat => { all[cat.id] = true; });
      setExpanded(all);
    } else if (filtered.length > 0) {
      setExpanded(prev => {
        const hasAny = Object.values(prev).some(Boolean);
        if (hasAny) return prev;
        return { [filtered[0].id]: true };
      });
    }
  }, [filtered.length, search]);

  const toggle = (catId) => {
    setExpanded(prev => ({ ...prev, [catId]: !prev[catId] }));
  };

  return (
    <div>
      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Поиск услуги..."
        style={{
          width: '100%', padding: '10px 14px', marginBottom: 12,
          background: C.surface2, color: C.text, border: `1px solid ${C.border}`,
          borderRadius: 10, fontSize: 14, outline: 'none', boxSizing: 'border-box',
        }}
      />

      {filtered.length === 0 && (
        <p style={{ color: C.textSec, fontSize: 13, textAlign: 'center', padding: 16 }}>
          Ничего не найдено
        </p>
      )}

      {filtered.map(cat => {
        const isOpen = expanded[cat.id];
        return (
          <div key={cat.id} style={{ marginBottom: 8 }}>
            <button
              onClick={() => toggle(cat.id)}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                width: '100%', padding: '12px 14px', background: C.surface2, color: C.text,
                border: `1px solid ${C.border}`, borderRadius: 12, fontSize: 14,
                fontWeight: 600, cursor: 'pointer', boxShadow: C.btnShadow,
              }}
            >
              <span>{cat.title} <span style={{ color: C.textMuted, fontWeight: 400, fontSize: 12 }}>({cat.items.length})</span></span>
              <span style={{
                color: C.textSec, fontSize: 12,
                transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 0.2s',
              }}>▼</span>
            </button>

            {isOpen && (
              <div style={{ marginTop: 4 }}>
                {cat.items.map(svc => {
                  const sel = selectedId === svc.id;
                  return (
                    <button
                      key={svc.id}
                      onClick={() => onSelect(svc)}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        width: '100%', padding: '12px 16px', marginTop: 4,
                        background: sel ? C.goldDim : C.surface3,
                        color: sel ? C.gold : C.text,
                        border: `1px solid ${sel ? C.goldBorder : 'transparent'}`,
                        borderRadius: 10, fontSize: 14, textAlign: 'left', cursor: 'pointer',
                        boxShadow: sel ? C.glow : C.btnShadow, transition: 'all 0.15s',
                      }}
                    >
                      <span style={{ flex: 1 }}>{svc.title}</span>
                      {(svc.price_min ?? svc.cost) != null && (
                        <span style={{ color: C.textSec, fontSize: 13, marginLeft: 12, whiteSpace: 'nowrap' }}>
                          {svc.price_min ?? svc.cost} ₽
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
