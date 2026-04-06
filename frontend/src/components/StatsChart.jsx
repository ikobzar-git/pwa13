import { useState, useEffect, useRef } from 'react';
import { C } from '../theme';
import { stats } from '../api';

const CHART_LABELS = {
  completed_records: 'Записей',
  total_revenue: 'Выручка',
  avg_check: 'Средний чек',
  unique_clients: 'Клиентов',
  cancel_rate: 'Отмены',
};

const VALUE_FORMAT = {
  completed_records: (v) => String(v),
  total_revenue: (v) => v.toLocaleString('ru') + ' ₽',
  avg_check: (v) => v.toLocaleString('ru') + ' ₽',
  unique_clients: (v) => String(v),
  cancel_rate: (v) => v + '%',
};

const s = {
  overlay: {
    position: 'fixed',
    top: 0, left: 0, right: 0, bottom: 0,
    background: 'rgba(0,0,0,0.75)',
    zIndex: 1000,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  modal: {
    background: C.surface,
    border: `1px solid ${C.border}`,
    borderRadius: 16,
    width: '100%',
    maxWidth: 600,
    maxHeight: '90vh',
    overflow: 'auto',
    boxShadow: '0 8px 40px rgba(0,0,0,0.6)',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 20px',
    borderBottom: `1px solid ${C.border}`,
  },
  title: {
    fontSize: 16,
    fontWeight: 700,
    color: C.text,
  },
  closeBtn: {
    background: 'transparent',
    border: 'none',
    color: C.textSec,
    fontSize: 22,
    cursor: 'pointer',
    padding: '4px 8px',
    lineHeight: 1,
  },
  body: {
    padding: 20,
  },
  tooltip: {
    position: 'absolute',
    background: C.surface2,
    border: `1px solid ${C.goldBorder}`,
    borderRadius: 8,
    padding: '6px 10px',
    fontSize: 12,
    color: C.text,
    pointerEvents: 'none',
    whiteSpace: 'nowrap',
    zIndex: 10,
    boxShadow: C.cardShadow,
  },
  loading: {
    color: C.textSec,
    fontSize: 14,
    textAlign: 'center',
    padding: 40,
  },
};

function formatDateLabel(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
}

export default function StatsChart({ metric, period, onClose }) {
  const [data, setData] = useState(null);
  const [tooltip, setTooltip] = useState(null);
  const svgRef = useRef(null);

  useEffect(() => {
    stats.personalDaily(period)
      .then(setData)
      .catch(() => setData(null));
  }, [period]);

  const label = CHART_LABELS[metric] || metric;
  const fmt = VALUE_FORMAT[metric] || String;

  if (!data) {
    return (
      <div style={s.overlay} onClick={onClose}>
        <div style={s.modal} onClick={(e) => e.stopPropagation()}>
          <div style={s.header}>
            <span style={s.title}>{label}</span>
            <button style={s.closeBtn} onClick={onClose}>✕</button>
          </div>
          <div style={s.loading}>Загрузка...</div>
        </div>
      </div>
    );
  }

  const days = data.days || [];
  const values = days.map((d) => d[metric] ?? 0);
  const maxVal = Math.max(...values, 1);
  const minVal = Math.min(...values, 0);
  const range = maxVal - minVal || 1;

  const W = 540;
  const H = 220;
  const padL = 50;
  const padR = 16;
  const padT = 20;
  const padB = 36;
  const chartW = W - padL - padR;
  const chartH = H - padT - padB;

  const points = values.map((v, i) => {
    const x = padL + (days.length > 1 ? (i / (days.length - 1)) * chartW : chartW / 2);
    const y = padT + chartH - ((v - minVal) / range) * chartH;
    return { x, y, v, date: days[i].date };
  });

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
  const areaPath = linePath + ` L${points[points.length - 1].x},${padT + chartH} L${points[0].x},${padT + chartH} Z`;

  // Y-axis labels (5 steps)
  const yLabels = [];
  for (let i = 0; i <= 4; i++) {
    const val = minVal + (range * i) / 4;
    const y = padT + chartH - (i / 4) * chartH;
    yLabels.push({ val, y });
  }

  // X-axis labels — show subset for readability
  const maxXLabels = 7;
  const step = Math.max(1, Math.ceil(days.length / maxXLabels));

  const handleMouseMove = (e) => {
    if (!svgRef.current || points.length === 0) return;
    const rect = svgRef.current.getBoundingClientRect();
    const mouseX = ((e.clientX - rect.left) / rect.width) * W;

    let closest = 0;
    let minDist = Infinity;
    points.forEach((p, i) => {
      const dist = Math.abs(p.x - mouseX);
      if (dist < minDist) { minDist = dist; closest = i; }
    });

    const p = points[closest];
    setTooltip({
      x: (p.x / W) * 100,
      y: (p.y / H) * 100,
      date: p.date,
      value: p.v,
      idx: closest,
    });
  };

  const handleMouseLeave = () => setTooltip(null);

  const formatYLabel = (val) => {
    if (metric === 'total_revenue' || metric === 'avg_check') {
      if (val >= 1000) return Math.round(val / 1000) + 'к';
      return Math.round(val);
    }
    if (metric === 'cancel_rate') return Math.round(val) + '%';
    return Math.round(val);
  };

  return (
    <div style={s.overlay} onClick={onClose}>
      <div style={s.modal} onClick={(e) => e.stopPropagation()}>
        <div style={s.header}>
          <span style={s.title}>{label}</span>
          <button style={s.closeBtn} onClick={onClose}>✕</button>
        </div>
        <div style={{ ...s.body, position: 'relative' }}>
          <svg
            ref={svgRef}
            viewBox={`0 0 ${W} ${H}`}
            style={{ width: '100%', height: 'auto', display: 'block' }}
            onMouseMove={handleMouseMove}
            onTouchMove={(e) => {
              const touch = e.touches[0];
              handleMouseMove({ clientX: touch.clientX, clientY: touch.clientY });
            }}
            onMouseLeave={handleMouseLeave}
            onTouchEnd={handleMouseLeave}
          >
            {/* Grid lines */}
            {yLabels.map((yl, i) => (
              <g key={i}>
                <line
                  x1={padL} y1={yl.y} x2={W - padR} y2={yl.y}
                  stroke={C.border} strokeWidth="0.5"
                />
                <text
                  x={padL - 8} y={yl.y + 4}
                  fill={C.textMuted} fontSize="10" textAnchor="end"
                >
                  {formatYLabel(yl.val)}
                </text>
              </g>
            ))}

            {/* X-axis labels */}
            {points.map((p, i) => (
              i % step === 0 && (
                <text
                  key={i}
                  x={p.x} y={H - 6}
                  fill={C.textMuted} fontSize="9" textAnchor="middle"
                >
                  {formatDateLabel(days[i].date)}
                </text>
              )
            ))}

            {/* Area fill */}
            <path d={areaPath} fill="url(#chartGradient)" />
            <defs>
              <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={C.gold} stopOpacity="0.25" />
                <stop offset="100%" stopColor={C.gold} stopOpacity="0.02" />
              </linearGradient>
            </defs>

            {/* Line */}
            <path d={linePath} fill="none" stroke={C.gold} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />

            {/* Data points */}
            {points.map((p, i) => (
              <circle
                key={i}
                cx={p.x} cy={p.y} r={tooltip?.idx === i ? 5 : 3}
                fill={tooltip?.idx === i ? C.goldHover : C.gold}
                stroke={C.surface}
                strokeWidth="1.5"
              />
            ))}
          </svg>

          {/* Tooltip */}
          {tooltip && (
            <div
              style={{
                ...s.tooltip,
                left: `${Math.min(Math.max(tooltip.x, 15), 85)}%`,
                top: `${tooltip.y - 14}%`,
                transform: 'translate(-50%, -100%)',
              }}
            >
              <div style={{ color: C.textSec, marginBottom: 2 }}>
                {new Date(tooltip.date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}
              </div>
              <div style={{ fontWeight: 700, color: C.gold }}>
                {fmt(tooltip.value)}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
