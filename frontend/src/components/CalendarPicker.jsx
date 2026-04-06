import React, { useMemo } from 'react';
import { C } from '../theme';

const DAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
const MONTHS = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь',
];

export default function CalendarPicker({ year, month, availableDates = [], selectedDate, onDateSelect, onMonthChange }) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const availableSet = useMemo(() => new Set(
    availableDates.map(d => typeof d === 'string' ? d : d.date)
  ), [availableDates]);

  const firstDay = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  // Monday = 0, Sunday = 6
  let startWeekday = firstDay.getDay() - 1;
  if (startWeekday < 0) startWeekday = 6;

  const cells = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const pad = (n) => String(n).padStart(2, '0');

  const prevMonth = () => {
    const m = month === 0 ? 11 : month - 1;
    const y = month === 0 ? year - 1 : year;
    onMonthChange(y, m);
  };

  const nextMonth = () => {
    const m = month === 11 ? 0 : month + 1;
    const y = month === 11 ? year + 1 : year;
    onMonthChange(y, m);
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <button onClick={prevMonth} style={navBtn}>‹</button>
        <span style={{ color: C.text, fontSize: 16, fontWeight: 600 }}>
          {MONTHS[month]} {year}
        </span>
        <button onClick={nextMonth} style={navBtn}>›</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
        {DAYS.map(d => (
          <div key={d} style={{ textAlign: 'center', fontSize: 12, color: C.textMuted, padding: '4px 0', fontWeight: 600 }}>
            {d}
          </div>
        ))}

        {cells.map((day, i) => {
          if (day === null) return <div key={`e-${i}`} />;

          const dateStr = `${year}-${pad(month + 1)}-${pad(day)}`;
          const dateObj = new Date(year, month, day);
          const isPast = dateObj < today;
          const isAvailable = availableSet.has(dateStr);
          const isSelected = selectedDate === dateStr;

          return (
            <button
              key={dateStr}
              onClick={() => !isPast && isAvailable && onDateSelect(dateStr)}
              disabled={isPast || !isAvailable}
              style={{
                position: 'relative',
                width: '100%',
                aspectRatio: '1',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: isSelected ? C.goldDim : 'transparent',
                color: isPast ? C.textMuted : isAvailable ? C.text : C.textMuted,
                border: isSelected ? `2px solid ${C.gold}` : '2px solid transparent',
                borderRadius: 10,
                fontSize: 14,
                fontWeight: isSelected ? 700 : 400,
                cursor: isPast || !isAvailable ? 'default' : 'pointer',
                opacity: isPast ? 0.3 : 1,
                transition: 'all 0.15s',
                boxShadow: isSelected ? C.glow : C.btnShadow,
              }}
            >
              {day}
              {isAvailable && !isPast && (
                <span style={{
                  position: 'absolute',
                  bottom: 4,
                  width: 5,
                  height: 5,
                  borderRadius: '50%',
                  background: C.gold,
                }} />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

const navBtn = {
  background: C.surface2,
  color: C.text,
  border: `1px solid ${C.border}`,
  borderRadius: 8,
  width: 36,
  height: 36,
  fontSize: 20,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  boxShadow: C.btnShadow,
};
